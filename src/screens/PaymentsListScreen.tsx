import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeRow } from 'react-native-swipe-list-view';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import useCurrency from '../utils/currency';
import DatePicker from '../components/DatePicker';
import Filter from '../components/Filter';
import Header from '../components/ui/Header';
import FilterModal from '../components/FilterModal';
import Error from '../components/common/Error';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import { toDateString } from '../utils/stringUtils';
import ApiDropdown from '../components/ui/ApiDropdown';
import PaymentTransactionCard from '../components/PaymentTransactionCard';
import { PaymentListing } from '../types/payments';
import PaymentReceipt from './modals/PaymentReceipt';
import { deletePayment, getPaymentMethods, getReceivePaymentTransactions } from '../services/paymentService';
import FilterTabs from '../components/FilterTabs';
import DeletePaymentTransactionDialog from './modals/DeletePaymentTransactionDialog';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FloatingFabButton } from '../components/ui/FloatingFabButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'receivePaymentList'>;
    route:      RouteProp<RootStackParamList, 'receivePaymentList'>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_BUTTON_WIDTH = 70;

// ─── Swipe actions ────────────────────────────────────────────────────────────

interface SwipeAction {
    key:     string;
    label:   string;
    icon:    string;
    color:   string;
    onPress: (tx: PaymentListing) => void;
}

const getSwipeActions = (
    onEdit:   (tx: PaymentListing) => void,
    onDelete: (tx: PaymentListing) => void,
): SwipeAction[] => [
    { key: 'edit',   label: 'Edit',   icon: 'edit',   color: colors.info,   onPress: onEdit   },
    { key: 'delete', label: 'Delete', icon: 'delete', color: colors.danger, onPress: onDelete },
];

// ─── List footer ──────────────────────────────────────────────────────────────
// Defined outside the screen to prevent re-creation on every render.

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

