import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getExpense } from '../../services/transactionService';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import { useQuery } from '@tanstack/react-query';
import ModalFooter from '../../components/ModalFooter';
import { ExpenseSlip } from '../../types/receipt';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


interface TrItem {
  transaction_id: number;
  route: string;
  data: ExpenseSlip;

}
interface ExpenseReceiptProps {
  visible: boolean;
  onClose: () => void;
  transaction: TrItem;
}



const ExpenseReceipt: React.FC<ExpenseReceiptProps> = ({
  visible,
  onClose,
  transaction,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const hasRoute = !!transaction?.route;

  const { data: fetchedData, isLoading, isError } = useQuery({
    queryKey: ['transaction', transaction?.route, transaction?.transaction_id],
    queryFn: async () => getExpense(transaction.route!, transaction.transaction_id),
    staleTime: 30 * 1000,
    enabled: visible && hasRoute,   // ← skip API if no route
  });

  const data = hasRoute ? fetchedData : transaction?.data;
  const showLoader = hasRoute && isLoading;
  const showError = hasRoute && isError;




  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Loading State */}
        {showLoader && <Loading />}

        {/* Error State */}
        {showError && <Error onClose={onClose} />}

        {/* Top App Bar */}
        {!showLoader && !showError && data && (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#111813" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{data.title}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Expense Header */}
              <View style={styles.profileHeader}>
                <View style={styles.iconContainer}>
                  <Icon name="receipt-long" size={48} color="#13ec5b" />
                </View>
                <Text style={styles.successLabel}>EXPENSE PAID</Text>
                <Text style={styles.expenseId}>{data.amount}</Text>
              </View>

              {/* Transaction Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailsCard}>
                  {/* Date & Time */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date & Time</Text>
                    <Text style={styles.detailValue}>
                      {data.date}, {data.time}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>TRX</Text>
                    <Text style={styles.detailValue}>{data.id}</Text>
                  </View>

                  {/* Paid To */}
                  <View style={[styles.detailRow, styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{data.remarks}</Text>
                  </View>

                  {/* Category */}
                  <View style={[styles.detailRow, styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{data.debit_account}</Text>
                  </View>

                  {/* Payment Method */}
                  <View style={[styles.detailRow, styles.detailRowBorder]}>
                    <Icon name={data.icon} size={18} color="#9ca3af" />
                    <Text style={styles.detailLabel}>Credit Account</Text>
                    <View style={styles.paymentMethodContainer}>

                      <Text style={styles.detailValue}>{data.credit_account}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>


            <ModalFooter />
          </>
        )}

        {/* Safe Area Spacing */}
        <View style={styles.safeAreaBottom} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  // Modal Container
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  successLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 2,
    marginBottom: 4,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111813',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 48,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Profile Header / Expense Header
  profileHeader: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(19, 236, 91, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseId: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111813',
    letterSpacing: -0.3,
  },

  // Details Section
  detailsSection: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  detailsCard: {
    backgroundColor: '#f6f8f6',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111813',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Footer

  // Safe Area Bottom
  safeAreaBottom: {
    width: 128,
    height: 6,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
  },
});

export default ExpenseReceipt;