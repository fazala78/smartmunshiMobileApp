import { Share } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
export const iosSharePDF = async (
  htmlData: string,
  fileName: string,
): Promise<void> => {
  let options = {
    html: htmlData,
    fileName: fileName,
    base64: false,
  };
  let result = await generatePDF(options);
  if (result) {
    await Share.share({
      url: result.filePath,
      title: `${fileName}.pdf`,
    });
  }
};
