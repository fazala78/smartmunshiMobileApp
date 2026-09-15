package com.smartmunshimobile

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executors

// Talks directly to an already-*paired* Bluetooth receipt printer over
// classic Bluetooth (SPP/RFCOMM), bypassing PDF generation and Android's
// system Print dialog entirely. No discovery/scanning is done here — the
// user pairs the printer once via Android's own Bluetooth settings, and we
// only ever read the resulting bonded-device list.
class BluetoothPrinterModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "BluetoothPrinter"

    // Standard Serial Port Profile UUID — what virtually every ESC/POS
    // receipt printer registers for RFCOMM connections.
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    // Near-universal thermal-printer density (8 dots/mm) — used to convert
    // the PDF's page size (in points, 1/72in) into raster dots.
    private const val TARGET_DPI = 203f
    private const val POINTS_PER_INCH = 72f

    // Several cheap ESC/POS printers choke on one giant raster command for a
    // tall receipt — send it as sequential bands instead.
    private const val BAND_HEIGHT_DOTS = 256

    // Simple luminance threshold (0-255) for monochrome conversion — good
    // enough for text/line-art receipts without the complexity of dithering.
    private const val BLACK_THRESHOLD = 200
  }

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName() = "BluetoothPrinter"

  private fun getAdapter(): BluetoothAdapter? =
    (reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  private fun hasBluetoothConnectPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return reactContext.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) ==
      PackageManager.PERMISSION_GRANTED
  }

  @ReactMethod
  fun listPairedDevices(promise: Promise) {
    if (!hasBluetoothConnectPermission()) {
      promise.reject("PERMISSION_DENIED", "BLUETOOTH_CONNECT permission not granted")
      return
    }

    val adapter = getAdapter()
    if (adapter == null) {
      promise.reject("BLUETOOTH_UNSUPPORTED", "This device has no Bluetooth adapter")
      return
    }
    if (!adapter.isEnabled) {
      promise.reject("BLUETOOTH_DISABLED", "Bluetooth is turned off")
      return
    }

    try {
      val devices: WritableArray = Arguments.createArray()
      adapter.bondedDevices.forEach { device ->
        val entry = Arguments.createMap()
        entry.putString("name", device.name ?: device.address)
        entry.putString("address", device.address)
        devices.pushMap(entry)
      }
      promise.resolve(devices)
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", e.message, e)
    }
  }

  // Renders the given PDF's first page (already sized to the roll-paper
  // width by getPaperDimensions() in printSettings.ts) to a monochrome
  // bitmap and prints it as an ESC/POS raster image — this is what lets the
  // Bluetooth printout reproduce the actual API HTML template (layout,
  // branding) instead of plain unstyled text, which ESC/POS text commands
  // can't reproduce.
  @ReactMethod
  fun printPdf(address: String, pdfPath: String, promise: Promise) {
    if (!hasBluetoothConnectPermission()) {
      promise.reject("PERMISSION_DENIED", "BLUETOOTH_CONNECT permission not granted")
      return
    }

    val adapter = getAdapter()
    if (adapter == null) {
      promise.reject("BLUETOOTH_UNSUPPORTED", "This device has no Bluetooth adapter")
      return
    }
    if (!adapter.isEnabled) {
      promise.reject("BLUETOOTH_DISABLED", "Bluetooth is turned off")
      return
    }

    // PDF rendering + BluetoothSocket#connect() both block — must never run
    // on the JS thread.
    executor.execute {
      var socket: BluetoothSocket? = null
      try {
        val bytes = renderPdfToEscPosRaster(pdfPath.removePrefix("file://"))
        val device = adapter.getRemoteDevice(address)
        socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        socket.connect()
        socket.outputStream.apply {
          write(bytes)
          flush()
        }
        promise.resolve(true)
      } catch (e: SecurityException) {
        Log.e(TAG, "Missing permission to print", e)
        promise.reject("PERMISSION_DENIED", e.message, e)
      } catch (e: IOException) {
        Log.e(TAG, "Failed to print over Bluetooth", e)
        promise.reject("PRINT_ERROR", e.message, e)
      } finally {
        try {
          socket?.close()
        } catch (e: IOException) {
          Log.w(TAG, "Error closing Bluetooth socket", e)
        }
      }
    }
  }

  private fun renderPdfToEscPosRaster(pdfPath: String): ByteArray {
    ParcelFileDescriptor.open(File(pdfPath), ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
      PdfRenderer(pfd).use { renderer ->
        renderer.openPage(0).use { page ->
          // Uniform scale for both axes so the raster image isn't skewed.
          val scale = TARGET_DPI / POINTS_PER_INCH
          val widthDots = (page.width * scale).toInt() / 8 * 8 // byte-aligned
          val heightDots = (page.height * scale).toInt()

          val bitmap = Bitmap.createBitmap(widthDots, heightDots, Bitmap.Config.ARGB_8888)
          bitmap.eraseColor(Color.WHITE)
          val matrix = Matrix().apply {
            setScale(widthDots / page.width.toFloat(), heightDots / page.height.toFloat())
          }
          page.render(bitmap, null, matrix, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

          return bitmapToEscPosRaster(bitmap, widthDots, heightDots)
        }
      }
    }
  }

  private fun bitmapToEscPosRaster(bitmap: Bitmap, widthDots: Int, heightDots: Int): ByteArray {
    val widthBytes = widthDots / 8
    val output = ByteArrayOutputStream()
    output.write(byteArrayOf(0x1b, 0x40)) // ESC @ — initialize

    var y = 0
    while (y < heightDots) {
      val bandHeight = minOf(BAND_HEIGHT_DOTS, heightDots - y)
      output.write(rasterBandCommand(bitmap, widthDots, widthBytes, y, bandHeight))
      y += bandHeight
    }

    output.write(byteArrayOf(0x0a, 0x0a, 0x0a)) // feed before cut
    output.write(byteArrayOf(0x1d, 0x56, 0x01)) // GS V 1 — partial cut
    return output.toByteArray()
  }

  // GS v 0 — print raster bit image: 1D 76 30 m xL xH yL yH d1..dk, MSB-first,
  // one byte per 8 horizontal dots, 1 = black.
  private fun rasterBandCommand(bitmap: Bitmap, widthDots: Int, widthBytes: Int, yStart: Int, bandHeight: Int): ByteArray {
    val header = byteArrayOf(
      0x1d, 0x76, 0x30, 0x00,
      (widthBytes and 0xff).toByte(), ((widthBytes shr 8) and 0xff).toByte(),
      (bandHeight and 0xff).toByte(), ((bandHeight shr 8) and 0xff).toByte(),
    )

    val data = ByteArray(widthBytes * bandHeight)
    for (row in 0 until bandHeight) {
      for (col in 0 until widthDots) {
        val pixel = bitmap.getPixel(col, yStart + row)
        val luminance = 0.3 * Color.red(pixel) + 0.59 * Color.green(pixel) + 0.11 * Color.blue(pixel)
        if (luminance < BLACK_THRESHOLD) {
          val byteIndex = row * widthBytes + (col / 8)
          val bitIndex = 7 - (col % 8)
          data[byteIndex] = (data[byteIndex].toInt() or (1 shl bitIndex)).toByte()
        }
      }
    }

    return header + data
  }
}
