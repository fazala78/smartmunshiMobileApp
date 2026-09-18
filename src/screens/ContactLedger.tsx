import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
    ScrollView,
} from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { Contact, Transaction } from '../types/contact';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterBtn from '../components/ui/FilterBtn';
import ContactProfile from '../components/ui/ContactProfile';
import ChequeSummaryCards from '../components/ui/ChequeSummaryCards';
import { colors, typography } from '../theme';
import { getContactTransactions, getContactTransactionTypes, getContactChequeSummary } from '../services/contactService';
import { formatBalance } from '../utils/currency';
import DateRangePicker from '../components/ui/DateRangePicker';
import TransactionSlip from './modals/TransactionSlip';
import PaymentReceipt from './modals/PaymentReceipt';
import { TRANSACTION_TYPES, TransactionType } from '../constants/transactionTypes';
import { PAYMENT_TYPES, PaymentType } from '../constants/paymentTypes';
import JournalEntryReceipt from './modals/JournalEntryReceipt';
import ExpenseReceipt from './modals/ExpenseReceipt';
import ReceivePaymentModal from './modals/ReceivePaymentModal';
import PayPaymentModal from './modals/PayPaymentModal';
import Empty from '../components/common/Empty';
import { Badge } from '../components/ui/Badge';
import FilterModal from '../components/FilterModal';
import ContactLedgerDialog from './modals/ContactLedgerDialog';
import ContactChequeListModal from './modals/ContactChequeListModal';
import { toDateString } from '../utils/stringUtils';
import { ChequeSummaryItem } from '../types/contact';
import { ChequeStatus } from '../types/cheques';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    route: {
        params: {
            contact: Contact;
        };
    };
};

// ─── FilterButton ─────────────────────────────────────────────────────────────
// Extracted outside the screen component to prevent React from treating it as
// an unstable nested component (which triggers the "unstable_nested_components"
// warning and forces a full remount on every parent render).

