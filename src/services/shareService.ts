import { Platform, PermissionsAndroid } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import RNShare from 'react-native-share';
import RNFS from 'react-native-fs';

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

export const sharePDF = async (
  htmlData: string,
  fileName: string,
): Promise<void> => {
  try {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) throw new Error('Storage permission denied');
    // ── Android: use base64 then write to cache manually ─────────────────
    const result = await generatePDF({
      html: htmlData,
      fileName: fileName,
      base64: true, // ← get base64 instead of filePath
    });

    if (!result?.base64) {
      throw new Error('PDF base64 is null on Android');
    }

    // ── Write base64 to cache directory ───────────────────────────────
    const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}.pdf`;
    await RNFS.writeFile(cachePath, result.base64, 'base64');

    // ── Share from cache ───────────────────────────────────────────────
    await RNShare.open({
      url: `file://${cachePath}`,
      type: 'application/pdf',
      title: `${fileName}.pdf`,
      filename: `${fileName}.pdf`,
      failOnCancel: false,
    });
  } catch (error: any) {
    throw error;
  }
};
