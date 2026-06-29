import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeRow } from 'react-native-swipe-list-view';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import useCurrency, { formatBalance } from '../utils/currency';
import { toDateString } from '../utils/stringUtils';
import Filter from '../components/Filter';
import Header from '../components/ui/Header';
import FilterModal from '../components/FilterModal';
import ApiDropdown from '../components/ui/ApiDropdown';
import DatePickerField from '../components/DatePickerField';
import { Cheque, chequeQueryParams, ChequeStatus } from '../types/cheques';
import { getCheques, getChequeStatus, recordInstallment, updateCheque } from '../services/cheques';
import Error from '../components/common/Error';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import ChequeCard from '../components/ChequeCard';
import FilterTabs from '../components/FilterTabs';
import { ConfirmDialog, InstallmentDialog } from '../components/ChequeActionModals';
import { Account } from '../types/payments';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: string; label: string }[] = [
    { key: 'unsettled', label: 'Pending' },
    { key: 'partial', label: 'Partial Pending' },
    { key: 'installment', label: 'Partial paid' },
    { key: 'issued', label: 'Paid' },
    { key: 'clearing', label: 'Clearing' },
    { key: 'handed_over', label: 'Forwarded' },
];

/** Width (px) of each swipe action button */
const ACTION_BUTTON_WIDTH = 64;

// ─── Dialog types ─────────────────────────────────────────────────────────────

type DialogType = 'settled' | 'bounced' | 'return' | 'swap' | null;

interface DialogState {
    type: DialogType;
    cheque: Cheque | null;
}

const DIALOG_META: Record<NonNullable<DialogType>, {
    title: string; message: string; confirmLabel: string;
    confirmColor: string; icon: string; dateLabel: string;
}> = {
    settled: { title: 'Clear Cheque', message: 'Are you sure you want to mark this cheque as cleared? This action cannot be undone.', confirmLabel: 'Clear', confirmColor: colors.primary, icon: 'check-circle', dateLabel: 'Clearing Date' },
    bounced: { title: 'Bounce Cheque', message: 'Mark this cheque as bounced? The contact will be notified and the amount will be reversed.', confirmLabel: 'Bounce', confirmColor: colors.danger, icon: 'cancel', dateLabel: 'Bounce Date' },
    return: { title: 'Return Cheque', message: 'Return this cheque to the contact? The transaction will be reversed.', confirmLabel: 'Return', confirmColor: colors.info, icon: 'undo', dateLabel: 'Return Date' },
    swap: { title: 'Exchange to Cash', message: 'Exchange this cheque for cash? This will settle the cheque immediately.', confirmLabel: 'Exchange', confirmColor: colors.info, icon: 'refresh', dateLabel: 'Exchange Date' },
};

// ─── Action definitions per status ───────────────────────────────────────────

interface SwipeAction {
    key: string;
    label: string;
    icon: string;
    color: string;
    onPress: (cheque: Cheque) => void;
}

