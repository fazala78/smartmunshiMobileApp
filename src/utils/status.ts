import { colors } from '../theme';

export const STATUS_META: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  pending: {
    bg: colors.warningLight,
    text: colors.warningText,
    dot: colors.warning,
  },
  unsettled: {
    bg: colors.warningLight,
    text: colors.warningText,
    dot: colors.warning,
  },
  clearing: {
    bg: colors.warningLight,
    text: colors.warningText,
    dot: colors.warning,
  },

  bounced: { bg: colors.dangerLight, text: colors.danger, dot: colors.error },

  cleared: {
    bg: colors.primaryLight,
    text: colors.successText,
    dot: colors.primary,
  },
  issued: {
    bg: colors.primaryLight,
    text: colors.successText,
    dot: colors.primary,
  },

  partial: { bg: colors.infoLight, text: colors.infoText, dot: colors.info },
  installment: {
    bg: colors.infoLight,
    text: colors.infoText,
    dot: colors.info,
  },

  handed_over: {
    bg: colors.purpleLight,
    text: colors.purple,
    dot: colors.purple,
  },
  online: {
    bg: colors.purpleLight,
    text: colors.purple,
    dot: colors.purple,
  },
  cash: {
    bg: colors.primaryLight,
    text: colors.successText,
    dot: colors.primary,
  },
};
