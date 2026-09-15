import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { deleteItem, getJson, setJson } from './storage';
import { generateCachedPdf } from './shareService';
import { ReceiptType } from './printSettings';

const { BluetoothPrinter } = NativeModules;

export interface BluetoothPrinterDevice {
  name: string;
  address: string;
}

const SELECTED_PRINTER_KEY = 'bluetoothPrinter:selectedDevice';

export class NoPrinterSelectedError extends Error {
  constructor() {
    super('No Bluetooth printer selected');
    this.name = 'NoPrinterSelectedError';
  }
}

// BLUETOOTH_CONNECT is a runtime "nearby devices" permission on API 31+ only
// — below that, BLUETOOTH/BLUETOOTH_ADMIN are normal manifest-only
// permissions (see AndroidManifest.xml), same shape as requestStoragePermission
// in shareService.ts.
export const requestBluetoothPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 31) return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: 'Bluetooth Permission',
        message: 'App needs Bluetooth permission to print to your receipt printer.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

export const listPairedPrinters = async (): Promise<BluetoothPrinterDevice[]> => {
  const hasPermission = await requestBluetoothPermission();
  if (!hasPermission) throw new Error('Bluetooth permission denied');
  return BluetoothPrinter.listPairedDevices();
};

export const getSelectedPrinter = (): BluetoothPrinterDevice | null =>
  getJson<BluetoothPrinterDevice>(SELECTED_PRINTER_KEY);

export const setSelectedPrinter = (device: BluetoothPrinterDevice): void =>
  setJson(SELECTED_PRINTER_KEY, device);

export const clearSelectedPrinter = (): void => deleteItem(SELECTED_PRINTER_KEY);

// Generates the same single-page PDF used for sharePDF/printPDF (already
// sized to the roll-paper width by getPaperDimensions() in
// printSettings.ts), then hands it to the native side to be rasterized to a
// monochrome image and printed as an ESC/POS raster image — this is what
// lets the Bluetooth printout reproduce the actual API HTML template
// (layout, branding), since ESC/POS text commands can't render HTML/CSS.
export const printToBluetoothPrinter = async (
  htmlData: string,
  fileName: string,
  documentType?: ReceiptType,
): Promise<void> => {
  const device = getSelectedPrinter();
  if (!device) throw new NoPrinterSelectedError();

  const hasPermission = await requestBluetoothPermission();
  if (!hasPermission) throw new Error('Bluetooth permission denied');

  const pdfPath = await generateCachedPdf(htmlData, fileName, documentType);
  await BluetoothPrinter.printPdf(device.address, pdfPath);
};