const PaymentsListScreen: React.FC<Props> = ({ navigation, route }) => {

    const { item } = route.params ?? {};

    const [showFilterModal,      setShowFilterModal]      = useState(false);
    const [filters,              setFilters]              = useState<any>({ contacts: [], payment_method: '', searchQuery: '', date: toDateString(new Date()) });
    const [draftFilters,         setDraftFilters]         = useState<any>({ ...filters });
    const [deleteTarget,         setDeleteTarget]         = useState<PaymentListing | null>(null);
    const [actionLoading,        setActionLoading]        = useState(false);
    const [paymentModalVisible,  setPaymentModalVisible]  = useState(false);
    const [paymentTransaction,   setPaymentTransaction]   = useState<PaymentListing | null>(null);

    const flatListRef = useRef<any>(null);
    const currency    = useCurrency();

    // ── Fetch payment methods for filter tabs ─────────────────────────────────
    const { data: paymentMethods = [] } = useQuery<any>({
        queryKey:  [item?.route],
        queryFn:   () => getPaymentMethods(item?.route),
        staleTime: 5 * 60 * 1000,
    });

    // ── Infinite query ────────────────────────────────────────────────────────
    const {
        data,
        isLoading,
        isError,
        refetch,
        isRefetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: [item?.route, filters],
        queryFn:  ({ pageParam = 1 }) =>
            getReceivePaymentTransactions(item?.route, { ...filters, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            const { current_page, last_page } = lastPage ?? {};
            return current_page < last_page ? current_page + 1 : undefined;
        },
        staleTime: 30_000,
    });

    const transactions: PaymentListing[] =
        data?.pages.flatMap((page: any) => page?.data ?? []) ?? [];

    // ── Quick filter tabs ─────────────────────────────────────────────────────
    const quickFilters = useMemo<any[]>(() => [
        { key: '', label: 'All' },
        ...paymentMethods.map((type: string) => ({ key: type, label: type })),
    ], [paymentMethods]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleEdit = useCallback((_tx: PaymentListing) => {
        // navigation.navigate('EditPayment', { id: tx.id });
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget) return;
        try {
            setActionLoading(true);
            await deletePayment(deleteTarget.id,deleteTarget.route);
            await refetch();
            setDeleteTarget(null);
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Delete failed.');
        } finally {
            setActionLoading(false);
        }
    }, [deleteTarget, refetch]);

    const handlePress = useCallback((tx: PaymentListing) => {
        setPaymentTransaction(tx);
        setPaymentModalVisible(true);
    }, []);

    const handleModalClosing = useCallback(() => {
        setPaymentTransaction(null);
        setPaymentModalVisible(false);
    }, []);

      const handleAddPayment = () => {
        const route = item?.route === 'receive-payments'
            ? 'ReceivePayment'
            : 'PayPayment';
        handleModalClosing();
        navigation.navigate(route);
    };

    const handleEndReached = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleOpenFilters = useCallback(() => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        const reset = { contacts: [], payment_method: '', searchQuery: '', date: filters.date };
        setDraftFilters(reset);
        setFilters(reset);
    }, [filters.date]);

    const handleApplyFilters = useCallback(() => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    }, [draftFilters]);

      const handleRefresh = useCallback(() => {
            refetch();
          }, [refetch]);

    // ── Swipe row renderer ────────────────────────────────────────────────────
    const renderItem = useCallback(({ item: tx }: { item: PaymentListing }) => {
        const actions   = getSwipeActions(handleEdit, (t) => setDeleteTarget(t));
        const openValue = -(ACTION_BUTTON_WIDTH * actions.length);
        const lastIndex = actions.length - 1;

        // SwipeRow TS types omit the children prop — cast via any to bypass.
        const SwipeRowAny = SwipeRow as any;

        return (
            <SwipeRowAny
                rightOpenValue={openValue}
                disableRightSwipe
                closeOnRowPress
            >
                {/* Hidden action buttons */}
                <View style={styles.hiddenRow}>
                    {actions.map((action, index) => (
                        <TouchableOpacity
                            key={action.key}
                            style={[
                                styles.hiddenButton,
                                { backgroundColor: action.color },
                                index === 0         && styles.hiddenButtonLeft,
                                index === lastIndex && styles.hiddenButtonRight,
                            ]}
                            onPress={() => action.onPress(tx)}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name={action.icon} size={20} color={colors.white} />
                            <Text style={styles.hiddenButtonLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Visible card */}
                <PaymentTransactionCard
                    item={tx}
                    currency={currency}
                    onPress={handlePress}
                />
            </SwipeRowAny>
        );
    }, [currency, handleEdit, handlePress]);

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            {/* Delete confirm dialog */}
            {deleteTarget && (
                <DeletePaymentTransactionDialog
                    visible={!!deleteTarget}
                    item={deleteTarget}
                    loading={actionLoading}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            <Header title={item?.label ?? 'Payments'} navigation={navigation} />

            <Filter
                placeHolder="Search transactions..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

            {quickFilters.length > 1 && (
                <FilterTabs
                    tabs={quickFilters}
                    value={filters.payment_method}
                    onChange={(key) => setFilters((prev: any) => ({ ...prev, payment_method: key }))}
                />
            )}

            <DatePicker onDateChange={(date) => setFilters((p: any) => ({ ...p, date }))} />

            {/* List header */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>Results</Text>
                {transactions.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{transactions.length}</Text>
                    </View>
                )}
            </View>

            {/* States */}
            {isLoading && <Loading />}
            {isError && !isLoading && <Error refetch={refetch} />}
            {!isLoading && !isError && transactions.length === 0 && (
                <Empty title="No transactions found" />
            )}

            {/* List */}
            {!isLoading && !isError && transactions.length > 0 && (
                <FlatList
                    ref={flatListRef}
                    data={transactions}
                    keyExtractor={(tx) => String(tx.id)}
                    style={styles.flatList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
                    renderItem={renderItem}
                     refreshControl={
                                                    <RefreshControl
                                                      refreshing={isRefetching && !isLoading}
                                                      onRefresh={handleRefresh}
                                                      colors={[colors.primary]}
                                                      tintColor={colors.primary}
                                                    />
                                                  }

                />
            )}

            {/* Filter modal */}
            <FilterModal
                visible={showFilterModal}
                title="Filter Transactions"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <View style={styles.filterSection}>
                    <ApiDropdown
                        label="Contact"
                        url="/contacts"
                        value={draftFilters.contacts}
                        multiple
                        zIndex={2000}
                        onValueChange={(v) =>
                            setDraftFilters((p: any) => ({ ...p, contacts: v as string[] }))
                        }
                    />
                </View>
            </FilterModal>
            <FloatingFabButton onPress={handleAddPayment} />

            {/* Receipt modal */}
            <Modal
                visible={paymentModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleModalClosing}
                statusBarTranslucent
            >
                {paymentTransaction && (
                    <PaymentReceipt
                        transaction={paymentTransaction}
                        visible={paymentModalVisible}
                        onClose={handleModalClosing}
                        onAddNew={handleAddPayment}
                    />
                )}
            </Modal>

        </SafeAreaView>
    );
};

export default PaymentsListScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:        { flex: 1, backgroundColor: colors.white },
    listHeaderRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    listHeaderText:   { fontSize: 11, fontWeight: '800', color: '#61896f', letterSpacing: 2, textTransform: 'uppercase' },
    countBadge:       { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    countText:        { fontSize: 11, fontWeight: '800', color: colors.primary },
    flatList:         { flex: 1 },
    listContent:      { paddingHorizontal: 12, paddingBottom: 40, gap: 10 },
    filterSection:    { marginBottom: 15 },
    footerLoader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
    footerLoaderText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    // ── Swipe hidden row ──────────────────────────────────────────────────────
    hiddenRow: {
        flex:           1,
        flexDirection:  'row',
        justifyContent: 'flex-end',
        alignItems:     'stretch',
    },
    hiddenButton: {
        width:          ACTION_BUTTON_WIDTH,
        alignItems:     'center',
        justifyContent: 'center',
        gap:            4,
    },
    hiddenButtonLeft: {
        borderTopLeftRadius:    12,
        borderBottomLeftRadius: 12,
    },
    hiddenButtonRight: {
        borderTopRightRadius:    12,
        borderBottomRightRadius: 12,
    },
    hiddenButtonLabel: {
        fontSize:   10,
        fontWeight: '700',
        color:      '#fff',
    },
});