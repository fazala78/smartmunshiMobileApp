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
} from 'react-native';
import { getReceipt } from '../../services/transactionService';
import { useQuery } from '@tanstack/react-query';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ModalHeader from '../../components/ModalHeader';
import ModalFooter from '../../components/ModalFooter';
import { PaymentResource } from '../../types/receipt';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


interface TrItem {
  transaction_id: number;
  route: string;
  data:PaymentResource;
}
interface PaymentReceiptProps {
  visible: boolean;
  onClose: () => void;
  transaction: TrItem;
}

// Payment Receipt Component
const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  visible,
  onClose,
  transaction,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;


  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: 100,
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
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Fetch transaction details

  const hasRoute = !!transaction?.route;

  const { data: fetchedData, isLoading, isError } = useQuery({
    queryKey: ['transaction', transaction?.route, transaction?.transaction_id],
    queryFn: async () => getReceipt(transaction.route!, transaction.transaction_id),
    staleTime: 30 * 1000,
    enabled: visible && hasRoute,   // ← skip API if no route
  });

  // ── Resolve data — prefer fetched, fall back to passed data ───────────────
  // If no route, show transaction.data directly (no loading, no error)
  const data = hasRoute ? fetchedData : transaction?.data;
  const showLoader = hasRoute && isLoading;
  const showError = hasRoute && isError;


  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending':
        return '#13ec5b';
      case 'Cleared':
        return '#10b981';
      case 'Bounced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <TouchableOpacity
        style={styles.overlayTouchable}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Loading State */}
        {showLoader && <Loading />}

        {/* Error State */}
        {showError && <Error onClose={onClose} />}

        {/* Header with Close Button */}
        {!showLoader && !showError && data && (
          <>
            <ModalHeader title={data?.title} onClose={onClose} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scrollView}
            >
              {/* Success Icon and Amount */}
              <View style={styles.headerSection}>
                <Animated.View
                  style={[
                    styles.successIconContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Text style={styles.successIcon}>✓</Text>
                </Animated.View>

                <Text style={styles.successLabel}>PAYMENT SUCCESS</Text>
                <Text style={styles.amountText}>
                  {data.total_amount || ''}
                </Text>
              </View>

              {/* Transaction Details Card */}
              <View style={styles.detailsCard}>
                {/* Transaction ID */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <Text style={styles.detailValue}>Txn {data.id || ''}</Text>
                </View>

                {/* Date & Time */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={[styles.detailValue, styles.detailValueRight]}>
                    {data.date || ''} . {data.time || ''}
                  </Text>
                </View>

                {/* Contact Name */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Name</Text>
                  <Text style={styles.detailValue}>{data.contact?.name || ''}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Payment Breakdown */}
                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownTitle}>PAYMENT BREAKDOWN</Text>
                  <View style={styles.breakdownList}>
                    {data?.payment_methods.map((method, index) => (
                      <View key={index} style={styles.paymentMethodContainer}>
                        <View style={styles.paymentMethodRow}>
                          <View style={styles.paymentMethodLeft}>
                            <Text style={styles.paymentIcon}> <Icon name={method.icon} size={18} color="#6B7280" /></Text>
                            <Text style={styles.paymentLabel}>{method.label}</Text>
                          </View>
                          <Text style={styles.paymentAmount}>
                            {method.amount}
                          </Text>
                        </View>

                        {/* Cheque Details */}
                        {method.details && (
                          <View style={styles.chequeDetailsContainer}>
                            <View style={styles.chequeDetailsContent}>
                              <View style={styles.chequeDetailRow}>
                                {method.details.cheque_number ?
                                  <Text style={styles.chequeNumber}>
                                    NO: {method.details.cheque_number}
                                  </Text>
                                  : null}
                                {method.details.slip ?
                                  <Text style={styles.chequeNumber}>
                                    Ref: {method.details.slip}
                                  </Text>
                                  : null}
                                {method.details.status ?
                                  <Text
                                    style={[
                                      styles.chequeStatus,
                                      { color: getStatusColor(method.details.status) }
                                    ]}
                                  >
                                    {method.details.status.toUpperCase()}
                                  </Text>
                                  : null}
                              </View>
                              {method.details.due_date ?
                                <Text style={styles.chequeDueDate}>
                                  Due:{' '}
                                  <Text style={styles.chequeDueDateValue}>
                                    {method.details.due_date}
                                  </Text>
                                </Text>
                                : null}
                              {method.details.account ?
                                <Text style={styles.chequeNumber}>
                                  Account: {method.details.account}
                                </Text>
                                : null}
                              {method.details.remarks ?
                                <Text style={styles.chequeNumber}>
                                  Remarks:{' '}
                                  <Text style={styles.chequeDueDateValue}>
                                    {method.details.remarks}
                                  </Text>
                                </Text>
                                : null}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />
              </View>
            </ScrollView>


            {/* Footer - Invoice Style */}
            <ModalFooter />
          </>
        )}

        {/* Bottom Indicator */}
        <View style={styles.bottomIndicator} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },

  // Modal Container
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: SCREEN_HEIGHT * 0.99,
    height: SCREEN_HEIGHT * 0.99,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  // Loading/Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: '#dbe6df',
    borderRadius: 3,
  },





  // Scroll View
  scrollView: {
    flex: 0,
  },

  // Header Section
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(19, 236, 91, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 48,
    color: '#13ec5b',
    fontWeight: 'bold',
  },
  successLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 2,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111813',
    letterSpacing: -1,
  },

  // Details Card
  detailsCard: {
    marginHorizontal: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111813',
  },
  detailValueRight: {
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // Divider
  divider: {
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginVertical: 8,
  },

  // Breakdown Section
  breakdownSection: {
    marginTop: 12,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  breakdownList: {
    gap: 16,
  },
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentIcon: {
    fontSize: 18,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111813',
  },

  // Cheque Details
  chequeDetailsContainer: {
    marginTop: 6,
    marginLeft: 28,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(19, 236, 91, 0.2)',
    paddingLeft: 12,
  },
  chequeDetailsContent: {
    gap: 4,
  },
  chequeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chequeNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chequeStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  chequeDueDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chequeDueDateValue: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Bottom Indicator
  bottomIndicator: {
    width: 128,
    height: 6,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
  },
});

export default PaymentReceipt;