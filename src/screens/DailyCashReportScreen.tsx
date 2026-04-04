import React, { useCallback, useState } from 'react';
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
import { getJournalTransactionType } from '../services/Journal';
import { useQuery } from '@tanstack/react-query';
import DatePicker from '../components/DatePicker';
import { formatBalance } from '../utils/currency';
import { underscoreToSpace } from '../utils/stringUtils';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import ExpenseReceipt from './modals/ExpenseReceipt';
import JournalEntryReceipt from './modals/JournalEntryReceipt';
import TransactionSlip from './modals/TransactionSlip';
import PaymentReceipt from './modals/PaymentReceipt';
import BankPaymentReceipt from './modals/BankPaymentReceipt';
import { TRANSACTION_TYPES } from '../constants/transactionTypes';
import { PAYMENT_TYPES, PaymentType } from '../constants/paymentTypes';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { queryParams } from '../types/journal';
import { getCashReport } from '../services/dailyCashReportService';
import useCurrency from '../utils/currency';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CashEntry, CashReportResponse } from '../types/dailyCashReport';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Types matching the API response
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

const DailyCashReportScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showTransactionDocument, setShowTransactionDocument] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<CashEntry | null>(null);
    const currency = useCurrency();

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

    // ── Filter handlers ───────────────────────────────────────────────────
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

    // ── Modal handlers ────────────────────────────────────────────────────
    const handleSelectedTransaction = (entry: CashEntry) => {
        if (entry.route != null) {
            setSelectedTransaction(entry);
            setShowTransactionDocument(true);
        }
    };

    const handleModalClosing = () => {
        setShowTransactionDocument(false);
        // Delay clearing so the modal fade-out still has data to render
        setTimeout(() => setSelectedTransaction(null), 300);
    };

    const handleAddExpense = () => {
        handleModalClosing();
        navigation.navigate('PayExpense');
    };

    const handleAddJournal = () => {
        handleModalClosing();
        navigation.navigate('JournalEntry');
    };

    const handleAddNewBankPayment = () => {
        handleModalClosing();
        navigation.navigate('BankTransaction');
    };

    // Read route BEFORE closing so selectedTransaction is still set
    const handleAddPayment = () => {
        const route = selectedTransaction?.route === 'receive-payments'
            ? 'ReceivePayment'
            : 'PayPayment';
        handleModalClosing();
        navigation.navigate(route);
    };

    // ── Modal type resolution (same logic as JournalScreen) ───────────────
    const isTransactionType = (type: string): type is any =>
        Object.values(TRANSACTION_TYPES).includes(type as any);

    const isPaymentType = (type: string): type is PaymentType =>
        Object.values(PAYMENT_TYPES).includes(type as PaymentType);

    const resolveModalType = (route: string | null | undefined): string | null => {
        if (!route) return null;
        if (route === 'expenses') return 'expenses';
        if (route === 'journals') return 'journals';
        if (route === 'bank-payment') return 'bank-payment';
        if (isPaymentType(route)) return 'payment';
        if (isTransactionType(route)) return 'transaction';
        return null;
    };

    const activeModalType = resolveModalType(selectedTransaction?.route);

    // ── Queries ───────────────────────────────────────────────────────────
    const { data: transactionTypes = [] } = useQuery<any[]>({
        queryKey: ['transactionTypes'],
        queryFn: getJournalTransactionType,
        staleTime: 1 * 60 * 1000,
    });

    const { data: report, isLoading } = useQuery<CashReportResponse>({
        queryKey: ['cashreport', filters],
        queryFn: () => getCashReport(filters),
        staleTime: 0.5 * 60 * 1000,
    });

    // ── Row renderer ──────────────────────────────────────────────────────
    const renderTableRows = (entries: CashEntry[], type: 'in' | 'out') =>
        entries.map((entry, idx) => {
            const amount = type === 'in' ? entry.debit : entry.credit;
            const isLast = idx === entries.length - 1;
            const isClickable = entry.route != null;

            return (
                <TouchableOpacity
                    key={entry.id}
                    activeOpacity={isClickable ? 0.7 : 1}
                    onPress={() => handleSelectedTransaction(entry)}
                    style={[
                        styles.tableRow,
                        idx % 2 === 1 && styles.tableRowAlt,
                        isLast && styles.tableRowLast,
                    ]}
                >
                    {/* Particulars + sub-text */}
                    <View style={{ flex: 1.6 }}>
                        <Text style={styles.tableCellPrimary} numberOfLines={1}>
                            {entry.particulars}
                        </Text>
                        <Text style={styles.tableCellSub}>
                            {underscoreToSpace(entry.transaction).toUpperCase()} · TRX {entry.transaction_id}
                        </Text>
                        {entry.description ? (
                            <Text style={styles.tableCellSub}>{entry.description}</Text>
                        ) : null}
                    </View>

                    {/* Date */}
                    <Text
                        style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}
                        numberOfLines={1}
                    >
                        {entry.date}
                    </Text>

                    {/* Amount */}
                    <Text
                        style={[
                            styles.tableCell,
                            styles.tableRight,
                            type === 'in' ? styles.tableCellIn : styles.tableCellOut,
                            { flex: 0.9 },
                        ]}
                    >
                        {formatBalance(amount ?? 0, currency)}
                    </Text>

                    {/* Chevron — only shown when row is tappable */}
                    {isClickable
                        ? <Icon name="chevron-right" size={16} color="#d1d5db" style={styles.rowChevron} />
                        : <View style={styles.rowChevronPlaceholder} />
                    }
                </TouchableOpacity>
            );
        });

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                <Header title="Daily Cash Report" navigation={null} />

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                >
                    {/* ── Filters & date ── */}
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

                        {/* ── Cash In / Cash Out cards ── */}
                        <View style={styles.totalsRow}>
                            <View style={[styles.totalBox, styles.totalBoxDebit]}>
                                <Text style={styles.totalBoxLabel}>Total Cash In</Text>
                                <Text style={styles.totalBoxAmountDebit}>
                                    {formatBalance(report?.total_cash_in ?? 0, currency)}
                                </Text>
                            </View>
                            <View style={[styles.totalBox, styles.totalBoxCredit]}>
                                <Text style={[styles.totalBoxLabel, styles.totalBoxLabelCredit]}>
                                    Total Cash Out
                                </Text>
                                <Text style={styles.totalBoxAmountCredit}>
                                    {formatBalance(report?.total_cash_out ?? 0, currency)}
                                </Text>
                            </View>
                        </View>

                        {/* ── Opening / Net / Closing balance strip ── */}
                        <View style={styles.balanceRow}>
                            <View style={styles.balanceItem}>
                                <Text style={styles.balanceLabel}>Opening</Text>
                                <Text style={styles.balanceValue}>
                                    {formatBalance(report?.opening_balance ?? 0, currency)}
                                </Text>
                            </View>

                            <View style={styles.balanceDivider} />

                            <View style={styles.balanceItem}>
                                <Text style={styles.balanceLabel}>Net Cash</Text>
                                <Text
                                    style={[
                                        styles.balanceValue,
                                        (report?.net_cash ?? 0) >= 0
                                            ? styles.balancePositive
                                            : styles.balanceNegative,
                                    ]}
                                >
                                    {(report?.net_cash ?? 0) >= 0 ? '+' : ''}
                                    {formatBalance(report?.net_cash ?? 0, currency)}
                                </Text>
                            </View>

                            <View style={styles.balanceDivider} />

                            <View style={styles.balanceItem}>
                                <Text style={styles.balanceLabel}>Closing</Text>
                                <Text
                                    style={[
                                        styles.balanceValue,
                                        (report?.closing_balance ?? 0) >= 0
                                            ? styles.balancePositive
                                            : styles.balanceNegative,
                                    ]}
                                >
                                    {formatBalance(report?.closing_balance ?? 0, currency)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Tables ── */}
                    {isLoading ? (
                        <View style={styles.loadingWrapper}>
                            <Loading />
                        </View>
                    ) : (
                        <View style={styles.transactionsSection}>

                            {/* ── SECTION 1 — Cash In ── */}
                            <View style={styles.sectionBlock}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionDot} />
                                    <Text style={styles.sectionTitle}>Cash In</Text>
                                    <View style={[styles.sectionBadge, styles.sectionBadgeIn]}>
                                        <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextIn]}>
                                            {report?.cash_in?.length ?? 0} entries
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.tableCard}>
                                    {/* Table header row — placeholder keeps columns aligned */}
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableHeader, { flex: 1.6 }]}>Particulars</Text>
                                        <Text style={[styles.tableHeader, { flex: 1, textAlign: 'center' }]}>Date</Text>
                                        <Text style={[styles.tableHeader, styles.tableRight, { flex: 0.9 }]}>Debit</Text>
                                        <View style={styles.rowChevronPlaceholder} />
                                    </View>

                                    {report?.cash_in?.length
                                        ? renderTableRows(report.cash_in, 'in')
                                        : <Empty title="No cash in entries" />
                                    }

                                    <View style={styles.tableFooterRow}>
                                        <Text style={[styles.tableFooterLabel, { flex: 2.6 }]}>Total Cash In</Text>
                                        <Text style={[styles.tableFooterAmount, styles.tableFooterIn, { flex: 0.9 }]}>
                                            {formatBalance(report?.total_cash_in ?? 0, currency)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* ── SECTION 2 — Cash Out ── */}
                            <View style={styles.sectionBlock}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionDot, styles.sectionDotOut]} />
                                    <Text style={styles.sectionTitle}>Cash Out</Text>
                                    <View style={[styles.sectionBadge, styles.sectionBadgeOut]}>
                                        <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextOut]}>
                                            {report?.cash_out?.length ?? 0} entries
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.tableCard}>
                                    {/* Table header row — placeholder keeps columns aligned */}
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableHeader, { flex: 1.6 }]}>Particulars</Text>
                                        <Text style={[styles.tableHeader, { flex: 1, textAlign: 'center' }]}>Date</Text>
                                        <Text style={[styles.tableHeader, styles.tableRight, { flex: 0.9 }]}>Credit</Text>
                                        <View style={styles.rowChevronPlaceholder} />
                                    </View>

                                    {report?.cash_out?.length
                                        ? renderTableRows(report.cash_out, 'out')
                                        : <Empty title="No cash out entries" />
                                    }

                                    <View style={styles.tableFooterRow}>
                                        <Text style={[styles.tableFooterLabel, { flex: 2.6 }]}>Total Cash Out</Text>
                                        <Text style={[styles.tableFooterAmount, styles.tableFooterOut, { flex: 0.9 }]}>
                                            {formatBalance(report?.total_cash_out ?? 0, currency)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                        </View>
                    )}
                </ScrollView>
                <BottomNavigation activeRoute="dailyCashReport" />

                <FilterModal
                    visible={showFilterModal}
                    title="Filter Cash Report"
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

            {/* ── Transaction modals — only one renders at a time via activeModalType ── */}
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
                        transaction={selectedTransaction as any}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddJournal}
                    />
                )}
                {selectedTransaction && activeModalType === 'bank-payment' && (
                    <BankPaymentReceipt
                        transaction={selectedTransaction as any}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                        onAddNew={handleAddNewBankPayment}
                    />
                )}
                {selectedTransaction && activeModalType === 'transaction' && (
                    <TransactionSlip
                        transaction={selectedTransaction as any}
                        visible={showTransactionDocument}
                        onClose={handleModalClosing}
                    />
                )}
                {selectedTransaction && activeModalType === 'payment' && (
                    <PaymentReceipt
                        transaction={selectedTransaction as any}
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
    container: { flex: 1, backgroundColor: colors.white },
    content: { flex: 1, backgroundColor: colors.white },
    loadingWrapper: { flex: 1, paddingTop: 40 },

    // ── Header ───────────────────────────────────────────────────────────
    scrollableHeader: {
        backgroundColor: colors.white ,
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
    totalBoxLabel: { fontSize: 10, fontWeight: '700', color: colors.primary , letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
    totalBoxLabelCredit: { color: colors.danger  },
    totalBoxAmountDebit: { fontSize: 20, fontWeight: '900', color: colors.primary , letterSpacing: -0.5 },
    totalBoxAmountCredit: { fontSize: 20, fontWeight: '900', color: colors.danger , letterSpacing: -0.5 },

    // ── Opening / Net / Closing strip ────────────────────────────────────
    balanceRow: {
        flexDirection: 'row',
        marginHorizontal: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#f8faf9',
        overflow: 'hidden',
    },
    balanceItem: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
    balanceDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
    balanceLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    balanceValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    balancePositive: { color: colors.primary  },
    balanceNegative: { color: colors.danger  },

    badgesScroll: { marginHorizontal: -10 },
    badgesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 0 },
    filterSection: { marginBottom: 15 },

    // ── Sections ─────────────────────────────────────────────────────────
    transactionsSection: {
        backgroundColor: '#f8faf9',
        paddingHorizontal: 10,
        paddingTop: 16,
        paddingBottom: 120,
        gap: 20,
    },
    sectionBlock: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
    sectionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    sectionDotOut: { backgroundColor: colors.danger },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2, flex: 1 },
    sectionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    sectionBadgeIn: { backgroundColor: 'rgba(236,253,245,0.8)', borderColor: '#d1fae5' },
    sectionBadgeOut: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
    sectionBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    sectionBadgeTextIn: { color: colors.primary },
    sectionBadgeTextOut: { color: colors.danger },

    // ── Table ─────────────────────────────────────────────────────────────
    tableCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20 },
            android: { elevation: 2 },
        }),
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    tableRowLast: { borderBottomWidth: 0 },
    tableHeaderRow: {
        backgroundColor: '#f8faf9',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableCell: { fontSize: 12, fontWeight: '500', color: '#374151' },
    tableCellPrimary: { fontSize: 12, fontWeight: '600', color: '#111827',textTransform:'capitalize' },
    tableCellSub: { fontSize: 10, fontWeight: '500', color: '#9ca3af', marginTop: 1 },
    tableHeader: { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase' },
    tableRight: { textAlign: 'right' },
    tableCellIn: { fontWeight: '700', color: colors.primary },
    tableCellOut: { fontWeight: '700', color: colors.danger },

    // 16px wide to match Icon size — keeps columns aligned with/without chevron
    rowChevron: { width: 16, marginLeft: 4 },
    rowChevronPlaceholder: { width: 20 },

    tableFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#f8faf9',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    tableFooterLabel: { fontSize: 11, fontWeight: '800', color: '#374151', letterSpacing: 0.5, textTransform: 'uppercase' },
    tableFooterAmount: { fontSize: 14, fontWeight: '900', textAlign: 'right', letterSpacing: -0.3 },
    tableFooterIn: { color: colors.primary },
    tableFooterOut: { color: colors.danger },
});

export default DailyCashReportScreen;