import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Inventory } from '../types/Inventory';
import { colors } from '../theme';
import useCurrency, { formatBalance } from '../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionSummaryProps {
  payload: Inventory;
}

// ─────────────────────────────────────────────────────────────────────────────

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ payload }) => {

  const subtotal =
    payload?.cart.reduce(
      (sum, i) => sum + parseFloat(String(i.subtotal || 0)),
      0
    ) ?? 0;

  const returnsTotal = payload?.mixed_cart.reduce(
    (sum, i) => sum + parseFloat(String(i.subtotal || 0)),
    0
  ) ?? 0;

  const shippingCostAmt = parseFloat(String(payload?.shipping?.shipping_amount || 0));

  const totalPayments = payload.payments?.reduce((acc, p) => acc + (p.amount ?? 0), 0) ?? 0;

  const shippingAmt = payload.shipping?.owner_pay_shipping ? shippingCostAmt : 0;

  const total = Math.max(
    0,
    (subtotal ?? 0) - (payload?.discount ?? 0) - returnsTotal + shippingAmt - totalPayments
  );
  const currency = useCurrency();

  return (

    <View style={styles.summarySection}>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}> {formatBalance(subtotal, currency ?? undefined)}</Text>
      </View>

      {payload?.discount != null && payload.discount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>Discount</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>-{formatBalance(payload.discount, currency ?? undefined)}</Text>
        </View>
      )}

      {payload.payments.length > 0 && payload.payments.map((payment, index) => (
        <View key={index} style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>{payment.type}</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            -{formatBalance(payment.amount ?? 0, currency ?? undefined)}
          </Text>
        </View>
      ))}

      {returnsTotal > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>Returns Deduction</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>-{formatBalance(returnsTotal, currency ?? undefined)}</Text>
        </View>
      )}

      {shippingCostAmt > 0 && payload.shipping.owner_pay_shipping === true && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>+{formatBalance(shippingCostAmt, currency ?? undefined)}</Text>
        </View>
      )}

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total to Net</Text>
        <Text style={styles.totalValue}>{formatBalance(total, currency ?? undefined)}</Text>
      </View>

    </View>
  );
};

export default TransactionSummary;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summarySection: { borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: colors.gray500 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.gray800 },
  summaryDivider: { height: 1, backgroundColor: colors.gray100, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: colors.gray800 },
  totalValue: { fontSize: 24, fontWeight: '900', color: colors.primaryDark },
});