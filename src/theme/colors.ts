export const colors = {
  // ── Brand / Primary ───────────────────────────────────────────────────────
  primary: '#28a745', // main brand green
  primaryLight: '#d4edda', // soft green background
  primaryMuted: 'rgba(40,167,69,0.1)', // ghost green tint
  primaryBorder: '#10b981', // green border / divider
  primaryDark: '#1e7e34', // darker green for pressed states

  // ── Success (mirrors primary) ─────────────────────────────────────────────
  success: '#28a745',
  successLight: '#d4edda',
  successText: '#155724', // dark green text on light bg

  // ── Danger / Error ────────────────────────────────────────────────────────
  danger: '#dc3545', // strong red — destructive actions
  dangerLight: '#fde8ea', // soft red background
  dangerDark: '#b02a37', // darker red for pressed states
  error: '#ef4444', // inline validation error
  errorBg: '#fef2f2', // error field background tint
  errorText: '#991b1b', // dark red text on light bg

  // ── Warning ───────────────────────────────────────────────────────────────
  warning: '#f59e0b', // amber — caution states
  warningLight: '#fef3c7', // soft amber background
  warningDark: '#b45309', // darker amber for pressed states
  warningText: '#92400e', // dark amber text on light bg
  warning2: '#f97316', // orange — alternate warning / purchase

  // ── Info ──────────────────────────────────────────────────────────────────
  info: '#0d6efd', // blue — informational states
  infoLight: '#dbeafe', // soft blue background
  infoDark: '#0a58ca', // darker blue for pressed states
  infoText: '#1e3a5f', // dark blue text on light bg

  // ── Neutral / Grays ───────────────────────────────────────────────────────
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary: '#233a68', // navy — primary body text
  textSecondary: '#6b7280', // gray — secondary / supporting text
  textMuted: '#9ca3af', // light gray — hints, placeholders
  textPlaceholder: '#61896f', // muted green — green-tinted placeholder
  textInverse: '#ffffff', // white text on dark backgrounds
  textDisabled: '#c4c9d4', // disabled field text

  // ── Backgrounds ───────────────────────────────────────────────────────────
  background: '#f5faf6', // app-level screen background
  backgroundLight: '#F6F8F6', // light section / card background
  backgroundDark: '#233a68', // dark navy background (headers, sidebars)
  backgroundOverlay: 'rgba(0,0,0,0.5)', // modal overlay

  // ── Surface / Cards ───────────────────────────────────────────────────────
  white: '#ffffff', // pure white surface
  surface: '#ffffff', // card / sheet surface
  surfaceMuted: '#f9fafb', // slightly off-white surface
  surfaceDark: '#1f2937', // dark card surface

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#e8f0ea', // default subtle border
  borderStrong: '#d1d5db', // stronger divider / separator
  borderFocus: '#28a745', // focused input border (brand green)
  borderError: '#ef4444', // error input border

  // ── UI Chrome / Brand Dark ────────────────────────────────────────────────
  dark: '#233a68', // navy — top bars, headers
  darkMuted: 'rgba(35,58,104,0.08)', // navy ghost tint

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadowSm: 'rgba(0,0,0,0.06)',
  shadowMd: 'rgba(0,0,0,0.12)',
  shadowLg: 'rgba(0,0,0,0.20)',

  featured: '#13ec5b',

  purple: '#7c3aed',
  purpleLight: '#f3e8ff',
};

export type AppColors = typeof colors;
export type ColorKey = keyof AppColors;
