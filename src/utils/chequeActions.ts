import { colors } from '../theme';
import { Cheque, ChequeStatus } from '../types/cheques';

// ─── Shared cheque swipe-actions + confirm-dialog metadata ───────────────────
// Single source of truth for "what can you do to a cheque of status X" — used
// by ChequeListScreen and any other cheque list (e.g. the contact-ledger
// cheque-summary drill-down modal) so the two never drift apart.

export interface SwipeAction {
    key: string;
    label: string;
    icon: string;
    color: string;
    onPress: (cheque: Cheque) => void;
}

export interface SwipeActionHandlers {
    onClear: (c: Cheque) => void;
    onBounce: (c: Cheque) => void;
    onInstallment: (c: Cheque) => void;
    onReturn: (c: Cheque) => void;
    onExchange: (c: Cheque) => void;
}

export const getChequeSwipeActions = (
    status: ChequeStatus,
    { onClear, onBounce, onInstallment, onReturn, onExchange }: SwipeActionHandlers,
): SwipeAction[] => {
    switch (status) {
        case 'unsettled':
        case 'partial':
        case 'installment':
            return [
                { key: 'clear', label: 'Clear', icon: 'check-circle', color: colors.primary, onPress: onClear },
                { key: 'installment', label: 'Instal.', icon: 'schedule', color: colors.warning, onPress: onInstallment },
                { key: 'bounce', label: 'Bounce', icon: 'cancel', color: colors.danger, onPress: onBounce },
            ];
        case 'clearing':
            return [
                { key: 'clear', label: 'Clear', icon: 'check-circle', color: colors.primary, onPress: onClear },
                { key: 'bounce', label: 'Bounce', icon: 'cancel', color: colors.danger, onPress: onBounce },
            ];
        case 'issued':
            return [
                { key: 'clear', label: 'Clear', icon: 'check-circle', color: colors.primary, onPress: onClear },
                { key: 'installment', label: 'Instal.', icon: 'schedule', color: colors.warning, onPress: onInstallment },
                { key: 'bounce', label: 'Bounce', icon: 'cancel', color: colors.danger, onPress: onBounce },
                { key: 'exchange', label: 'Exch. Cash', icon: 'refresh', color: colors.info, onPress: onExchange },
            ];
        case 'handed_over':
            return [
                { key: 'clear', label: 'Clear', icon: 'check-circle', color: colors.primary, onPress: onClear },
                { key: 'return', label: 'Return', icon: 'undo', color: colors.info, onPress: onReturn },
            ];
        default:
            return [
                { key: 'clear', label: 'Clear', icon: 'check-circle', color: colors.primary, onPress: onClear },
                { key: 'installment', label: 'Instal.', icon: 'schedule', color: colors.warning, onPress: onInstallment },
                { key: 'bounce', label: 'Bounce', icon: 'cancel', color: colors.danger, onPress: onBounce },
            ];
    }
};

export type ChequeDialogType = 'settled' | 'bounced' | 'return' | 'swap';

export const CHEQUE_DIALOG_META: Record<ChequeDialogType, {
    title: string; message: string; confirmLabel: string;
    confirmColor: string; icon: string; dateLabel: string;
}> = {
    settled: { title: 'Clear Cheque', message: 'Are you sure you want to mark this cheque as cleared? This action cannot be undone.', confirmLabel: 'Clear', confirmColor: colors.primary, icon: 'check-circle', dateLabel: 'Clearing Date' },
    bounced: { title: 'Bounce Cheque', message: 'Mark this cheque as bounced? The contact will be notified and the amount will be reversed.', confirmLabel: 'Bounce', confirmColor: colors.danger, icon: 'cancel', dateLabel: 'Bounce Date' },
    return: { title: 'Return Cheque', message: 'Return this cheque to the contact? The transaction will be reversed.', confirmLabel: 'Return', confirmColor: colors.info, icon: 'undo', dateLabel: 'Return Date' },
    swap: { title: 'Exchange to Cash', message: 'Exchange this cheque for cash? This will settle the cheque immediately.', confirmLabel: 'Exchange', confirmColor: colors.info, icon: 'refresh', dateLabel: 'Exchange Date' },
};
