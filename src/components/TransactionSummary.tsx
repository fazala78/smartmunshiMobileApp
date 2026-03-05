import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Inventory } from '../types/Inventory';
import { colors } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionSummaryProps {
  payload: Inventory;
}

// ─────────────────────────────────────────────────────────────────────────────

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ payload }) => {

  const returnsTotal = Array.isArray(payload?.mixed_cart)
    ? payload.mixed_cart.reduce(
        (s, r) => s + parseFloat(String(r.price || 0)) * parseFloat(String(r.quantity || 1)), 0
      )
    : 0;

  const shippingCostAmt = parseFloat(String(payload?.shipping?.shipping_amount || 0));

  const total = Math.max(
    0,
    (payload?.summary?.total ?? 0) - (payload?.discount ?? 0) - returnsTotal + shippingCostAmt
  );

  return (
    <View style={styles.summarySection}>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>${(payload?.summary?.total ?? 0).toFixed(2)}</Text>
      </View>

      {payload?.discount != null && payload.discount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>Discount</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>-${payload.discount.toFixed(2)}</Text>
        </View>
      )}

      {returnsTotal > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>Returns Deduction</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>-${returnsTotal.toFixed(2)}</Text>
        </View>
      )}

      {shippingCostAmt > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>+${shippingCostAmt.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total to Pay</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
      </View>

    </View>
  );
};

export default TransactionSummary;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summarySection:  { borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 16, gap: 10 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:    { fontSize: 14, color: colors.gray500 },
  summaryValue:    { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  summaryDivider:  { height: 1, backgroundColor: colors.gray100, marginVertical: 4 },
  totalLabel:      { fontSize: 16, fontWeight: '800', color: colors.gray800 },
  totalValue:      { fontSize: 24, fontWeight: '900', color: colors.primaryDark },
});