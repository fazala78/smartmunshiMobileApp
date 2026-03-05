import React, { useCallback, useState,useMemo } from 'react';
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


const JournalScreen = () => {
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showTransactionDocument, setShowTransactionDocument] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);


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

    const handleModalCloing = () => {
        setSelectedTransaction(null);
        setShowTransactionDocument(false);
    };

    const isTransactionType = (type: string): type is any =>
        Object.values(TRANSACTION_TYPES).includes(type as any);

    const isPaymentType = (type: string): type is PaymentType =>
        Object.values(PAYMENT_TYPES).includes(type as PaymentType);

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

                {/* ── Fixed: only the title bar ── */}
                <Header title="Journal" />

                {/* ── Single ScrollView: header block + cards all scroll together ── */}
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                >
                    {/* ── Scrollable header section (white) ── */}
                    <View style={styles.scrollableHeader}>

                        {/* 1. Search + advanced filter */}
                        <Filter
                            placeHolder="Search transactions..."
                            setFilters={setFilters}
                            filters={filters}
                            handleOpenFilters={handleOpenFilters}
                        />

                        {/* 2. Quick filter badges */}
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

                        {/* 3. Calendar / DatePicker */}
                        <DatePicker onDateChange={handleDateChange} />



                        {/* 5. Total Debit / Total Credit */}
                        <View style={styles.totalsRow}>
                            <View style={[styles.totalBox, styles.totalBoxDebit]}>
                                <Text style={styles.totalBoxLabel}>Total Debit</Text>
                                <Text style={styles.totalBoxAmountDebit}>
                                    {formatBalance(totals.totalDebit, transactions?.[0]?.transactions?.[0]?.[0]?.currency)}
                                </Text>
                            </View>
                            <View style={[styles.totalBox, styles.totalBoxCredit]}>
                                <Text style={[styles.totalBoxLabel, styles.totalBoxLabelCredit]}>
                                    Total Credit
                                </Text>
                                <Text style={styles.totalBoxAmountCredit}>
                                    {formatBalance(totals.totalCredit, transactions?.[0]?.transactions?.[0]?.[0]?.currency)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Transactions list ── */}
                    <View style={styles.transactionsSection}>

                        {/* Column headers */}
                        <View style={styles.columnHeaders}>
                            <Text style={[styles.colHeader, { flex: 1 }]}>Details</Text>
                            <Text style={[styles.colHeader, styles.colHeaderDebit]}>Debit</Text>
                            <Text style={[styles.colHeader, styles.colHeaderCredit]}>Credit</Text>
                        </View>

                        {isLoadingTransactions ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>Loading transactions...</Text>
                            </View>
                        ) : Array.isArray(transactions) && transactions.length > 0 ? (
                            transactions.map((journal) => (
                                <TouchableOpacity
                                    key={journal.key}
                                    style={styles.transactionCard}
                                    activeOpacity={0.8}
                                    onPress={() => handleSelectedTransaction(journal)}
                                >
                                    {/* Card header */}
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

                                    {/* Account rows with connector line */}
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
                                                                {/* D / C dot */}
                                                                <View
                                                                    style={[
                                                                        styles.dot,
                                                                        entry.debit ? styles.dotDebit : styles.dotCredit,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.dotText,
                                                                            entry.debit
                                                                                ? styles.dotTextDebit
                                                                                : styles.dotTextCredit,
                                                                        ]}
                                                                    >
                                                                        {entry.debit ? 'D' : 'C'}
                                                                    </Text>
                                                                </View>

                                                                {/* Account name */}
                                                                <Text
                                                                    style={[
                                                                        styles.accountName,
                                                                        !entry.debit && styles.accountNameCredit,
                                                                    ]}
                                                                >
                                                                    {entry.account}
                                                                </Text>

                                                                {/* Amounts */}
                                                                {entry.debit ? (
                                                                    <>
                                                                        <Text style={styles.debitAmount}>
                                                                            {formatBalance(entry.debit, entry.currency)}
                                                                        </Text>
                                                                        <Text style={styles.emptyAmount}>—</Text>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Text style={styles.emptyAmount}>—</Text>
                                                                        <Text style={styles.creditAmount}>
                                                                            {formatBalance(entry.credit, entry.currency)}
                                                                        </Text>
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
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No transactions found</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
                    <Icon name="add" size={28} color="#13ec5b" />
                </TouchableOpacity>

                {/* Bottom Navigation */}
                <BottomNavigation activeRoute="Journal" />

                {/* Filter Modal */}
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
                                setDraftFilters((prev: any) => ({
                                    ...prev,
                                    debitAccounts: value as string[],
                                }))
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
                                setDraftFilters((prev: any) => ({
                                    ...prev,
                                    creditAccounts: value as string[],
                                }))
                            }
                        />
                    </View>

                </FilterModal>
            </SafeAreaView>

            {/* Transaction document modals */}
            <Modal
                visible={showTransactionDocument}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTransactionDocument(false)}
                statusBarTranslucent
            >
                {selectedTransaction && selectedTransaction.route === 'expenses' && (
                    <ExpenseReceipt
                        visible={showTransactionDocument}
                        onClose={handleModalCloing}
                        transaction={selectedTransaction}
                    />
                )}
                {selectedTransaction && selectedTransaction.route === 'journals' && (
                    <JournalEntryReceipt
                        visible={showTransactionDocument}
                        onClose={handleModalCloing}
                        transaction={selectedTransaction}
                    />
                )}
                {selectedTransaction && selectedTransaction.route === 'bank-payment' && (
                    <BankPaymentReceipt
                        visible={showTransactionDocument}
                        onClose={handleModalCloing}
                        transaction={selectedTransaction}
                    />
                )}
                {selectedTransaction && isTransactionType(selectedTransaction.route) && (
                    <TransactionSlip
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalCloing}
                    />
                )}
                {selectedTransaction && isPaymentType(selectedTransaction.route) && (
                    <PaymentReceipt
                        transaction={selectedTransaction}
                        visible={showTransactionDocument}
                        onClose={handleModalCloing}
                    />
                )}
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    // ── Layout ────────────────────────────────────────────────
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // ── Scrollable header block ───────────────────────────────
    // Lives inside the ScrollView so it scrolls away with the cards.
    // White bg, zero margin at top/sides.
    scrollableHeader: {
        backgroundColor: '#fff',
        paddingHorizontal: 5,
        paddingTop: 10,
        paddingBottom: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },



    // ── Totals ────────────────────────────────────────────────
    totalsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 5,
    },
    totalBox: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
    },
    totalBoxDebit: {
        backgroundColor: 'rgba(236,253,245,0.5)',
        borderColor: 'rgba(167,243,208,0.5)',
    },
    totalBoxCredit: {
        backgroundColor: '#fff1f2',
        borderColor: '#ffe4e6',
    },
    totalBoxLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(5,150,105,0.8)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    totalBoxLabelCredit: {
        color: '#f43f5e',
    },
    totalBoxAmountDebit: {
        fontSize: 20,
        fontWeight: '900',
        color: '#059669',
        letterSpacing: -0.5,
    },
    totalBoxAmountCredit: {
        fontSize: 20,
        fontWeight: '900',
        color: '#e11d48',
        letterSpacing: -0.5,
    },

    // ── Quick filter badges ───────────────────────────────────
    badgesScroll: {
        marginHorizontal: -10,
    },
    badgesContent: {
        paddingHorizontal: 16,
        gap: 8,
        paddingBottom: 0,
    },
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 100,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    badgeActive: {
        backgroundColor: '#13ec5b',
        borderColor: '#13ec5b',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4b5563',
    },
    badgeTextActive: {
        color: '#111813',
    },

    // ── Transactions section ──────────────────────────────────
    transactionsSection: {
        backgroundColor: '#f8faf9',
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 120,
        gap: 10,
    },

    // ── Column headers ────────────────────────────────────────
    columnHeaders: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        opacity: 0.6,
        marginBottom: 2,
    },
    colHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    colHeaderDebit: {
        width: 68,
        textAlign: 'right',
        color: '#059669',
        marginRight: 4,
    },
    colHeaderCredit: {
        width: 68,
        textAlign: 'right',
        color: '#e11d48',
    },

    // ── Transaction card ──────────────────────────────────────
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        paddingBottom: 18,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
            },
            android: { elevation: 2 },
        }),
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    transactionTitleRow: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: -0.3,
    },
    transactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    transactionTime: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
    },

    // ── Account rows ──────────────────────────────────────────
    accountsContainer: {
        position: 'relative',
        gap: 14,
    },
    connectorLine: {
        position: 'absolute',
        left: 11,
        top: 12,
        bottom: 12,
        width: 1,
        backgroundColor: '#f3f4f6',
        zIndex: 0,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 10,
        zIndex: 1,
    },
    dot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        flexShrink: 0,
    },
    dotDebit: {
        backgroundColor: '#ecfdf5',
        borderColor: '#d1fae5',
    },
    dotCredit: {
        backgroundColor: '#fff1f2',
        borderColor: '#ffe4e6',
    },
    dotText: {
        fontSize: 9,
        fontWeight: '900',
    },
    dotTextDebit: {
        color: '#059669',
    },
    dotTextCredit: {
        color: '#f43f5e',
    },
    accountName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        textTransform: 'capitalize',
    },
    accountNameCredit: {
        color: '#94a3b8',
    },
    debitAmount: {
        width: 68,
        fontSize: 13,
        fontWeight: '700',
        color: '#059669',
        textAlign: 'right',
    },
    creditAmount: {
        width: 68,
        fontSize: 13,
        fontWeight: '700',
        color: '#e11d48',
        textAlign: 'right',
    },
    emptyAmount: {
        width: 68,
        fontSize: 13,
        color: '#e5e7eb',
        textAlign: 'right',
    },

    // ── FAB ───────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.textPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 30,
            },
            android: { elevation: 8 },
        }),
    },

    // ── States ────────────────────────────────────────────────
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: '#9ca3af',
    },

    // ── Filter modal helpers ──────────────────────────────────
    filterSection: {
        marginBottom: 15,
    },
});

export default JournalScreen;