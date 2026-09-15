package com.smartmunshimobile

import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException

// Bridges a local PDF file into Android's system Print dialog (PrintManager),
// which lists any installed Print Service (e.g. OEM receipt-printer bridges)
// as a target. The generic ACTION_SEND share sheet used elsewhere in the app
// only lists apps registered for ACTION_SEND, so Print Service-only apps
// never show up there — this is the only way to reach them on Android.
class PdfPrintModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PdfPrint"

  @ReactMethod
  fun print(filePath: String, jobName: String, promise: Promise) {
    try {
      val path = filePath.removePrefix("file://")
      val file = File(path)
      if (!file.exists()) {
        promise.reject("PDF_NOT_FOUND", "No PDF found at $path")
        return
      }

      // PrintManager.print() launches the system Print UI via startActivity()
      // under the hood, which requires an Activity context — the application
      // context (reactApplicationContext) throws
      // "Calling startActivity() from outside of an Activity context...".
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No current activity to launch the print dialog from")
        return
      }

      val printManager =
        activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
      printManager.print(jobName, PdfDocumentAdapter(file, jobName), null)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("PRINT_ERROR", e.message, e)
    }
  }

  private class PdfDocumentAdapter(
    private val file: File,
    private val jobName: String,
  ) : PrintDocumentAdapter() {

    override fun onLayout(
      oldAttributes: PrintAttributes?,
      newAttributes: PrintAttributes,
      cancellationSignal: CancellationSignal?,
      callback: LayoutResultCallback,
      extras: Bundle?,
    ) {
      if (cancellationSignal?.isCanceled == true) {
        callback.onLayoutCancelled()
        return
      }
      val info = PrintDocumentInfo.Builder(jobName)
        .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
        .build()
      callback.onLayoutFinished(info, oldAttributes != newAttributes)
    }

    override fun onWrite(
      pages: Array<out PageRange>?,
      destination: ParcelFileDescriptor,
      cancellationSignal: CancellationSignal?,
      callback: WriteResultCallback,
    ) {
      try {
        FileInputStream(file).use { input ->
          FileOutputStream(destination.fileDescriptor).use { output ->
            val buffer = ByteArray(8192)
            var length: Int
            while (input.read(buffer).also { length = it } >= 0) {
              if (cancellationSignal?.isCanceled == true) {
                callback.onWriteCancelled()
                return
              }
              output.write(buffer, 0, length)
            }
          }
        }
        callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
      } catch (e: IOException) {
        callback.onWriteFailed(e.message)
      }
    }
  }
}
