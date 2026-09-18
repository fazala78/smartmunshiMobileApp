import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeRow } from 'react-native-swipe-list-view';
import { useQuery } from '@tanstack/react-query';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import { formatBalance } from '../../utils/currency';
import { toDateString } from '../../utils/stringUtils';
import { ContactChequeListItem, Cheque, ChequeStatus } from '../../types/cheques';
import { getContactChequeList, updateCheque, recordInstallment } from '../../services/cheques';
import { ConfirmDialog, InstallmentDialog } from '../../components/ChequeActionModals';
import { getChequeSwipeActions, CHEQUE_DIALOG_META, ChequeDialogType } from '../../utils/chequeActions';
import { Account } from '../../types/payments';
import { Currency } from '../../types/contact';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import Empty from '../../components/common/Empty';

// ─── Same swipe-action + confirm-dialog flow as ChequeListScreen (via the
// shared utils/chequeActions module), scoped to a single fixed status — every
// row here already shares one status, since it came from one summary card. ──

/** Width (px) of each swipe action button — matches ChequeListScreen. */
const ACTION_BUTTON_WIDTH = 64;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactChequeListModalProps {
    visible: boolean;
    contactId: number;
    status: ChequeStatus;
    title: string;
    currency?: Currency | null;
    onClose: () => void;
    /** Called after a cheque action succeeds, so the caller can refresh its own summary figures. */
    onActionSuccess?: () => void;
}

/** Adapts the lightweight list-item shape to what ConfirmDialog/InstallmentDialog read (id, cheque_number, amount). */
const toDialogCheque = (item: ContactChequeListItem): Cheque =>
    ({ id: item.id, cheque_number: item.cheque_number, amount: item.amount } as unknown as Cheque);

// ─── Component ────────────────────────────────────────────────────────────────

