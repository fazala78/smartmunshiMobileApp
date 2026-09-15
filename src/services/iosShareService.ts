import { Share } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import { ReceiptType, getPaperDimensions } from './printSettings';

export const iosSharePDF = async (
  htmlData: string,
  fileName: string,
  documentType?: ReceiptType,
): Promise<void> => {
  // iOS only applies a custom page size when BOTH width and height are
  // supplied (see HtmlToPdf.mm) — omitting height silently falls back to
  // US Letter (612x792), ignoring width entirely.
  const { width, height } = getPaperDimensions(documentType, htmlData);

  let options = {
    html: htmlData,
    fileName: fileName,
    base64: false,
    width,
    height,
    padding: 6,
  };
  let result = await generatePDF(options);
  if (result) {
    await Share.share({
      url: result.filePath,
      title: `${fileName}.pdf`,
    });
  }
};
