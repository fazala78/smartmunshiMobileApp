import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import RNShare from 'react-native-share';
import RNFS from 'react-native-fs';
import { ReceiptType, getPaperDimensions } from './printSettings';

const { PdfPrint } = NativeModules;

const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 33) return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'App needs storage permission to save PDF files.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

// Generates the PDF and writes it to the app's cache dir, shared by
// sharePDF/printPDF below and by bluetoothPrinter.ts (rasterizes this same
// single-page PDF for direct Bluetooth printing).
export const generateCachedPdf = async (
  htmlData: string,
  fileName: string,
  documentType?: ReceiptType,
): Promise<string> => {
  const hasPermission = await requestStoragePermission();
  if (!hasPermission) throw new Error('Storage permission denied');

  // Android only applies a custom page size when BOTH width and height
  // are supplied (see HtmlToPdfModule.kt) — omitting height silently
  // falls back to the converter's default page size, ignoring width.
  const { width, height } = getPaperDimensions(documentType, htmlData);

  // ── Android: use base64 then write to cache manually ─────────────────
  const result = await generatePDF({
    html: htmlData,
    fileName: fileName,
    base64: true, // ← get base64 instead of filePath
    width,
    height,
  });

  if (!result?.base64) {
    throw new Error('PDF base64 is null on Android');
  }

  // ── Write base64 to cache directory ───────────────────────────────
  const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}.pdf`;
  await RNFS.writeFile(cachePath, result.base64, 'base64');
  return cachePath;
};

export const sharePDF = async (
  htmlData: string,
  fileName: string,
  documentType?: ReceiptType,
): Promise<void> => {
  const cachePath = await generateCachedPdf(htmlData, fileName, documentType);

  // ── Share from cache ───────────────────────────────────────────────
  await RNShare.open({
    url: `file://${cachePath}`,
    type: 'application/pdf',
    title: `${fileName}.pdf`,
    filename: `${fileName}.pdf`,
    failOnCancel: false,
  });
};

// Opens Android's system Print dialog (PrintManager) so Print Service-only
// apps (e.g. OEM receipt-printer bridges) can be reached directly — those
// never appear in the generic ACTION_SEND share sheet that sharePDF() uses.
export const printPDF = async (
  htmlData: string,
  fileName: string,
  documentType?: ReceiptType,
): Promise<void> => {
  const cachePath = await generateCachedPdf(htmlData, fileName, documentType);
  await PdfPrint.print(`file://${cachePath}`, fileName);
};