const ContactChequeListModal: React.FC<ContactChequeListModalProps> = ({
    visible, contactId, status, title, currency, onClose, onActionSuccess,
}) => {
    const [dialog, setDialog] = useState<{ type: ChequeDialogType | null; item: ContactChequeListItem | null }>({ type: null, item: null });
    const [showInstallment, setShowInstallment] = useState(false);
    const [installmentItem, setInstallmentItem] = useState<ContactChequeListItem | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const swipeListRef = useRef<any>(null);

    // `status` (the API's `cheque_status`) is used directly as the route type —
    // e.g. "unsettled", "partial", "issued", "installment", "handed_over".
    const { data: cheques = [], isLoading, isError, isRefetching, refetch } = useQuery({
        queryKey: ['contactChequeList', contactId, status],
        queryFn: () => getContactChequeList(contactId, status),
        enabled: visible && !!contactId,
        staleTime: 0,
    });

    // ── Dialog handlers ───────────────────────────────────────────────────────
    const openConfirm = useCallback((type: ChequeDialogType, item: ContactChequeListItem) => {
        swipeListRef.current?.closeAllOpenRows?.();
        setDialog({ type, item });
    }, []);
    const closeConfirm = useCallback(() => setDialog({ type: null, item: null }), []);

    const handleConfirmAction = useCallback(async (date: Date | null) => {
        if (!dialog.item || !dialog.type) return;
        try {
            setActionLoading(true);
            await updateCheque(dialog.item, dialog.type, date ? toDateString(date) : undefined);
            await refetch();
            onActionSuccess?.();
            closeConfirm();
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setActionLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialog]);

    const handleInstallmentConfirm = useCallback(async (amount: string, account: Account | undefined, date: Date | null) => {
        if (!installmentItem) return;
        try {
            setActionLoading(true);
            await recordInstallment(installmentItem, parseFloat(amount), account?.id, date ? toDateString(date) : undefined);
            await refetch();
            onActionSuccess?.();
            setShowInstallment(false);
            setInstallmentItem(null);
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setActionLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installmentItem]);

    // Typed as (c: Cheque) => void to match getChequeSwipeActions' shared
    // handler shape — the object underneath is really a ContactChequeListItem,
    // which still carries the `id`/`cheque_number`/`amount` fields these need.
    const handleClear = useCallback((c: Cheque) => openConfirm('settled', c as unknown as ContactChequeListItem), [openConfirm]);
    const handleBounce = useCallback((c: Cheque) => openConfirm('bounced', c as unknown as ContactChequeListItem), [openConfirm]);
    const handleReturn = useCallback((c: Cheque) => openConfirm('return', c as unknown as ContactChequeListItem), [openConfirm]);
    const handleExchange = useCallback((c: Cheque) => openConfirm('swap', c as unknown as ContactChequeListItem), [openConfirm]);
    const handleInstallment = useCallback((c: Cheque) => {
        swipeListRef.current?.closeAllOpenRows?.();
        setInstallmentItem(c as unknown as ContactChequeListItem);
        setShowInstallment(true);
    }, []);

    const handleClose = useCallback(() => {
        swipeListRef.current?.closeAllOpenRows?.();
        onClose();
    }, [onClose]);

    // ── Row renderer ───────────────────────────────────────────────────────────
    // Every row shares the same status, so the action set is fixed per modal
    // (unlike ChequeListScreen, which mixes statuses in one list) — driven by
    // the same getChequeSwipeActions used there.
    const actions = useMemo(
        () => getChequeSwipeActions(status, {
            onClear: handleClear,
            onBounce: handleBounce,
            onInstallment: handleInstallment,
            onReturn: handleReturn,
            onExchange: handleExchange,
        }),
        [status, handleClear, handleBounce, handleInstallment, handleReturn, handleExchange],
    );
    const openValue = -(ACTION_BUTTON_WIDTH * actions.length);
    const lastIndex = actions.length - 1;

    const renderItem = useCallback(({ item }: { item: ContactChequeListItem }) => {
        const amount = parseFloat(String(item.amount)) || 0;
        const SwipeRowAny = SwipeRow as any;

        return (
            <SwipeRowAny rightOpenValue={openValue} disableRightSwipe closeOnRowPress>
                <View style={styles.hiddenRow}>
                    {actions.map((action, index) => (
                        <TouchableOpacity
                            key={action.key}
                            style={[
                                styles.hiddenButton,
                                { backgroundColor: action.color },
                                index === 0 && styles.hiddenButtonLeft,
                                index === lastIndex && styles.hiddenButtonRight,
                            ]}
                            onPress={() => action.onPress(item as unknown as Cheque)}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name={action.icon} size={20} color="#fff" />
                            <Text style={styles.hiddenButtonLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <MaterialIcons name="description" size={24} color={colors.gray500} />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>{item.cheque_number}</Text>
                        <Text style={styles.sub}>Due {item.due_date}</Text>
                        {item.paid_amount > 0 && (
                            <Text style={styles.paidSub}>Paid {formatBalance(item.paid_amount, currency ?? undefined)}</Text>
                        )}
                    </View>
                    <View style={styles.right}>
                        <Text style={styles.amount}>{formatBalance(amount, currency ?? undefined)}</Text>
                        <Text style={styles.balanceLabel}>Balance</Text>
                        <Text style={styles.balanceValue}>{formatBalance(item.balance, currency ?? undefined)}</Text>
                    </View>
                </View>
            </SwipeRowAny>
        );
    }, [actions, currency, openValue, lastIndex]);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
                        <MaterialIcons name="close" size={20} color={colors.gray600} />
                    </TouchableOpacity>
                </View>

                {isLoading && <Loading />}
                {isError && !isLoading && <Error refetch={refetch} />}
                {!isLoading && !isError && cheques.length === 0 && <Empty title="No cheques found" />}

                {!isLoading && !isError && cheques.length > 0 && (
                    <FlatList
                        ref={swipeListRef}
                        data={cheques}
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        keyExtractor={(item) => String(item.id)}
                        style={styles.flatList}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderItem}
                    />
                )}

                {dialog.type && (
                    <ConfirmDialog
                        visible={!!dialog.type}
                        cheque={dialog.item ? toDialogCheque(dialog.item) : null}
                        loading={actionLoading}
                        onConfirm={handleConfirmAction}
                        onCancel={closeConfirm}
                        {...CHEQUE_DIALOG_META[dialog.type]}
                    />
                )}

                <InstallmentDialog
                    visible={showInstallment}
                    cheque={installmentItem ? toDialogCheque(installmentItem) : null}
                    loading={actionLoading}
                    onConfirm={handleInstallmentConfirm}
                    onCancel={() => { setShowInstallment(false); setInstallmentItem(null); }}
                />
            </SafeAreaView>
        </Modal>
    );
};

export default ContactChequeListModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center' },

    flatList: { flex: 1 },
    listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40, gap: 10 },

    // ── Cheque row (design mirrors ChequeCard) ──────────────────────────────
    card: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    sub: { fontSize: 12, fontWeight: '500', color: '#61896f' },
    paidSub: { fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 1 },
    right: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    amount: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    balanceLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    balanceValue: { fontSize: 12, fontWeight: '700', color: colors.gray700 },

    // ── Swipe hidden row ─────────────────────────────────────────────────────
    hiddenRow: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch' },
    hiddenButton: { width: ACTION_BUTTON_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 4 },
    hiddenButtonLeft: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
    hiddenButtonRight: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
    hiddenButtonLabel: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