const getSwipeActions = (
    status: ChequeStatus,
    onClear: (c: Cheque) => void,
    onBounce: (c: Cheque) => void,
    onInstallment: (c: Cheque) => void,
    onReturn: (c: Cheque) => void,
    onExchange: (c: Cheque) => void,
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

// ─── List footer ──────────────────────────────────────────────────────────────
// Extracted outside the screen component to avoid re-creation on every render.

const ListFooter: React.FC<{ isFetchingNextPage: boolean }> = ({ isFetchingNextPage }) => {
    if (!isFetchingNextPage) return null;
    return (
        <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerLoaderText}>Loading more...</Text>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ChequeList'>;
};

const ChequeListScreen: React.FC<Props> = ({ navigation }) => {

    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<chequeQueryParams>({
        searchQuery: '', contacts: [], accounts: [], clearing_date: '', status: 'unsettled',
    });
    const [draftFilters, setDraftFilters] = useState<chequeQueryParams>({ ...filters });

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [dialog, setDialog] = useState<DialogState>({ type: null, cheque: null });
    const [showInstallment, setShowInstallment] = useState(false);
    const [installmentCheque, setInstallmentCheque] = useState<Cheque | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Ref to the SwipeListView so we can close open rows after an action
    const swipeListRef = useRef<any>(null);

    const currency = useCurrency();

    // ── Infinite query ────────────────────────────────────────────────────────
    const {
        data,
        isLoading,
        isError,
        isRefetching,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['cheques-list', filters],
        queryFn: ({ pageParam = 1 }) =>
            getCheques({ ...filters, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            const { current_page, last_page } = lastPage ?? {};
            return current_page < last_page ? current_page + 1 : undefined;
        },
        staleTime: 30_000,
    });

    const cheques: Cheque[] = data?.pages.flatMap((page: any) => page?.data ?? []) ?? [];

    // ── Status summary (total amount + count for the active filters) ─────────
    const { data: chequeStatus } = useQuery({
        queryKey: ['cheque-status', filters],
        queryFn: () => getChequeStatus(filters),
        staleTime: 30_000,
    });

    // ── Pagination ────────────────────────────────────────────────────────────
    const handleEndReached = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // ── Dialog handlers ───────────────────────────────────────────────────────
    const openConfirm = useCallback((type: NonNullable<DialogType>, cheque: Cheque) => {
        // Close any open swipe row before showing dialog
        swipeListRef.current?.closeAllOpenRows?.();
        setDialog({ type, cheque });
    }, []);

    const closeConfirm = useCallback(() => setDialog({ type: null, cheque: null }), []);

    const handleConfirmAction = useCallback(async (date: Date | null) => {
        if (!dialog.cheque || !dialog.type) return;
        try {
            setActionLoading(true);
            await updateCheque(dialog.cheque, dialog.type, date ? toDateString(date) : undefined);
            await refetch();
            closeConfirm();
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setActionLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialog]);

    const handleInstallmentConfirm = useCallback(async (amount: string, account: Account | undefined, date: Date | null) => {
        if (!installmentCheque) return;
        try {
            setActionLoading(true);
            await recordInstallment(installmentCheque, parseFloat(amount), account?.id, date ? toDateString(date) : undefined);
            await refetch();
            setShowInstallment(false);
            setInstallmentCheque(null);
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setActionLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installmentCheque]);

    // ── Card action callbacks ─────────────────────────────────────────────────
    const handleClear = useCallback((c: Cheque) => openConfirm('settled', c), [openConfirm]);
    const handleBounce = useCallback((c: Cheque) => openConfirm('bounced', c), [openConfirm]);
    const handleReturn = useCallback((c: Cheque) => openConfirm('return', c), [openConfirm]);
    const handleExchange = useCallback((c: Cheque) => openConfirm('swap', c), [openConfirm]);
    const handleInstallment = useCallback((c: Cheque) => {
        swipeListRef.current?.closeAllOpenRows?.();
        setInstallmentCheque(c);
        setShowInstallment(true);
    }, []);
    const handlePress = useCallback((_c: Cheque) => { /* navigate to detail */ }, []);

    // ── Filter handlers ───────────────────────────────────────────────────────
    const handleOpenFilters = useCallback(() => { setDraftFilters(filters); setShowFilterModal(true); }, [filters]);
    const handleResetFilters = useCallback(() => {
        const reset: chequeQueryParams = { searchQuery: '', contacts: [], accounts: [], status: 'unsettled', date: filters.date };
        setDraftFilters(reset);
        setFilters(reset);
    }, [filters.date]);
    const handleApplyFilters = () => { setFilters(draftFilters); setShowFilterModal(false); };

    // ── Swipe renderers ───────────────────────────────────────────────────────
    // Each row uses SwipeRow directly so rightOpenValue can be per-item dynamic.

    const renderItem = useCallback(({ item }: { item: Cheque }) => {
        const actions = getSwipeActions(
            item.status,
            handleClear,
            handleBounce,
            handleInstallment,
            handleReturn,
            handleExchange,
        );
        const openValue = -(ACTION_BUTTON_WIDTH * actions.length);
        const lastIndex = actions.length - 1;

        // SwipeRow types omit the children prop — cast via any to bypass the TS error.
        // At runtime SwipeRow requires exactly two children:
        //   [0] hidden layer  [1] visible card
        const SwipeRowAny = SwipeRow as any;

        return (
            <SwipeRowAny
                rightOpenValue={openValue}
                disableRightSwipe
                closeOnRowPress
            >
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
                            onPress={() => action.onPress(item)}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name={action.icon} size={20} color="#fff" />
                            <Text style={styles.hiddenButtonLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ChequeCard
                    item={item}
                    currency={currency}
                    onPress={handlePress}
                />
            </SwipeRowAny>
        );
    }, [currency, handlePress, handleClear, handleBounce, handleInstallment, handleReturn, handleExchange]);

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            {dialog.type && (
                <ConfirmDialog
                    visible={!!dialog.type}
                    cheque={dialog.cheque}
                    loading={actionLoading}
                    onConfirm={handleConfirmAction}
                    onCancel={closeConfirm}
                    {...DIALOG_META[dialog.type]}
                />
            )}

            <InstallmentDialog
                visible={showInstallment}
                cheque={installmentCheque}
                loading={actionLoading}
                onConfirm={handleInstallmentConfirm}
                onCancel={() => { setShowInstallment(false); setInstallmentCheque(null); }}
            />

            <Header title="Cheques" navigation={navigation} />

            <Filter
                placeHolder="Search cheques..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

            <FilterTabs
                tabs={STATUS_FILTERS}
                value={filters.status}
                onChange={(key) => setFilters((prev) => ({ ...prev, status: key }))}
            />

            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>Cheque Results</Text>
                {chequeStatus && (
                    <View style={styles.statusSummary}>
                        <Text style={styles.statusAmount}>
                            {formatBalance(parseFloat(chequeStatus.total_amount), currency ?? undefined)}
                        </Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{chequeStatus.quantity}</Text>
                        </View>
                    </View>
                )}
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
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
                    renderItem={renderItem}
                />
            )}

            <FilterModal
                visible={showFilterModal}
                title="Filter Cheques"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <View style={styles.filterSection}>
                    <ApiDropdown
                        label="Contact"
                        url="/contacts"
                        searchParam = 'search'
                        value={draftFilters.contacts}
                        multiple
                        zIndex={2000}
                        onValueChange={(v) =>
                            setDraftFilters((p: any) => ({ ...p, contacts: v as string[] }))
                        }
                    />
                </View>
                <View style={styles.filterSection}>
                    <ApiDropdown
                        label="Account"
                        url="/search-account"
                        value={draftFilters.accounts}
                        multiple
                        onValueChange={(v) =>
                            setDraftFilters((p: any) => ({ ...p, accounts: v as string[] }))
                        }
                    />
                </View>
                <View style={styles.filterSection}>
                    <DatePickerField
                        label="Clearing Date"
                        value={(draftFilters as any).clearing_date ?? null}
                        onChange={(d) => setDraftFilters((p: any) => ({
                            ...p, clearing_date: d ? d : undefined,
                        }))}
                        placeholder="Select date"
                        inputBg={colors.backgroundLight}
                    />
                </View>
            </FilterModal>

        </SafeAreaView>
    );
};

export default ChequeListScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    listHeaderText: { fontSize: 11, fontWeight: '800', color: '#61896f', letterSpacing: 2, textTransform: 'uppercase' },
    statusSummary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusAmount: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    countBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    countText: { fontSize: 11, fontWeight: '800', color: colors.primary },
    flatList: { flex: 1 },
    listContent: { paddingHorizontal: 12, paddingBottom: 40, gap: 10 },
    filterSection: { marginBottom: 15 },
    footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
    footerLoaderText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    // ── Swipe hidden row ──────────────────────────────────────────────────────
    hiddenRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
    },
    hiddenButton: {
        width: ACTION_BUTTON_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    hiddenButtonLeft: {
        borderTopLeftRadius: 5,
        borderBottomLeftRadius: 5,
    },
    hiddenButtonRight: {
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5,
    },
    hiddenButtonLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
});