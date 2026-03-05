import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import { Contact, Transaction } from '../types/contact';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterBtn from '../components/ui/FilterBtn';
import ContactProfile from '../components/ui/ContactProfile';
import { colors } from '../theme';
import { getContactTransactions, getContactTransactionTypes } from '../services/contactService';
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

type Props = {
    route: {
        params: {
            contact: Contact;
        };
    };
};

const ContactLedger: React.FC<Props> = ({ route }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const flatListRef = useRef<FlatList>(null);
    const [filterVisible, setFilterVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [filters, setFilters] = useState({
        type: 'all',
        fromDate: '',
        toDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        type: 'all',
        fromDate: '',
        toDate: '',
    });
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [paymentType, setPaymentType] = useState<string>('');

    // Fetch contact types with TanStack Query
    const { data: contactTransactionType = [] } = useQuery({
        queryKey: ['contactTransactionTypes'],
        queryFn: getContactTransactionTypes,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const handlePayment = (value: string) => {
        setPaymentType(value);
        setPaymentModal(true)
    };


    const balanceColor = route.params.contact.balance < 0 ? colors.error : colors.primary;

    // Fetch transactions with infinite scroll
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
            console.log('🌐 Fetching transactions page:', pageParam, 'with filters:', filters);
            const filterParams = {
                page: pageParam,
                search: {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    type: filters.type,
                },
            };
            const response = await getContactTransactions(route.params.contact.id, filterParams);
            console.log('✅ Received transactions:', {
                count: response.data.length,
                page: response.pagination.currentPage,
            });
            return response;
        },
        getNextPageParam: (lastPage) => {
            const nextPage = lastPage.pagination.hasNextPage
                ? lastPage.pagination.currentPage + 1
                : undefined;
            console.log('🔢 Next page param:', nextPage);
            return nextPage;
        },
        initialPageParam: 1,
        staleTime: 30 * 1000,
        enabled: true,
    });

    // Flatten transactions from all pages and calculate running balance
    const transactionsWithBalance = useMemo(() => {
        const allTransactions = data?.pages.flatMap((page) => page.data) ?? [];

        if (allTransactions.length === 0) {
            return [];
        }

        let runningBalance = route.params.contact.balance;

        console.log('💰 Balance Calculation (Reverse):', {
            startingBalance: runningBalance,
            transactionCount: allTransactions.length,
        });

        const withBalances = allTransactions.map((transaction) => {
            const transactionBalance = runningBalance;
            runningBalance = runningBalance - (transaction.debit || 0) + (transaction.credit || 0);

            return {
                ...transaction,
                balance: transactionBalance,
            };
        });

        const openingBalance = withBalances[withBalances.length - 1]?.balance;
        console.log('✅ Verification:', {
            firstTransactionBalance: withBalances[0]?.balance,
            contactCurrentBalance: route.params.contact.balance,
            openingBalance: openingBalance,
        });

        console.log('📊 Total transactions:', withBalances.length);
        return withBalances;
    }, [data, route.params.contact.balance]);

    const handleLoadMore = useCallback(() => {
        console.log('🔄 Load More Triggered:', {
            hasNextPage,
            isFetchingNextPage,
            isLoading,
        });

        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            console.log('✅ Fetching next page...');
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const handleApplyFilters = useCallback(() => {
        setFilters(draftFilters);
        setFilterVisible(false);
    }, [draftFilters]);

    const handleClearFilters = useCallback(() => {
        const reset = {
            type: 'all',
            fromDate: '',
            toDate: '',
        };
        setDraftFilters(reset);
        setFilters(reset);
    }, []);

    const formatTransactionType = (value = '') => {
        return value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
        setStartDate(start);
        setEndDate(end);
        console.log('Selected range:', { start, end });

        setDraftFilters({
            ...draftFilters,
            fromDate: start ? start.toISOString().split('T')[0] : '',
            toDate: end ? end.toISOString().split('T')[0] : '',
        });
    };

    const FilterButton = ({ label, value, selected }: { label: string; value: string; selected: boolean }) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                selected && styles.filterButtonSelected
            ]}
            onPress={() => setDraftFilters({ ...draftFilters, type: value })}
        >
            <Text style={styles.filterButtonText}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const handleSelectedTransaction = (transaction: any) => {
        setSelectedTransaction(transaction);
        setModalVisible(true)

    }

    const handleModalCloing = () => {
        setSelectedTransaction(null);
        setModalVisible(false)

    }

    const renderTransaction = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => handleSelectedTransaction(item)}
            activeOpacity={0.8}
        >
            <View style={styles.transactionItem}>
                <View style={styles.transactionDescriptionContainer}>
                    <Text style={styles.transactionTypeText} numberOfLines={1}>
                        {formatTransactionType(item.transaction_type)} #{item.transaction_id}
                    </Text>

                    {item.lot && (
                        <Text style={styles.transactionDate}>
                            Lot# {item.lot.lot_number}
                        </Text>
                    )}
                    {item.cheque && (
                        <Text style={styles.transactionDate}>
                            Cheque #{item.cheque.cheque_number}, {item.cheque.clearing_date}
                        </Text>
                    )}
                    {item.bank && (
                        <Text style={styles.transactionDate}>
                            Online {item.bank.account_name}
                        </Text>
                    )}
                    {item.cash && (
                        <Text style={styles.transactionDate}>
                            {item.cash}
                        </Text>
                    )}
                    {item.journal && (
                        <><Text style={styles.transactionDate}>
                            {item.journal.associated_account}
                        </Text>
                            <Text style={styles.transactionDate}>
                                {item.journal.remarks}
                            </Text></>
                    )}
                    <Text style={styles.transactionDate}>
                        {item.date}
                    </Text>
                </View>

                <Text style={styles.debitAmount}>
                    {item.debit ? new Intl.NumberFormat('en-PK', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(item.debit) : null}
                </Text>

                <Text style={styles.creditAmount}>
                    {item.credit ? new Intl.NumberFormat('en-PK', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(item.credit) : null}
                </Text>

                <Text style={styles.balanceAmount}>
                    {new Intl.NumberFormat('en-PK', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(item.balance)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => {
        if (!isFetchingNextPage) return null;

        return (
            <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>
                    Loading more...
                </Text>
            </View>
        );
    };
    const isTransactionType = (type: string): type is TransactionType => {
        return Object.values(TRANSACTION_TYPES).includes(type as TransactionType);
    };



    const isPaymentType = (type: string): type is PaymentType => {
        return Object.values(PAYMENT_TYPES).includes(type as PaymentType);
    };

    return (
        <>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>‹</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        Contact Ledger
                    </Text>

                    <TouchableOpacity style={styles.downloadButton}>
                        <Text style={styles.downloadButtonText}>↓</Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <ContactProfile
                        avatar={route.params.contact.avatar}
                        name={route.params.contact.name}
                        type={route.params.contact.type}
                    />

                    <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                            {route.params.contact.name}
                        </Text>
                        <Text style={styles.contactPhone}>
                            {route.params.contact.phone}
                        </Text>
                    </View>

                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>
                            Current Balance
                        </Text>
                        <Text style={[styles.balanceAmountLarge, { color: balanceColor }]}>
                            {formatBalance(route.params.contact.balance, route.params.contact.currency)}
                        </Text>
                    </View>
                </View>

                {/* Filter Bar */}
                <View style={styles.filterBar}>
                    <View>
                        <Text style={styles.filterLabel}>
                            Recent Transactions
                        </Text>
                        <Text style={styles.filterSubtitle}>
                            Showing: {filters.type === 'all' ? 'All Types' : filters.type}
                            {filters.fromDate || filters.toDate ? ' (Filtered)' : ' All Time'}
                        </Text>
                    </View>
                    <FilterBtn onPress={() => {
                        setDraftFilters(filters);
                        setFilterVisible(true);
                    }} />
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={styles.columnHeader}>
                        Description
                    </Text>
                    <Text style={styles.columnHeaderRight}>
                        Debit
                    </Text>
                    <Text style={styles.columnHeaderRight}>
                        Credit
                    </Text>
                    <Text style={styles.columnHeaderRight}>
                        Bal.
                    </Text>
                </View>

                {/* Transactions List - INVERTED */}
                {/* Loading state */}
                {isLoading && transactionsWithBalance.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingMessage}>
                            Loading transactions...
                        </Text>
                    </View>
                ) : !isLoading && transactionsWithBalance.length === 0 ? (
                    /* Empty state */
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No transactions found</Text>
                        <Text style={styles.emptySubtitle}>
                            {filters.type !== 'all' || filters.fromDate || filters.toDate
                                ? 'Try adjusting your filters'
                                : 'No transactions available'}
                        </Text>
                    </View>
                ) : (
                    /* List */
                    <FlatList
                        ref={flatListRef}
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


                {/* Bottom Action Buttons */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={styles.creditButton}
                        activeOpacity={0.8}
                        onPress={() => handlePayment('paid')}
                    >
                        <Text style={styles.buttonIcon}>⊖</Text>
                        <Text style={styles.buttonText}>
                            Give Credit
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.receiveButton}
                        activeOpacity={0.8}
                        onPress={() => handlePayment('received')}
                    >
                        <Text style={styles.buttonIcon}>⊕</Text>
                        <Text style={styles.buttonText}>

                            Receive Pay
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Modal */}
                <Modal
                    visible={filterVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setFilterVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setFilterVisible(false)}
                        />

                        <View style={styles.modalContent}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Filters
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={() => setFilterVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Date Range Picker */}
                            <DateRangePicker
                                label="SELECT PERIOD"
                                startDate={startDate}
                                endDate={endDate}
                                onDateChange={handleDateChange}
                                placeholder="Choose dates"
                            />

                            {/* Transaction Type */}
                            <View style={styles.transactionTypeContainer}>
                                <Text style={styles.transactionTypeLabel}>
                                    Transaction Type
                                </Text>
                                <View style={styles.filterButtonsContainer}>
                                    {contactTransactionType.map((item: any) => (
                                        <View key={item.value} style={styles.filterButtonWrapper}>
                                            <FilterButton
                                                label={item.label}
                                                value={item.value}
                                                selected={draftFilters.type === item.value}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={handleClearFilters}
                                >
                                    <Text style={styles.clearButtonText}>
                                        Clear All
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.applyButton}
                                    onPress={handleApplyFilters}
                                >
                                    <Text style={styles.applyButtonText}>
                                        Apply Filter
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
                statusBarTranslucent
            >
                {selectedTransaction && selectedTransaction.route === 'expenses' && (
                    <ExpenseReceipt visible={modalVisible} onClose={() => handleModalCloing()} transaction={selectedTransaction}
                    />
                )}
                {selectedTransaction && selectedTransaction.route === 'journals' && (
                    <JournalEntryReceipt visible={modalVisible} onClose={() => handleModalCloing()} transaction={selectedTransaction}
                    />
                )}

                {selectedTransaction && isTransactionType(selectedTransaction.route) && (
                    <TransactionSlip
                        transaction={selectedTransaction}
                        visible={modalVisible}
                        onClose={() => handleModalCloing()}
                    />
                )}
                {selectedTransaction && isPaymentType(selectedTransaction.route) && (
                    <PaymentReceipt
                        transaction={selectedTransaction}
                        visible={modalVisible}
                        onClose={() => handleModalCloing()}
                    />
                )}
            </Modal>
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
                            <ReceivePaymentModal onDismiss={() => setPaymentModal(false)} contact={route.params.contact} ></ReceivePaymentModal>
                        )};
                        {paymentType === 'paid' && (
                            <PayPaymentModal onDismiss={() => setPaymentModal(false)} contact={route.params.contact} ></PayPaymentModal>
                        )};
                    </View></View>
            </Modal>


        </>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.backgroundOverlay, justifyContent: 'flex-end' },
    container: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%', overflow: 'hidden' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 5,
        backgroundColor: colors.white,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#111813',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111813',
        flex: 1,
        textAlign: 'center',
    },
    downloadButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 91, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    downloadButtonText: {
        fontSize: 20,
        color: colors.primary,
    },
    profileSection: {
        paddingHorizontal: 16,
        paddingVertical: 5,
        backgroundColor: colors.white,
        alignItems: 'center',
    },
    contactInfo: {
        alignItems: 'center',
        marginTop: 8,
    },
    contactName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111813',
        textTransform: 'capitalize',
    },
    contactPhone: {
        fontSize: 14,
        fontWeight: '500',
        color: '#61896f',
        marginTop: 4,
    },
    balanceContainer: {
        marginTop: 16,
        backgroundColor: colors.backgroundLight,
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#61896f',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    balanceAmountLarge: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 4,
    },
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.backgroundLight,
    },
    filterLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#61896f',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    filterSubtitle: {
        fontSize: 12,
        color: '#61896f',
        marginTop: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.backgroundLight,
    },
    columnHeader: {
        width: '40%',
        fontSize: 10,
        fontWeight: '700',
        color: '#61896f',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    columnHeaderRight: {
        width: '20%',
        fontSize: 10,
        fontWeight: '700',
        color: '#61896f',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundLight,
    },
    transactionDescriptionContainer: {
        width: '40%',
        paddingRight: 8,
    },
    transactionTypeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111813',
        textTransform: 'capitalize',
    },
    transactionDate: {
        fontSize: 10,
        color: '#61896f',
        marginTop: 2,
    },
    debitAmount: {
        width: '20%',
        fontSize: 12,
        fontWeight: '500',
        color: colors.primary,
        textAlign: 'right',
    },
    creditAmount: {
        width: '20%',
        fontSize: 12,
        fontWeight: '500',
        color: colors.error,
        textAlign: 'right',
    },
    balanceAmount: {
        width: '20%',
        fontSize: 12,
        fontWeight: '700',
        color: '#111813',
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingMessage: {
        marginTop: 12,
        fontSize: 16,
        color: '#61896f',
        fontWeight: '500',
    },
    listContent: {
        paddingTop: 50,
    },
    loadingHeader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#61896f',
        marginTop: 8,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111813',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#61896f',
        marginTop: 8,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.backgroundLight,
        gap: 12,
    },
    creditButton: {
        flex: 1,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error,
        borderRadius: 8,
        gap: 8,
    },
    receiveButton: {
        flex: 1,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 8,
        gap: 8,
    },
    buttonIcon: {
        fontSize: 20,
        color: colors.white,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111813',
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: '#111813',
    },
    transactionTypeContainer: {
        marginBottom: 24,
        marginTop: 80,
    },
    transactionTypeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 15,
    },
    filterButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterButtonWrapper: {
        width: '48%',
    },
    filterButton: {
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButtonSelected: {
        backgroundColor: 'rgba(19, 236, 91, 0.2)',
        borderWidth: 1,
        borderColor: '#13ec5b',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111813',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.backgroundLight,
    },
    clearButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111813',
    },
    applyButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#13ec5b',
        borderRadius: 12,
    },
    applyButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
    },
});

export default ContactLedger;