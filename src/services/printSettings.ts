import { getJson, setJson } from './storage';

export type PaperSize = 'A4' | 'A5' | '3in' | '2.5in' | '2in';

export type ReceiptType = 'receivePayment' | 'paidPayment' | 'invoice' | 'purchase';

export const PAPER_SIZE_OPTIONS: { value: PaperSize; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A5', label: 'A5' },
  { value: '3in', label: '3 inch' },
  { value: '2.5in', label: '2.5 inch' },
  { value: '2in', label: '2 inch' },
];

export const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  receivePayment: 'Receive Payment Receipt',
  paidPayment: 'Paid Payment Receipt',
  invoice: 'Invoice',
  purchase: 'Purchase',
};

const RECEIPT_TYPES: ReceiptType[] = ['receivePayment', 'paidPayment', 'invoice', 'purchase'];

const DEFAULT_PAPER_SIZE: PaperSize = 'A4';

const PRINT_SETTINGS_KEY = 'printSettings:paperSizeByReceipt';

type PrintSettingsMap = Partial<Record<ReceiptType, PaperSize>>;

export const getPrintPaperSize = (type: ReceiptType): PaperSize => {
  const settings = getJson<PrintSettingsMap>(PRINT_SETTINGS_KEY) ?? {};
  return settings[type] ?? DEFAULT_PAPER_SIZE;
};

// generatePDF width/height are in points (1pt = 1/72in). Thermal roll sizes
// fall back to this height when content can't be estimated (no html passed);
// A4/A5 always use their real page height since they're fixed document pages.
export const PAPER_SIZE_DIMENSIONS_PT: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  '3in': { width: 216, height: 2000 },
  '2.5in': { width: 180, height: 2000 },
  '2in': { width: 144, height: 2000 },
};

const ROLL_PAPER_SIZES: PaperSize[] = ['3in', '2.5in', '2in'];

// ── Auto height for roll paper ──────────────────────────────────────────────
// react-native-html-to-pdf has no auto-height support — both native modules
// require a fixed page size, so a flat height leaves a lot of blank space
// below short receipts. We estimate content height from the HTML instead:
// split on block-level boundaries (rows, paragraphs, divs, headings, <br>) to
// approximate visual lines, estimate wrapping per line for the paper width,
// then convert the total line count to points. It's an approximation, so the
// result is padded and clamped rather than tight, to avoid ever cutting
// content off.
const BLOCK_BOUNDARY_REGEX = /<\/(?:div|p|tr|li|h[1-6])>|<br\s*\/?>/gi;
const AVG_LINE_HEIGHT_PT = 14; // typical line-height for receipt body text
// Deliberately pessimistic (real receipt glyphs run wider than this once you
// account for bold headers/totals) — roll-paper receipts (3in/2.5in/2in)
// were undershooting this estimate and spilling onto a 2nd page, so we'd
// rather overshoot into extra blank space than clip onto another page.
const AVG_CHAR_WIDTH_PT = 6.5; // conservative average glyph width at receipt font sizes
const CONTENT_CHROME_PT = 140; // padding, borders, cell spacing + safety buffer so text is never clipped
const IMAGE_HEIGHT_PT = 100; // logos/QR/barcodes contribute no text, so estimate a flat height per <img>
const SAFETY_MARGIN = 1.25; // extra headroom on top of the raw estimate before clamping
const MIN_CONTENT_HEIGHT_PT = 300;
const MAX_CONTENT_HEIGHT_PT = 6000;
const IMAGE_TAG_REGEX = /<img\b[^>]*>/gi;

const stripTags = (segment: string): string =>
  segment
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Backend receipts are self-contained documents with a <style> block full of
// CSS in <head> (selectors/declarations, not receipt content). That text
// contains none of the BLOCK_BOUNDARY_REGEX tags, so it was landing inside a
// single giant "block" with the opening body markup and getting counted as
// receipt text — wildly inflating the line estimate. Strip head/style/script
// before splitting so only actual visible content is measured.
const getBodyContent = (html: string): string => {
  const withoutHead = html.replace(/<head[\s\S]*?<\/head>/gi, '');
  return withoutHead
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
};

export const estimateReceiptHeightPt = (html: string, widthPt: number): number => {
  const bodyContent = getBodyContent(html);
  const imageCount = (bodyContent.match(IMAGE_TAG_REGEX) ?? []).length;

  const blocks = bodyContent
    .split(BLOCK_BOUNDARY_REGEX)
    .map(stripTags)
    .filter(Boolean);

  const charsPerLine = Math.max(10, Math.floor((widthPt - 32) / AVG_CHAR_WIDTH_PT));

  const estimatedLines = blocks.reduce(
    (total, block) => total + Math.max(1, Math.ceil(block.length / charsPerLine)),
    0,
  );

  const estimated =
    CONTENT_CHROME_PT +
    (estimatedLines * AVG_LINE_HEIGHT_PT + imageCount * IMAGE_HEIGHT_PT) * SAFETY_MARGIN;
  return Math.min(MAX_CONTENT_HEIGHT_PT, Math.max(MIN_CONTENT_HEIGHT_PT, Math.round(estimated)));
};

export const getPaperDimensions = (
  type?: ReceiptType,
  html?: string,
): { width: number; height: number } => {
  const size = type ? getPrintPaperSize(type) : DEFAULT_PAPER_SIZE;
  const { width, height } = PAPER_SIZE_DIMENSIONS_PT[size];

  if (html && ROLL_PAPER_SIZES.includes(size)) {
    return { width, height: estimateReceiptHeightPt(html, width) };
  }
  return { width, height };
};

export const setPrintPaperSize = (type: ReceiptType, size: PaperSize): void => {
  const settings = getJson<PrintSettingsMap>(PRINT_SETTINGS_KEY) ?? {};
  settings[type] = size;
  setJson(PRINT_SETTINGS_KEY, settings);
};

export const getAllPrintPaperSizes = (): Record<ReceiptType, PaperSize> => {
  const settings = getJson<PrintSettingsMap>(PRINT_SETTINGS_KEY) ?? {};
  return RECEIPT_TYPES.reduce((acc, type) => {
    acc[type] = settings[type] ?? DEFAULT_PAPER_SIZE;
    return acc;
  }, {} as Record<ReceiptType, PaperSize>);
};
