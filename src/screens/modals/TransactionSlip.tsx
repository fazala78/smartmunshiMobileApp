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
import { getInvoice } from '../../services/transactionService';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  name:      string;
  details:   string;
  price:     number;
  quantity:  number;
  amount:    number;
  taxes:     string | null;
  discount:  string | null;
  ex_tax:    string;
  subtotal:  number;
}

interface TrItem {
  transaction_id: number;
  route?:         string;   // optional — if absent, use passed data directly
  data?:          any;      // pre-loaded data to show without API call
}

interface InvoiceProps {
  visible:     boolean;
  onClose:     () => void;
  transaction: TrItem;
}

// ─────────────────────────────────────────────────────────────────────────────

const TransactionSlip: React.FC<InvoiceProps> = ({ visible, onClose, transaction }) => {

  const slideAnim   = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── Animate in/out ────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // ── Fetch — always call useQuery, but disable when no route ───────────────
  // Rules of Hooks: hooks must NEVER be called conditionally.
  // Use `enabled: false` to skip the fetch when route is absent.
  const hasRoute = !!transaction?.route;

  const { data: fetchedData, isLoading, isError } = useQuery({
    queryKey: ['transaction', transaction?.route, transaction?.transaction_id],
    queryFn:  async () => getInvoice(transaction.route!, transaction.transaction_id),
    staleTime: 30 * 1000,
    enabled:   visible && hasRoute,   // ← skip API if no route
  });

  // ── Resolve data — prefer fetched, fall back to passed data ───────────────
  // If no route, show transaction.data directly (no loading, no error)
  const data       = hasRoute ? fetchedData : transaction;
  const showLoader = hasRoute && isLoading;
  const showError  = hasRoute && isError;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Loading */}
        {showLoader && <Loading />}

        {/* Error */}
        {showError && <Error onClose={onClose} />}

        {/* Content */}
        {!showLoader && !showError && data && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.invoiceNumber}>
                  {data.title} #{data.invoice_number}
                </Text>
                {data.status && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidText}>{data.status}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareIcon}>⬆</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>BILLED {data.to_from}</Text>
                <Text style={styles.name}>{data.contact?.name || 'N/A'}</Text>
                <Text style={styles.email}>{data.contact?.email || ''}</Text>
              </View>
              <View style={styles.infoRight}>
                <Text style={styles.label}>INVOICE DATE</Text>
                <Text style={styles.date}>{data.date || 'N/A'}</Text>
                <Text style={styles.time}>{data.time || ''}</Text>
              </View>
            </View>

            {/* Items */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces>
              <View style={styles.itemsContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.itemDescCol]}>ITEM DESCRIPTION</Text>
                  <Text style={[styles.tableHeaderText, styles.priceCol]}>PRICE</Text>
                  <Text style={[styles.tableHeaderText, styles.qtyCol]}>QTY</Text>
                  <Text style={[styles.tableHeaderText, styles.amountCol]}>AMOUNT</Text>
                </View>

                {data.line_items?.map((item: InvoiceItem, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemDescCol}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.badges}>
                        {item.discount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>DISC: -{item.discount}</Text>
                          </View>
                        )}
                        {item.taxes && (
                          <View style={styles.taxBadge}>
                            <Text style={styles.taxText}>TAX: {item.taxes} Exc</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.itemText, styles.priceCol]}>{item.ex_tax}</Text>
                    <Text style={[styles.itemText, styles.qtyCol]}>{item.quantity}</Text>
                    <Text style={[styles.itemAmount, styles.amountCol]}>{item.subtotal}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              {data.total_taxes && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Tax</Text>
                  <Text style={styles.summaryValue}>{data.total_taxes}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{data.subtotal || '0.00'}</Text>
              </View>
              {data.discount && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.discountValue}>-{data.discount}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>NET AMOUNT</Text>
                <Text style={styles.totalAmount}>{data.net_amount || '0.00'}</Text>
              </View>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}
                  onPress={() => console.log('Print pressed')}>
                  <Text style={styles.buttonIcon}>🖨</Text>
                  <Text style={styles.actionButtonText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}
                  onPress={() => console.log('PDF pressed')}>
                  <Text style={styles.buttonIcon}>⬇</Text>
                  <Text style={styles.actionButtonText}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomIndicator} />
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default TransactionSlip;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayTouchable:  { flex: 1 },
  modalContainer:    { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, maxHeight: SCREEN_HEIGHT * 0.99, height: SCREEN_HEIGHT * 0.99, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  handleContainer:   { alignItems: 'center', paddingVertical: 12 },
  handle:            { width: 48, height: 6, backgroundColor: '#dbe6df', borderRadius: 3 },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  iconButton:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  closeIcon:         { fontSize: 24, color: '#111813', fontWeight: '300' },
  headerCenter:      { flex: 1, alignItems: 'center' },
  invoiceNumber:     { fontSize: 13, fontWeight: '800', color: '#111813', letterSpacing: 0.5 },
  paidBadge:         { backgroundColor: 'rgba(19,236,91,0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  paidText:          { fontSize: 9, fontWeight: 'bold', color: '#13ec5b', letterSpacing: 1.2 },
  shareButton:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#13ec5b', justifyContent: 'center', alignItems: 'center' },
  shareIcon:         { fontSize: 18, color: '#102216', fontWeight: 'bold' },

  infoSection:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLeft:          { flex: 1 },
  infoRight:         { alignItems: 'flex-end' },
  label:             { fontSize: 9, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 4 },
  name:              { fontSize: 16, fontWeight: '800', color: '#111813', marginBottom: 2 },
  email:             { fontSize: 11, color: '#6b7280' },
  date:              { fontSize: 14, fontWeight: 'bold', color: '#111813', marginBottom: 2 },
  time:              { fontSize: 11, color: '#6b7280' },

  scrollView:        { flex: 0, minHeight: 400 },
  itemsContainer:    { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  tableHeader:       { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 24 },
  tableHeaderText:   { fontSize: 9, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 1.5 },

  itemDescCol:       { flex: 1 },
  priceCol:          { width: 56, textAlign: 'right' },
  qtyCol:            { width: 40, textAlign: 'center' },
  amountCol:         { width: 64, textAlign: 'right' },

  itemRow:           { flexDirection: 'row', marginBottom: 24 },
  itemName:          { fontSize: 13, fontWeight: 'bold', color: '#111813', marginBottom: 2, textTransform: 'capitalize' },
  itemText:          { fontSize: 13, color: '#4b5563', paddingTop: 2 },
  itemAmount:        { fontSize: 13, fontWeight: 'bold', color: '#111813', paddingTop: 2 },
  badges:            { flexDirection: 'row', gap: 8, marginTop: 4 },
  discountBadge:     { backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  discountText:      { fontSize: 9, fontWeight: '600', color: '#ef4444', letterSpacing: 0.5 },
  taxBadge:          { backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  taxText:           { fontSize: 9, fontWeight: '600', color: '#6b7280', letterSpacing: 0.5 },

  footer:            { backgroundColor: colors.backgroundLight, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, ...Platform.select({ ios: { shadowRadius: 8 }, android: { elevation: 8 } }) },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel:      { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  summaryValue:      { fontSize: 13, fontWeight: '600', color: '#111813' },
  discountValue:     { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16, marginTop: 8, marginBottom: 20 },
  totalLabel:        { fontSize: 11, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 0.5 },
  totalAmount:       { fontSize: 20, fontWeight: '800', color: colors.primary, letterSpacing: -1.5 },

  actionButtons:     { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionButton:      { flex: 1, height: 48, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  buttonIcon:        { fontSize: 16 },
  actionButtonText:  { fontSize: 14, fontWeight: 'bold', color: '#111813' },
  bottomIndicator:   { width: 128, height: 6, backgroundColor: '#d1d5db', borderRadius: 3, alignSelf: 'center', marginTop: 8 },
});