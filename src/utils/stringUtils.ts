export const underscoreToSpace = (text = '') => {
  return text.replace(/_/g, ' ');
};

// utils/date.ts  (or top of screen)
export const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // "2026-03-04" — no timezone shift
};