interface FilterButtonProps {
    label: string;
    value: string;
    selected: boolean;
    onPress: (value: string) => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, value, selected, onPress }) => (
    <TouchableOpacity
        style={[styles.filterButton, selected && styles.filterButtonSelected]}
        onPress={() => onPress(value)}
    >
        <Text style={styles.filterButtonText}>{label}</Text>
    </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const ContactLedger: React.FC<Props> = ({ route }) => {

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const flatListRef = useRef<FlatList>(null);

    const [filterVisible, setFilterVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [paymentType, setPaymentType] = useState<string>('');

    const [filters, setFilters] = useState({
        type: 'all',
        fromDate: '',
        toDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({ ...filters });
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const [downloadModal, setDownloadModal] = useState(false);



    // ── Fetch contact transaction types ───────────────────────────────────────
    const { data: contactTransactionType = [] } = useQuery({
        queryKey: ['contactTransactionTypes'],
        queryFn: getContactTransactionTypes,
        staleTime: 5 * 60 * 1000,
    });

    // ── Fetch cheque summary cards (server decides the card set by contact type) ──
    const { data: chequeSummary = [], refetch: refetchChequeSummary } = useQuery({
        queryKey: ['contactChequeSummary', route.params.contact.id],
        queryFn: () => getContactChequeSummary(route.params.contact.id),
        staleTime: 30 * 1000,
    });

    // ── Cheque list modal (opened from any cheque-summary card that carries a cheque_status) ──
    const [chequeListModal, setChequeListModal] = useState<{ status: ChequeStatus; title: string } | null>(null);

    const handleChequeCardPress = useCallback((item: ChequeSummaryItem) => {
        if (!item.cheque_status) return;
        setChequeListModal({ status: item.cheque_status as ChequeStatus, title: item.label });
    }, []);

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
        queryKey: ['transactions', route.params.contact.id, filters],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
            const response = await getContactTransactions(route.params.contact.id, {
                page: pageParam,
                search: {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    type: filters.type,
                },
            });
            return response;
        },
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasNextPage
                ? lastPage.pagination.currentPage + 1
                : undefined,
        initialPageParam: 1,
        staleTime: 30 * 1000,
    });

    // ── Flatten + running balance ─────────────────────────────────────────────
    const transactionsWithBalance = useMemo(() => {
        const all = data?.pages.flatMap((page) => page.data) ?? [];
        if (all.length === 0) return [];

        let running = route.params.contact.balance;
        return all.map((tx) => {
            const balance = running;
            running = running - (tx.debit || 0) + (tx.credit || 0);
            return { ...tx, balance };
        });
    }, [data, route.params.contact.balance]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const balanceColor = route.params.contact.balance < 0 ? colors.error : colors.primary;

    // Mirrors ContactProfile's internal avatar accent-color logic so the ring
    // and type pill around it stay visually consistent.
    const accentColor = useMemo(() => {
        switch (route.params.contact.type) {
            case 'client': return colors.primary;
            case 'vendor': return colors.warning;
            case 'walk-in': return colors.info;
            default: return colors.warningDark;
        }
    }, [route.params.contact.type]);

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
        const reset = { type: '', fromDate: '', toDate: '' };
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

    // Stable callback passed to FilterButton — avoids inline arrow in JSX
    const handleFilterTypeChange = useCallback((value: string) => {
        setDraftFilters((prev) => ({ ...prev, type: value }));
    }, []);

    const handlePayment = useCallback((value: string) => {
        setPaymentType(value);
        setPaymentModal(true);
    }, []);

    const handleSelectedTransaction = useCallback((transaction: any) => {
        if (transaction.route && transaction.route !== null) {
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
    const renderTransaction = useCallback(({ item }: { item: any }) => (
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
                            <Badge status={item.cheque.action} />
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

    const renderHeader = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading more...</Text>
            </View>
        );
    }, [isFetchingNextPage]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}><Icon name="chevron-left" size={28} color={colors.gray900} /></Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Contact Ledger</Text>
                    <TouchableOpacity style={styles.downloadButton} onPress={() => setDownloadModal(true)}>
                        <Text style={styles.downloadButtonText}><Icon name="share" size={28} color={colors.gray900} /></Text>
                    </TouchableOpacity>
                </View>


                {/* Info block — capped height + internally scrollable so the
                    transaction list below always keeps at least ~1/3 of the screen. */}
                <ScrollView style={styles.topSection} showsVerticalScrollIndicator={false}>
                {/* Profile — compact card row */}
                <View style={styles.profileSection}>
                    <View style={[styles.avatarRing, { borderColor: accentColor }]}>
                        <ContactProfile
                            avatar={route.params.contact.avatar}
                            name={route.params.contact.name}
                            type={route.params.contact.type}
                        />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>{route.params.contact.name}</Text>
                        <View style={styles.contactMetaRow}>
                            {!!route.params.contact.type && (
                                <View style={[styles.typePill, { backgroundColor: accentColor + '1a' }]}>
                                    <Text style={[styles.typePillText, { color: accentColor }]}>
                                        {route.params.contact.type.replace('-', ' ').toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.contactPhone} numberOfLines={1}>{route.params.contact.phone}</Text>
                        </View>
                    </View>
                    <View style={[styles.balanceChip, { backgroundColor: balanceColor + '14' }]}>
                        <Icon
                            name={route.params.contact.balance < 0 ? 'trending-down' : 'trending-up'}
                            size={13}
                            color={balanceColor}
                        />
                        <View>
                            <Text style={styles.balanceLabel}>Balance</Text>
                            <Text style={[styles.balanceAmountCompact, { color: balanceColor }]} numberOfLines={1}>
                                {formatBalance(route.params.contact.balance, route.params.contact.currency)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Cheque summary — card set depends on contact type (vendor vs client/walk-in) */}
                <View style={styles.chequeSummarySection}>
                    <ChequeSummaryCards
                        items={chequeSummary}
                        currency={route.params.contact.currency}
                        onCardPress={handleChequeCardPress}
                    />
                </View>

                {/* Filter bar */}
                <View style={styles.filterBar}>
                    <Text style={styles.filterLabel} numberOfLines={1}>
                        {filters.type === 'all' ? 'All Types' : filters.type}
                        {filters.fromDate || filters.toDate ? ' · Filtered' : ' · All Time'}
                    </Text>
                    <FilterBtn onPress={() => { setDraftFilters(filters); setFilterVisible(true); }} />
                </View>

                {/* Table header */}
                <View style={styles.tableHeader}>
                    <Text style={styles.columnHeader}>Description</Text>
                    <Text style={styles.columnHeaderRight}>Debit</Text>
                    <Text style={styles.columnHeaderRight}>Credit</Text>
                    <Text style={styles.columnHeaderRight}>Bal.</Text>
                </View>
                </ScrollView>

                {/* List — explicit flex:1 so this section reliably claims all remaining
                    height instead of shrinking to content size under the fixed-height
                    header blocks above it. */}
                <View style={styles.listSection}>
                    {isLoading && transactionsWithBalance.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingMessage}>Loading transactions...</Text>
                        </View>
                    ) : !isLoading && transactionsWithBalance.length === 0 ? (
                        <Empty title="No Transaction found" />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            style={styles.transactionList}
                            data={transactionsWithBalance}
                            renderItem={renderTransaction}
                            keyExtractor={(item, index) => `transaction-${item.id}-${index}`}
                            inverted
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={1.3}
                            ListHeaderComponent={renderHeader}
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
                </View>

                {/* Bottom actions */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity style={styles.creditButton} activeOpacity={0.8} onPress={() => handlePayment('paid')}>
                        <Text style={styles.buttonIcon}>⊖</Text>
                        <Text style={styles.buttonText}>Give Credit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.receiveButton} activeOpacity={0.8} onPress={() => handlePayment('received')}>
                        <Text style={styles.buttonIcon}>⊕</Text>
                        <Text style={styles.buttonText}>Receive Pay</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter modal */}
                <FilterModal
                    visible={filterVisible}
                    title="Filter Contacts"
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
                    <View style={styles.transactionTypeContainer}>
                        <Text style={styles.transactionTypeLabel}>Transaction Type</Text>
                        <View style={styles.filterButtonsContainer}>
                            {contactTransactionType.map((item: any) => (
                                <View key={item.value} style={styles.filterButtonWrapper}>
                                    <FilterButton
                                        label={item.label}
                                        value={item.value}
                                        selected={draftFilters.type === item.value}
                                        onPress={handleFilterTypeChange}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
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
                            transaction={selectedTransaction}
                            visible={modalVisible}
                            onClose={handleModalClosing}
                            onAddNew={handleAddExpense}
                        />
                    )}
                    {selectedTransaction?.route === 'journals' && (
                        <JournalEntryReceipt
                            transaction={selectedTransaction}
                            visible={modalVisible}
                            onClose={handleModalClosing}
                            onAddNew={handleAddJournal}
                        />
                    )}
                    {selectedTransaction && isTransactionType(selectedTransaction.route) && (
                        <TransactionSlip
                            transaction={selectedTransaction}
                            visible={modalVisible}
                            onClose={handleModalClosing}
                        />
                    )}
                    {selectedTransaction && isPaymentType(selectedTransaction.route) && (
                        <PaymentReceipt
                            transaction={selectedTransaction}
                            visible={modalVisible}
                            onClose={handleModalClosing}
                            onAddNew={handleAddPayment}
                        />
                    )}
                </Modal>

                {/* Payment modal */}
                <Modal
                    visible={paymentModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setPaymentModal(false)}
                    statusBarTranslucent
                >
                    <View style={styles.overlay}>
                        <View style={styles.container}>
                            {paymentType === 'received' && (
                                <ReceivePaymentModal onDismiss={() => setPaymentModal(false)} contact={route.params.contact} />
                            )}
                            {paymentType === 'paid' && (
                                <PayPaymentModal onDismiss={() => setPaymentModal(false)} contact={route.params.contact} />
                            )}
                        </View>
                    </View>
                </Modal>
                {/* Ledger Download Modal */}

                <ContactLedgerDialog
                    visible={downloadModal}
                    onClose={() => setDownloadModal(false)}
                    contact={route.params.contact}
                />

                {/* Cheque list — drilled into from a "Pending"/"Partial" cheque-summary card */}
                {chequeListModal && (
                    <ContactChequeListModal
                        visible={!!chequeListModal}
                        contactId={route.params.contact.id}
                        status={chequeListModal.status}
                        title={chequeListModal.title}
                        currency={route.params.contact.currency}
                        onClose={() => setChequeListModal(null)}
                        onActionSuccess={() => refetchChequeSummary()}
                    />
                )}

            </SafeAreaView>
        </>
    );
};

export default ContactLedger;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.white },
    overlay: { flex: 1, backgroundColor: colors.backgroundOverlay, justifyContent: 'flex-end' },
    container: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '98%', overflow: 'hidden' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 5, backgroundColor: colors.white },
    backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    backButtonText: { fontSize: 24, color: '#111813' },
    headerTitle: {
        ...typography.heading1,
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    downloadButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    downloadButtonText: { fontSize: 20, color: colors.primary },

    // Capped so the transaction list below always keeps at least ~1/3 of the
    // screen; scrolls internally on the rare case its content exceeds this.
    topSection: { maxHeight: '65%', flexGrow: 0 },

    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 4,
        padding: 12,
        borderRadius: 18,
        backgroundColor: colors.white,
        gap: 10,
    },
    avatarRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    contactInfo: { flex: 1, minWidth: 0, gap: 4 },
    contactName: { fontSize: 15, fontWeight: '800', color: '#111813', textTransform: 'capitalize' },
    contactMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    typePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    contactPhone: { fontSize: 12, fontWeight: '500', color: '#61896f', flexShrink: 1 },
    balanceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14 },
    balanceLabel: { fontSize: 9, fontWeight: '700', color: '#61896f', letterSpacing: 1.2, textTransform: 'uppercase' },
    balanceAmountCompact: { fontSize: 15, fontWeight: '800', marginTop: 1 },

    chequeSummarySection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.white },

    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.backgroundLight },
    filterLabel: { fontSize: 12, fontWeight: '600', color: '#61896f', flexShrink: 1 },

    tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.backgroundLight },
    columnHeader: { width: '40%', fontSize: 10, fontWeight: '700', color: '#61896f', letterSpacing: 1.5, textTransform: 'uppercase' },
    columnHeaderRight: { width: '20%', fontSize: 10, fontWeight: '700', color: '#61896f', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'right' },

    transactionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.backgroundLight },
    transactionDescriptionContainer: { width: '40%', paddingRight: 8 },
    transactionTypeText: { fontSize: 14, fontWeight: '700', color: '#111813', textTransform: 'capitalize' },
    transactionDate: { fontSize: 10, color: '#61896f', marginTop: 2 },
    debitAmount: { width: '20%', fontSize: 12, fontWeight: '500', color: colors.primary, textAlign: 'right' },
    creditAmount: { width: '20%', fontSize: 12, fontWeight: '500', color: colors.error, textAlign: 'right' },
    balanceAmount: { width: '20%', fontSize: 12, fontWeight: '700', color: '#111813', textAlign: 'right' },

    listSection: { flex: 1 },
    transactionList: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingMessage: { marginTop: 12, fontSize: 16, color: '#61896f', fontWeight: '500' },
    listContent: { paddingTop: 50 },
    loadingHeader: { paddingVertical: 20, alignItems: 'center' },
    loadingText: { fontSize: 14, color: '#61896f', marginTop: 8 },

    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.backgroundLight, gap: 12 },
    creditButton: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error, borderRadius: 8, gap: 8 },
    receiveButton: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 8, gap: 8 },
    buttonIcon: { fontSize: 20, color: colors.white },
    buttonText: { fontSize: 14, fontWeight: '700', color: colors.white },

    transactionTypeContainer: { marginBottom: 24, marginTop: 16 },

    transactionTypeLabel: { fontSize: 10, fontWeight: '700', color: '#61896f', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
    filterButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterButtonWrapper: { width: '48%' },
    filterButton: { height: 44, borderRadius: 12, backgroundColor: colors.backgroundLight, justifyContent: 'center', alignItems: 'center' },
    filterButtonSelected: { backgroundColor: 'rgba(19, 236, 91, 0.2)', borderWidth: 1, borderColor: '#13ec5b' },
    filterButtonText: { fontSize: 14, fontWeight: '700', color: '#111813' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1 },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111813' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    closeButtonText: { fontSize: 20, color: '#111813' },
    modalActions: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.backgroundLight },
    clearButton: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    clearButtonText: { fontSize: 14, fontWeight: '700', color: '#111813' },
    applyButton: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#13ec5b', borderRadius: 12 },
    applyButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});