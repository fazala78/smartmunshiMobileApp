import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeRow } from 'react-native-swipe-list-view';
import { useInfiniteQuery } from '@tanstack/react-query';
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
import InventoryTransactionCard from '../components/InventoryTransactionCard';
import { deleteTransaction, getTransactionInventory } from '../services/inventoryTransaction';
import { toDateString } from '../utils/stringUtils';
import { DeletePayload, InventoryTransaction, TransactionPayment, TransactionSaleReturn } from '../types/Inventory';
import TransactionSlip from './modals/TransactionSlip';
import ApiDropdown from '../components/ui/ApiDropdown';
import DeleteTransactionDialog from './modals/DeleteTransactionDialog';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FloatingFabButton } from '../components/ui/FloatingFabButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'inventoryTransaction'>;
    route:      RouteProp<RootStackParamList, 'inventoryTransaction'>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_BUTTON_WIDTH = 70;

// ─── Swipe actions ────────────────────────────────────────────────────────────

interface SwipeAction {
    key:     string;
    label:   string;
    icon:    string;
    color:   string;
    onPress: (tx: InventoryTransaction) => void;
}

const getSwipeActions = (
    onEdit:   (tx: InventoryTransaction) => void,
    onDelete: (tx: InventoryTransaction) => void,
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

const InventoryTransactionsScreen: React.FC<Props> = ({ navigation, route }) => {

    const { item } = route.params ?? {};

    const [showFilterModal,       setShowFilterModal]       = useState(false);
    const [filters,               setFilters]               = useState<any>({ searchQuery: '', date: toDateString(new Date()) });
    const [draftFilters,          setDraftFilters]          = useState<any>({ ...filters });
    const [deleteTarget,          setDeleteTarget]          = useState<InventoryTransaction | null>(null);
    const [actionLoading,         setActionLoading]         = useState(false);
    const [receiptModalVisible,   setReceiptModalVisible]   = useState(false);
    const [inventoryTransaction,  setInventoryTransaction]  = useState<InventoryTransaction | null>(null);

    const flatListRef = useRef<any>(null);
    const currency    = useCurrency();

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
            getTransactionInventory(item?.route, { ...filters, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            const { current_page, last_page } = lastPage ?? {};
            return current_page < last_page ? current_page + 1 : undefined;
        },
        enabled: !!item?.route,
    });

    const transactions: InventoryTransaction[] =
        data?.pages.flatMap((page: any) => page?.data ?? []) ?? [];

    // ── Handlers ──────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleEdit = useCallback((tx: InventoryTransaction) => {
        // navigation.navigate('EditTransaction', { id: tx.transaction_id, route: tx.route });
       Alert.alert('Coming soon', '', [{ text: 'OK' }]);
    }, []);

    const handleDeleteConfirm = useCallback(async (payload: DeletePayload) => {
        if (!deleteTarget) return;
        try {
            setActionLoading(true);
            await deleteTransaction(
                deleteTarget.transaction_id,
                deleteTarget.route,
                payload,
            );
            await refetch();
            setDeleteTarget(null);
        } catch (error: any) {
            console.error(error?.response?.data?.message ?? 'Delete failed.');
        } finally {
            setActionLoading(false);
        }
    }, [deleteTarget, refetch]);

    const handlePress = useCallback((tx: InventoryTransaction) => {
        setInventoryTransaction(tx);
        setReceiptModalVisible(true);
    }, []);

    const handleModalClosing = useCallback(() => {
        setInventoryTransaction(null);
        setReceiptModalVisible(false);
    }, []);

    const handleEndReached = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleOpenFilters = useCallback(() => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        const reset = { searchQuery: '', date: filters.date };
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
    const renderItem = useCallback(({ item: tx }: { item: InventoryTransaction }) => {
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
                {/* ── Hidden action buttons ── */}
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

                {/* ── Visible card ── */}
                <InventoryTransactionCard
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
            <DeleteTransactionDialog
                visible={!!deleteTarget}
                invoiceNumber={deleteTarget?.invoice_number}
                payments={(deleteTarget?.payments ?? []) as TransactionPayment[]}
                saleReturn={(deleteTarget?.sale_return ?? null) as TransactionSaleReturn | null}
                loading={actionLoading}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
            />

            <Header title={item?.label ?? 'Transactions'} navigation={navigation} />

            <Filter
                placeHolder="Search transactions..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

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
                    keyExtractor={(tx) => String(tx.transaction_id)}
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

            <FloatingFabButton  onPress={() => navigation.navigate('Billing')} />
            {/* Receipt modal */}
            <Modal
                visible={receiptModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleModalClosing}
                statusBarTranslucent
            >
                {inventoryTransaction && (
                    <TransactionSlip
                        transaction={inventoryTransaction}
                        visible={receiptModalVisible}
                        onClose={handleModalClosing}
                    />
                )}
            </Modal>

        </SafeAreaView>
    );
};

export default InventoryTransactionsScreen;

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