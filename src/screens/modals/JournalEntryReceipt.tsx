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
import Icon from 'react-native-vector-icons/MaterialIcons';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme';
import { formatBalance } from '../../utils/currency';
import ModalHeader from '../../components/ModalHeader';
import ModalFooter from '../../components/ModalFooter';
import { fetchJournalEntry, getJournalEntry } from '../../services/journalEntryService';
import { sharePDF } from '../../services/shareService';
import { iosSharePDF } from '../../services/iosShareService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


interface TrItem {
  transaction_id: number;
  route: string;

}

interface JournalEntryReceiptProps {
  visible: boolean;
   onClose: () => void;
   transaction: TrItem;
   onAddNew: () => void;
}

const JournalEntryReceipt: React.FC<JournalEntryReceiptProps> = ({
  visible,
  onClose,
  transaction,
  onAddNew,
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
  }, [visible, slideAnim, opacityAnim, scaleAnim]);

 

    // Fetch transaction details
  const {
    data,
    isLoading,
    isError,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  } = useQuery({
    queryKey: ['transaction', transaction?.route, transaction?.transaction_id],
    queryFn: async () => {
      const response = await getJournalEntry(
        transaction.route,
        transaction.transaction_id
      );
      return response;
    },
    staleTime: 30 * 1000,
    enabled: visible,// && !!transaction?.id,
  });

   const { data: htmlData } = useQuery({
      queryKey: ['journalHtml', transaction?.transaction_id],
      queryFn: async () => fetchJournalEntry(transaction.transaction_id),
      staleTime: 30 * 1000,
      enabled: visible,
    });

  if (!visible) {
    return null;
  }
    const handlePrint = async () => {
           if (!htmlData) return;
            if (Platform.OS === 'android') {
               await sharePDF(htmlData, data?.title as string);
            }else{
                await iosSharePDF(htmlData, data?.title as string);
            }
         };

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
        {isLoading && (
          <Loading />
        )}

        {/* Error State */}
        {isError && (
          <Error onClose={onClose} />
        )}
       {!isLoading && !isError && data && (
         <>
         <ModalHeader
              title={data.title}
              onClose={onClose}
              onShare={handlePrint}
            />
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Success Icon and Amount */}
          <View style={styles.headerSection}>
            <Animated.View
              style={[
                styles.successIconContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Icon name="check-circle" size={48} color={colors.primary} />
            </Animated.View>

            <Text style={styles.successLabel}>{data.title}</Text>
            <Text style={styles.amountText}>  {formatBalance(data.amount, data.currency)}</Text>
          </View>

          {/* Transaction Details Card */}
          <View style={styles.detailsCard}>
            {/* Transaction ID */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue}>{data.id}</Text>
            </View>

            {/* Date & Time */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={[styles.detailValue, styles.detailValueRight]}>
                {data.date} • {data.time}
              </Text>
            </View>

            {/* Reference Number */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference Number</Text>
              <Text style={styles.detailValue}>{data.reference}</Text>
            </View>

          

            {/* Journal Details Section */}
            <View style={styles.journalSection}>
              <Text style={styles.journalTitle}>JOURNAL DETAILS</Text>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.accountColumn]}>
                  Account
                </Text>
                <Text style={[styles.tableHeaderText, styles.typeColumn]}>
                  Type
                </Text>
                <Text style={[styles.tableHeaderText, styles.amountColumn]}>
                  Amount
                </Text>
              </View>

              {/* Journal Entries */}
              <View style={styles.entriesList}>

                  <View style={styles.entryRow}>
                    <View style={styles.accountColumn}>
                      <Text style={styles.accountName}>{data.debit_account}</Text>
                    </View>
                    <View style={styles.typeColumn}>
                      <View
                        style={[
                          styles.typeBadge,styles.debitBadge]}
                      >
                        <Text
                          style={[styles.typeText, styles.debitText]}
                        >
                          DR
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountColumn}>
                      <Text style={styles.entryAmount}>{data.amount}</Text>
                    </View>
                  </View>

                   <View style={styles.entryRow}>
                    <View style={styles.accountColumn}>
                      <Text style={styles.accountName}>{data.credit_account}</Text>
                    </View>
                    <View style={styles.typeColumn}>
                      <View
                        style={[
                          styles.typeBadge,styles.creditBadge]}
                      >
                        <Text
                          style={[styles.typeText, styles.creditText]}
                        >
                          CR
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountColumn}>
                      <Text style={styles.entryAmount}>{data.amount}</Text>
                    </View>
                  </View>
                
              </View>
            </View>

            {/* Remarks Section (if available) */}
            {data.remarks && (
              <>
                <View style={styles.remarksSection}>
                  <Text style={styles.remarksTitle}>REMARKS</Text>
                  <Text style={styles.remarksText}>{data.remarks}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
        </>
       )}

        {/* Footer Actions */}
     <ModalFooter onClose={onClose} onAddNew={onAddNew}/>

        {/* Bottom Indicator */}
        <View style={styles.bottomSpace} />
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
     height:SCREEN_HEIGHT * 0.99,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
  },

  // Scroll View
  scrollView: {
    flex: 0,
  },
  scrollContent: {
    paddingBottom: 16,
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
  successLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
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
    fontWeight: 'bold',
    color: '#111813',
  },
  detailValueRight: {
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },


  // Journal Details Section
  journalSection: {
    marginTop: 12,
  },
  journalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  accountColumn: {
    flex: 6,
  },
  typeColumn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountColumn: {
    flex: 4,
    alignItems: 'flex-end',
    textAlign:'right',
  },

  // Entries List
  entriesList: {
    gap: 16,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111813',
    marginBottom: 2,
    textTransform:'capitalize',
  },
  accountType: {
    fontSize: 11,
    color: '#9ca3af',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debitBadge: {
    backgroundColor: 'rgba(19, 236, 91, 0.1)',
  },
  creditBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  debitText: {
    color: '#13ec5b',
  },
  creditText: {
    color: '#ef4444',
  },
  entryAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111813',
  },

  // Remarks Section
  remarksSection: {
    marginTop: 12,
  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  remarksText: {
    fontSize: 13,
    color: '#111813',
    lineHeight: 20,
  },

  // Bottom Space
  bottomSpace: {
    width: 128,
    height: 6,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
  },
});

export default JournalEntryReceipt;