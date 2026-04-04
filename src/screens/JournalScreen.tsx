import React, { useCallback, useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Modal,
    Platform,
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import Header from '../components/ui/Header';
import Filter from '../components/Filter';
import FilterModal from '../components/FilterModal';
import ApiDropdown from '../components/ui/ApiDropdown';
import MultiSelectFilter from '../components/MultiSelectChips';
import { getJournalEntries, getJournalTransactionType } from '../services/Journal';
import { useQuery } from '@tanstack/react-query';
import DatePicker from '../components/DatePicker';
import { formatBalance } from '../utils/currency';
import { underscoreToSpace } from '../utils/stringUtils';
import ExpenseReceipt from './modals/ExpenseReceipt';
import JournalEntryReceipt from './modals/JournalEntryReceipt';
import TransactionSlip from './modals/TransactionSlip';
import { TRANSACTION_TYPES } from '../constants/transactionTypes';
import PaymentReceipt from './modals/PaymentReceipt';
import { PAYMENT_TYPES, PaymentType } from '../constants/paymentTypes';
import { queryParams, TransactionItem } from '../types/journal';
import BankPaymentReceipt from './modals/BankPaymentReceipt';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import { Currency } from '../types/Currency';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { FloatingFabButton } from '../components/ui/FloatingFabButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const JournalScreen = () => {
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showTransactionDocument, setShowTransactionDocument] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
    const navigation = useNavigation<NavigationProp>();

    const [filters, setFilters] = useState<queryParams>({
        searchQuery: '',
        transactionTypes: [],
        debitAccounts: [],
        creditAccounts: [],
    });
    const [draftFilters, setDraftFilters] = useState<queryParams>({
        searchQuery: '',
        transactionTypes: [],
        debitAccounts: [],
        creditAccounts: [],
    });

    const handleOpenFilters = useCallback(() => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        const resetState: queryParams = {
            searchQuery: '',
            transactionTypes: [],
            debitAccounts: [],
            creditAccounts: [],
            date: filters.date,
        };
        setDraftFilters(resetState);
        setFilters(resetState);
    }, [filters.date]);

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    };

    const handleTrTypeChange = (newSelection: string[]) => {
        setFilters((prev: any) => ({ ...prev, transactionTypes: newSelection }));
    };

    const handleDateChange = (date: string) => {
        setFilters((prev: any) => ({ ...prev, date }));
    };

    const handleSelectedTransaction = (entry: any) => {
        if (entry.route != null) {
            setSelectedTransaction(entry);
            setShowTransactionDocument(true);
        }
    };

    const handleModalClosing = () => {
        setShowTransactionDocument(false);
        // Delay clearing selectedTransaction so the modal's exit animation
        // still has the data to render during its fade-out.
        setTimeout(() => setSelectedTransaction(null), 300);
    };

    const handleAddNewBankPayment = () => {
        handleModalClosing();
        navigation.navigate('BankTransaction');
    };

    // FIX: compute the target route BEFORE closing the modal so
    // selectedTransaction is still set when the value is read.
    const handleAddPayment = () => {
        const route = selectedTransaction?.route === 'receive-payments'
            ? 'ReceivePayment'
            : 'PayPayment';
        handleModalClosing();
        navigation.navigate(route);
    };

    const handleAddExpense = () => {
        handleModalClosing();
        navigation.navigate('PayExpense');
    };

     const handleAddJournal = () => {
        handleModalClosing();
        navigation.navigate('JournalEntry');
    };

     const handleAddJournalEntry = useCallback(() => {
        navigation.navigate('JournalEntry');
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    

    const isTransactionType = (type: string): type is any =>
        Object.values(TRANSACTION_TYPES).includes(type as any);

    const isPaymentType = (type: string): type is PaymentType =>
        Object.values(PAYMENT_TYPES).includes(type as PaymentType);

    // FIX: derive a single modal key so only one receipt renders at a time.
    // Priority order: explicit named routes first, then type-checked routes.
    const resolveModalType = (route: string | undefined): string | null => {
        if (!route) return null;
        if (route === 'expenses') return 'expenses';
        if (route === 'journals') return 'journals';
        if (route === 'bank-payment') return 'bank-payment';
        if (isPaymentType(route)) return 'payment';       // check payment before transaction
        if (isTransactionType(route)) return 'transaction';
        return null;
    };

    const activeModalType = resolveModalType(selectedTransaction?.route);

    const { data: transactionTypes = [] } = useQuery<any[]>({
        queryKey: ['transactionTypes'],
        queryFn: getJournalTransactionType,
        staleTime: 1 * 60 * 1000,
    });

    const { data: transactions, isLoading: isLoadingTransactions } = useQuery<TransactionItem[]>({
        queryKey: ['transactions', filters],
        queryFn: () => getJournalEntries(filters),
        staleTime: 0.5 * 60 * 1000,
    });

    const calculateTotals = (data: TransactionItem[] = []) => {
        let totalDebit = 0;
        let totalCredit = 0;

        data.forEach(journal => {
            journal.transactions?.forEach(pair => {
                pair?.forEach(entry => {
                    totalDebit += Number(entry.debit) || 0;
                    totalCredit += Number(entry.credit) || 0;
                });
            });
        });

        return { totalDebit, totalCredit };
    };

    const totals = useMemo(() => {
        return calculateTotals(transactions || []);
    }, [transactions]);


    return (
        <>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                <Header title='Journal' navigation={null} />

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                >
                    <View style={styles.scrollableHeader}>
                        <Filter
                            placeHolder="Search transactions..."
                            setFilters={setFilters}
                            filters={filters}
                            handleOpenFilters={handleOpenFilters}
                        />
                        <DatePicker onDateChange={handleDateChange} />

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.badgesScroll}
                            contentContainerStyle={styles.badgesContent}
                            nestedScrollEnabled
                        >
                            <MultiSelectFilter
                                options={transactionTypes || []}
                                selectedValues={filters.transactionTypes}
                                onSelectionChange={handleTrTypeChange}
                                valueKey="value"
                                labelKey="label"
                            />
                        </ScrollView>

                        <View style={styles.totalsRow}>
                            <View style={[styles.totalBox, styles.totalBoxDebit]}>
                                <Text style={styles.totalBoxLabel}>Total Debit</Text>
                                <Text style={styles.totalBoxAmountDebit}>
                                    {formatBalance(totals.totalDebit, transactions?.[0]?.transactions?.[0]?.[0]?.currency as Currency)}
                                </Text>
                            </View>
                            <View style={[styles.totalBox, styles.totalBoxCredit]}>
                                <Text style={[styles.totalBoxLabel, styles.totalBoxLabelCredit]}>
                                    Total Credit
                                </Text>
                                <Text style={styles.totalBoxAmountCredit}>
                                    {formatBalance(totals.totalCredit, transactions?.[0]?.transactions?.[0]?.[0]?.currency as Currency)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.transactionsSection}>
                        <View style={styles.columnHeaders}>
                            <Text style={[styles.colHeader, { flex: 1 }]}>Details</Text>
                            <Text style={[styles.colHeader, styles.colHeaderDebit]}>Debit</Text>
                            <Text style={[styles.colHeader, styles.colHeaderCredit]}>Credit</Text>
                        </View>

                        {isLoadingTransactions ? (
                            <Loading />
                        ) : Array.isArray(transactions) && transactions.length > 0 ? (
                            transactions.map((journal) => (
                                <TouchableOpacity
                                    key={journal.key}
                                    style={styles.transactionCard}
                                    activeOpacity={0.8}
                                    onPress={() => handleSelectedTransaction(journal)}
                                >
                                    <View style={styles.transactionHeader}>
                                        <View style={styles.transactionTitleRow}>
                                            <Text style={styles.transactionTitle}>
                                                {underscoreToSpace(journal.tr_type).toUpperCase()} {'TRX '}
                                                {journal.transaction_id}
                                            </Text>
                                        </View>
                                        <View style={styles.transactionMeta}>
                                            <Text style={styles.transactionTime}>{journal.time}</Text>
                                            <Icon name="chevron-right" size={20} color="#d1d5db" />
                                        </View>
                                    </View>

                                    <View style={styles.accountsContainer}>
                                        <View style={styles.connectorLine} />
                                        {(journal.transactions || []).map(
                                            (transactionPair: any, pairIndex: any) => (
                                                <React.Fragment key={`${journal.key}-pair-${pairIndex}`}>
                                                    {(transactionPair || []).map(
                                                        (entry: any, entryIndex: any) => (
                                                            <View
                                                                key={`${journal.key}-${entry.id}-${pairIndex}-${entryIndex}`}
                                                                style={styles.accountRow}
                                                            >
                                                                <View style={[styles.dot, entry.debit ? styles.dotDebit : styles.dotCredit]}>
                                                                    <Text style={[styles.dotText, entry.debit ? styles.dotTextDebit : styles.dotTextCredit]}>
                                                                        {entry.debit ? 'D' : 'C'}
                                                                    </Text>
                                                                </View>
                                                                <Text style={[styles.accountName, !entry.debit && styles.accountNameCredit]}>
                                                                    {entry.account}
                                                                </Text>
                                                                {entry.debit ? (
                                                                    <>
                                                                        <Text style={styles.debitAmount}>{formatBalance(entry.debit, entry.currency)}</Text>
                                                                        <Text style={styles.emptyAmount}>—</Text>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Text style={styles.emptyAmount}>—</Text>
                                                                        <Text style={styles.creditAmount}>{formatBalance(entry.credit, entry.currency)}</Text>
                                                                    </>
                                                                )}
                                                            </View>
                                                        )
                                                    )}
                                                </React.Fragment>
                                            )
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Empty title="No Transaction found" />
                        )}
                    </View>
                </ScrollView>

                <FloatingFabButton onPress={handleAddJournalEntry} />

                

                <BottomNavigation activeRoute="Journal" />

                <FilterModal
                    visible={showFilterModal}
                    title="Filter Journal Entries"
                    onClose={() => setShowFilterModal(false)}
                    onReset={handleResetFilters}
                    onApply={handleApplyFilters}
                >
                    <View style={styles.filterSection}>
                        <ApiDropdown
                            label="Debit Account"
                            url="/search-account"
                            value={draftFilters.debitAccounts}
                            multiple
                            zIndex={2000}
                            onValueChange={(value) =>
                                setDraftFilters((prev: any) => ({ ...prev, debitAccounts: value as string[] }))
                            }
                        />
                    </View>
                    <View style={styles.filterSection}>
                        <ApiDropdown
                            label="Credit Account"
                            url="/search-account"
                            value={draftFilters.creditAccounts}
                            multiple
                            onValueChange={(value) =>
                                setDraftFilters((prev: any) => ({ ...prev, creditAccounts: value as string[] }))
                            }
                        />
                    </View>
                </FilterModal>
            </SafeAreaView>

            {/* Transaction document modals — only one renders at a time via activeModalType */}
            <Modal
                visible={showTransactionDocument}
                transparent
                animationType="fade"
                onRequestClose={handleModalClosing}
                statusBarTranslucent
            >
                {selectedTransaction && activeModalType === 'expenses' && (
                    <ExpenseReceipt
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddExpense}
                    />
                )}
                {selectedTransaction && activeModalType === 'journals' && (
                    <JournalEntryReceipt
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddJournal}
                    />
                )}
                {selectedTransaction && activeModalType === 'bank-payment' && (
                    <BankPaymentReceipt
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddNewBankPayment}
                    />
                )}
                {selectedTransaction && activeModalType === 'transaction' && (
                    <TransactionSlip
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                    />
                )}
                {selectedTransaction && activeModalType === 'payment' && (
                    <PaymentReceipt
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddPayment}
                    />
                )}
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { flex: 1, backgroundColor: '#fff' },

    scrollableHeader: {
        backgroundColor: '#fff',
        paddingHorizontal: 5,
        paddingTop: 10,
        paddingBottom: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    totalsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 5 },
    totalBox: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1 },
    totalBoxDebit: { backgroundColor: 'rgba(236,253,245,0.5)', borderColor: 'rgba(167,243,208,0.5)' },
    totalBoxCredit: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
    totalBoxLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(5,150,105,0.8)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
    totalBoxLabelCredit: { color: '#f43f5e' },
    totalBoxAmountDebit: { fontSize: 20, fontWeight: '900', color: '#059669', letterSpacing: -0.5 },
    totalBoxAmountCredit: { fontSize: 20, fontWeight: '900', color: '#e11d48', letterSpacing: -0.5 },

    badgesScroll: { marginHorizontal: -10 },
    badgesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 0 },
    badge: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
    badgeActive: { backgroundColor: '#13ec5b', borderColor: '#13ec5b' },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
    badgeTextActive: { color: '#111813' },

    transactionsSection: { backgroundColor: '#f8faf9', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 120, gap: 10 },

    columnHeaders: { flexDirection: 'row', paddingHorizontal: 4, opacity: 0.6, marginBottom: 2 },
    colHeader: { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase' },
    colHeaderDebit: { width: 68, textAlign: 'right', color: '#059669', marginRight: 4 },
    colHeaderCredit: { width: 68, textAlign: 'right', color: '#e11d48' },

    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        paddingBottom: 18,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20 },
            android: { elevation: 2 },
        }),
    },
    transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    transactionTitleRow: { flex: 1 },
    transactionTitle: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    transactionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    transactionTime: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },

    accountsContainer: { position: 'relative', gap: 14 },
    connectorLine: { position: 'absolute', left: 11, top: 12, bottom: 12, width: 1, backgroundColor: '#f3f4f6', zIndex: 0 },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 10, zIndex: 1 },
    dot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
    dotDebit: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
    dotCredit: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
    dotText: { fontSize: 9, fontWeight: '900' },
    dotTextDebit: { color: '#059669' },
    dotTextCredit: { color: '#f43f5e' },
    accountName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
    accountNameCredit: { color: '#94a3b8' },
    debitAmount: { width: 68, fontSize: 13, fontWeight: '700', color: '#059669', textAlign: 'right' },
    creditAmount: { width: 68, fontSize: 13, fontWeight: '700', color: '#e11d48', textAlign: 'right' },
    emptyAmount: { width: 68, fontSize: 13, color: '#e5e7eb', textAlign: 'right' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 14, color: '#9ca3af' },
    filterSection: { marginBottom: 15 },
});

export default JournalScreen;