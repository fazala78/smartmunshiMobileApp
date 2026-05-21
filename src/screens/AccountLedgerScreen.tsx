import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Modal,
    StatusBar,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { AccountTransaction, BankAccount } from '../types/bankList';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterBtn from '../components/ui/FilterBtn';
import ContactProfile from '../components/ui/ContactProfile';
import { colors, typography } from '../theme';
import { formatBalance } from '../utils/currency';
import DateRangePicker from '../components/ui/DateRangePicker';
import TransactionSlip from './modals/TransactionSlip';
import PaymentReceipt from './modals/PaymentReceipt';
import { TRANSACTION_TYPES, TransactionType } from '../constants/transactionTypes';
import { PAYMENT_TYPES, PaymentType } from '../constants/paymentTypes';
import JournalEntryReceipt from './modals/JournalEntryReceipt';
import ExpenseReceipt from './modals/ExpenseReceipt';
import Empty from '../components/common/Empty';
import { Badge } from '../components/ui/Badge';
import FilterModal from '../components/FilterModal';
import { getAccountTransactions } from '../services/bankListService';
import { toDateString } from '../utils/stringUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    route: {
        params: {
            account: BankAccount;
        };
    };
};


// ─── Screen ───────────────────────────────────────────────────────────────────

const AccountLedgerScreen: React.FC<Props> = ({ route }) => {

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const flatListRef = useRef<FlatList>(null);
    const account = route.params.account;

    const [filterVisible, setFilterVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<AccountTransaction | null>(null);

    const [filters, setFilters] = useState({
        type: 'all',
        fromDate: '',
        toDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({ ...filters });
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

   

    // ── Infinite query ────────────────────────────────────────────────────────
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['accountTransactions', account.id, filters],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
            return getAccountTransactions(account.id, {
                page: pageParam,
                search: {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    type: filters.type,
                },
            });
        },
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasNextPage
                ? lastPage.pagination.currentPage + 1
                : undefined,
        initialPageParam: 1,
       // staleTime: 30 * 1000,
    });

    // ── Flatten + running balance ─────────────────────────────────────────────
    const transactionsWithBalance = useMemo(() => {
        const all = data?.pages.flatMap((page) => page.data) ?? [];
        if (all.length === 0) return [];

        let running = account.balance;
        return all.map((tx) => {
            const balance = running;
            running = running - (tx.debit ?? 0) + (tx.credit ?? 0);
            return { ...tx, balance };
        });
    }, [data, account.balance]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const balanceColor = account.balance < 0 ? colors.error : colors.primary;

    const formatTransactionType = (value = '') =>
        value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const isTransactionType = (type: string): type is TransactionType =>
        Object.values(TRANSACTION_TYPES).includes(type as TransactionType);

    const isPaymentType = (type: string): type is PaymentType =>
        Object.values(PAYMENT_TYPES).includes(type as PaymentType);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

    const handleRefresh = useCallback(() => refetch(), [refetch]);

    const handleResetFilters = useCallback(() => {
        const reset = { type: 'all', fromDate: '', toDate: '' };
        setDraftFilters(reset);
        setFilters(reset);
        setStartDate(undefined);
        setEndDate(undefined);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setFilters(draftFilters);
        setFilterVisible(false);
    }, [draftFilters]);

    const handleDateChange = useCallback((start: Date | undefined, end: Date | undefined) => {
        setStartDate(start);
        setEndDate(end);
        setDraftFilters((prev) => ({
            ...prev,
            fromDate: start ? toDateString(start) : '',
            toDate: end ? toDateString(end) : '',
        }));
    }, []);

  

    const handleSelectedTransaction = useCallback((transaction: AccountTransaction) => {
        if (transaction.route) {
            setSelectedTransaction(transaction);
            setModalVisible(true);
        }
    }, []);

    const handleModalClosing = useCallback(() => {
        setModalVisible(false);
        setTimeout(() => setSelectedTransaction(null), 300);
    }, []);

    const handleAddExpense = useCallback(() => {
        handleModalClosing();
        navigation.navigate('PayExpense');
    }, [handleModalClosing, navigation]);

    const handleAddJournal = useCallback(() => {
        handleModalClosing();
        navigation.navigate('JournalEntry');
    }, [handleModalClosing, navigation]);

    const handleAddPayment = useCallback(() => {
        const dest = selectedTransaction?.route === 'receive-payments'
            ? 'ReceivePayment'
            : 'PayPayment';
        handleModalClosing();
        navigation.navigate(dest);
    }, [handleModalClosing, navigation, selectedTransaction]);

    // ── Renderers ─────────────────────────────────────────────────────────────
    const renderTransaction = useCallback(({ item }: { item: AccountTransaction & { balance: number } }) => (
        <TouchableOpacity onPress={() => handleSelectedTransaction(item)} activeOpacity={0.8}>
            <View style={styles.transactionItem}>

                <View style={styles.transactionDescriptionContainer}>
                    <Text style={styles.transactionTypeText} numberOfLines={1}>
                        {formatTransactionType(item.transaction_type)} #{item.transaction_id}
                    </Text>

                    {item.lot && (
                        <Text style={styles.transactionDate}>Lot# {item.lot.lot_number}</Text>
                    )}

                    {item.cheque && (
                        <>
                            <Badge status={item.cheque?.action ?? ''} />
                            <Text style={styles.transactionDate}>Cheque No# {item.cheque.cheque_number}</Text>
                            <Text style={styles.transactionDate}>Clearing Date: {item.cheque.clearing_date}</Text>
                        </>
                    )}

                    {item.bank && (
                        <>
                            <Badge status="online" />
                            <Text style={styles.transactionDate}>{item.bank.account_name}</Text>
                        </>
                    )}

                    {item.cash && <Badge status="cash" />}

                    {item.journal && (
                        <>
                            <Text style={styles.transactionDate}>{item.journal.associated_account}</Text>
                            <Text style={styles.transactionDate}>{item.journal.remarks}</Text>
                        </>
                    )}

                    <Text style={styles.transactionDate}>{item.date}</Text>
                </View>

                <Text style={styles.debitAmount}>
                    {item.debit
                        ? new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.debit)
                        : null}
                </Text>

                <Text style={styles.creditAmount}>
                    {item.credit
                        ? new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.credit)
                        : null}
                </Text>

                <Text style={styles.balanceAmount}>
                    {new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.balance)}
                </Text>

            </View>
        </TouchableOpacity>
    ), [handleSelectedTransaction]);

    const renderFooter = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading more...</Text>
            </View>
        );
    }, [isFetchingNextPage]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="chevron-left" size={28} color={colors.gray900} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Ledger</Text>
                <View style={styles.backButton} />
            </View>

            {/* Account Profile */}
            <View style={styles.profileSection}>
                <ContactProfile name={account.name} />
                <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountCode}>{account.bank?.name}</Text>
                </View>
                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={[styles.balanceAmountLarge, { color: balanceColor }]}>
                        {formatBalance(account.balance)}
                    </Text>
                </View>
            </View>

            {/* Filter bar */}
            <View style={styles.filterBar}>
                <View>
                    <Text style={styles.filterLabel}>Recent Transactions</Text>
                    <Text style={styles.filterSubtitle}>
                        {filters.type === 'all' ? 'All Types' : filters.type}
                        {filters.fromDate || filters.toDate ? ' · Filtered' : ' · All Time'}
                    </Text>
                </View>
                <FilterBtn onPress={() => { setDraftFilters(filters); setFilterVisible(true); }} />
            </View>

            {/* Table header */}
            <View style={styles.tableHeader}>
                <Text style={styles.columnHeader}>Description</Text>
                <Text style={styles.columnHeaderRight}>Debit</Text>
                <Text style={styles.columnHeaderRight}>Credit</Text>
                <Text style={styles.columnHeaderRight}>Bal.</Text>
            </View>

            {/* List */}
            {isLoading && transactionsWithBalance.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingMessage}>Loading transactions...</Text>
                </View>
            ) : !isLoading && transactionsWithBalance.length === 0 ? (
                <Empty title="No transactions found" />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={transactionsWithBalance}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    inverted
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={1.3}
                    ListHeaderComponent={renderFooter}
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
                visible={filterVisible}
                title="Filter Transactions"
                onClose={() => setFilterVisible(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <DateRangePicker
                    label="SELECT PERIOD"
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={handleDateChange}
                    placeholder="Choose dates"
                />
               
            </FilterModal>

            {/* Transaction detail modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleModalClosing}
                statusBarTranslucent
            >
                {selectedTransaction?.route === 'expenses' && (
                    <ExpenseReceipt
                        transaction={selectedTransaction as any}
                        visible={modalVisible}
                        onClose={handleModalClosing}
                        onAddNew={handleAddExpense}
                    />
                )}
                {selectedTransaction?.route === 'journals' && (
                    <JournalEntryReceipt
                        transaction={selectedTransaction as any}
                        visible={modalVisible}
                        onClose={handleModalClosing}
                        onAddNew={handleAddJournal}
                    />
                )}
                {selectedTransaction && isTransactionType(selectedTransaction.route) && (
                    <TransactionSlip
                        transaction={selectedTransaction as any}
                        visible={modalVisible}
                        onClose={handleModalClosing}
                    />
                )}
                {selectedTransaction && isPaymentType(selectedTransaction.route) && (
                    <PaymentReceipt
                        transaction={selectedTransaction as any}
                        visible={modalVisible}
                        onClose={handleModalClosing}
                        onAddNew={handleAddPayment}
                    />
                )}
            </Modal>

        </SafeAreaView>
    );
};

export default AccountLedgerScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.white },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 5, backgroundColor: colors.white },
    backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...typography.heading1, color: colors.textPrimary, flex: 1, textAlign: 'center' },

    profileSection: { paddingHorizontal: 16, paddingVertical: 5, backgroundColor: colors.white, alignItems: 'center' },
    accountInfo: { alignItems: 'center', marginTop: 8 },
    accountName: { fontSize: 20, fontWeight: '700', color: colors.gray900, textTransform: 'capitalize' },
    accountCode: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginTop: 4 },
    balanceContainer: { marginTop: 16, backgroundColor: colors.backgroundLight, width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },
    balanceLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' },
    balanceAmountLarge: { fontSize: 28, fontWeight: '700', marginTop: 4 },

    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.backgroundLight },
    filterLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' },
    filterSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

    tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.backgroundLight },
    columnHeader: { width: '40%', fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' },
    columnHeaderRight: { width: '20%', fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'right' },

    transactionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.backgroundLight },
    transactionDescriptionContainer: { width: '40%', paddingRight: 8 },
    transactionTypeText: { fontSize: 14, fontWeight: '700', color: colors.gray900, textTransform: 'capitalize' },
    transactionDate: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    debitAmount: { width: '20%', fontSize: 12, fontWeight: '500', color: colors.primary, textAlign: 'right' },
    creditAmount: { width: '20%', fontSize: 12, fontWeight: '500', color: colors.error, textAlign: 'right' },
    balanceAmount: { width: '20%', fontSize: 12, fontWeight: '700', color: colors.gray900, textAlign: 'right' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingMessage: { marginTop: 12, fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    listContent: { paddingTop: 50 },
    loadingFooter: { paddingVertical: 20, alignItems: 'center' },
    loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },

    transactionTypeContainer: { marginBottom: 24, marginTop: 16 },
    transactionTypeLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
    filterButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterButtonWrapper: { width: '48%' },
    filterButton: { height: 44, borderRadius: 12, backgroundColor: colors.backgroundLight, justifyContent: 'center', alignItems: 'center' },
    filterButtonSelected: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary },
    filterButtonText: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
});
