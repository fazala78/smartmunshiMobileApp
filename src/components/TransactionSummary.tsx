import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Inventory } from '../types/Inventory';
import { colors } from '../theme';
import useCurrency, { formatBalance } from '../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionSummaryProps {
  payload: Inventory;
  showBalanceOverview?: boolean;
}

// ─── Row component ────────────────────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  value: string;
  icon?: string;
  color?: string;
  dim?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, icon, color, dim }) => (
  <View style={s.row}>
    <View style={s.rowLeft}>
      {icon && (
        <Icon name={icon} size={14} color={color ?? (dim ? colors.gray400 : colors.gray500)} />
      )}
      <Text style={[s.rowLabel, dim && s.rowLabelDim, color ? { color } : null]}>
        {label}
      </Text>
    </View>
    <Text style={[s.rowValue, color ? { color } : null]}>
      {value}
    </Text>
  </View>
);

// ─── Component ────────────────────────────────────────────────────────────────

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ payload, showBalanceOverview = false }) => {
  const currency = useCurrency();

  // ── Calculations (same logic as before, no changes) ──────────────────────
  const subtotal = Array.isArray(payload?.cart)
    ? payload.cart.reduce((s, i) => s + parseFloat(String(i.subtotal || 0)), 0)
    : 0;

  const returnsTotal = Array.isArray(payload?.mixed_cart)
    ? payload.mixed_cart.reduce((s, i) => s + parseFloat(String(i.subtotal || 0)), 0)
    : 0;

  const shippingCostAmt = parseFloat(String(payload?.shipping?.shipping_amount || 0));
  const shippingAmt     = !payload.shipping?.owner_pay_shipping ? shippingCostAmt : 0;
  const totalPayments   = payload.payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;

  const net = subtotal - (payload?.discount ?? 0) - returnsTotal + shippingAmt - totalPayments;
  // net can be negative — do NOT clamp with Math.max here so the UI can show due balance

  const previousBalance = payload.contact?.balance ?? 0;
  const afterTransactionBalance = previousBalance + net;
  const afterTransactionColor = afterTransactionBalance >= 0 ? colors.primaryDark : colors.danger;

  const isOverpaid  = net < 0;   // customer has paid more than the total
  const isSettled   = net === 0; // exactly paid

  const totalLabel = isOverpaid ? 'Due Balance' : isSettled ? 'Settled' : 'Balance Due';
  const totalColor = isOverpaid ? colors.danger : isSettled ? colors.primary : colors.primaryDark;

  const fmt = (n: number) => formatBalance(n, currency ?? undefined);
  const fmtSigned = (amount: number) => (amount >= 0 ? fmt(amount) : `−${fmt(Math.abs(amount))}`);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.wrapper}>
      <View style={s.mainCard}>

        {showBalanceOverview && payload.contact && (
          <>
            <View style={s.balanceCardHeader}>
              <Text style={s.balanceHeading}>Contact balance overview</Text>
              <Text style={s.balanceSubtitle}>Previous balance and projected balance after this transaction</Text>
            </View>

            <View style={s.balanceRow}>
              <View>
                <Text style={s.balanceLabel}>Previous balance</Text>
                <Text style={s.balanceNote}>Current contact balance before checkout</Text>
              </View>
              <Text style={s.balanceValue}>{fmtSigned(previousBalance)}</Text>
            </View>

            <View style={s.divider} />
          </>
        )}

        {/* ── Transaction section ── */}
        <SummaryRow
          label="Subtotal"
          value={fmt(subtotal)}
          icon="receipt-long"
          dim
        />

        {shippingAmt > 0 && (
          <SummaryRow
            label="Shipping"
            value={`+${fmt(shippingAmt)}`}
            icon="local-shipping"
            color={colors.warning}
          />
        )}

        {(payload?.discount ?? 0) > 0 && (
          <SummaryRow
            label="Discount"
            value={`−${fmt(payload.discount ?? 0)}`}
            icon="discount"
            color={colors.danger}
          />
        )}

        {returnsTotal > 0 && (
          <SummaryRow
            label="Returns"
            value={`−${fmt(returnsTotal)}`}
            icon="assignment-return"
            color={colors.danger}
          />
        )}

        {payload.payments?.length > 0 && (
          <>
            <View style={s.divider} />
            {payload.payments.map((p, i) => (
              <SummaryRow
                key={i}
                label={p.lable ?? 'Payment'}
                value={`−${fmt(p.amount ?? 0)}`}
                icon="payments"
                color={colors.primary}
              />
            ))}
          </>
        )}

        <View style={s.divider} />

        {/* ── Total section ── */}
        <View style={s.totalRow}>
          <View style={s.totalLeft}>
            <View style={[s.totalIconBadge, { backgroundColor: totalColor + '20' }]}>
              <Icon
                name={isOverpaid ? 'warning-amber' : isSettled ? 'check-circle' : 'account-balance-wallet'}
                size={18}
                color={totalColor}
              />
            </View>
            <View>
              <Text style={[s.totalLabel, { color: totalColor }]}>{totalLabel}</Text>
              <Text style={s.totalSub}>
                {isOverpaid
                  ? 'Customer overpaid'
                  : isSettled
                    ? 'Fully settled'
                    : 'Amount remaining'}
              </Text>
            </View>
          </View>

          <Text style={[s.totalAmount, { color: totalColor }]}>
            {fmt(Math.abs(net))}
          </Text>
        </View>

        {showBalanceOverview && payload.contact && (
          <>
            <View style={s.divider} />

            <View style={[s.balanceRow, { backgroundColor: afterTransactionBalance >= 0 ? colors.primaryLight : colors.dangerLight }]}>
              <View>
                <Text style={s.balanceLabel}>Balance after transaction</Text>
                <Text style={s.balanceNote}>{afterTransactionBalance >= 0 ? 'Customer will owe this amount' : 'Customer will have credit'}</Text>
              </View>
              <Text style={[s.balanceValue, { color: afterTransactionColor }]}>{fmtSigned(afterTransactionBalance)}</Text>
            </View>
          </>
        )}

      </View>
    </View>
  );
};

export default TransactionSummary;

// ─── Styles ───────────────────────────────────────────────────────────────────
const baseBalanceCard = {
  backgroundColor: colors.surface,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.gray200,
  padding: 16,
  gap: 12,
};

const s = StyleSheet.create({

  wrapper: {
    gap: 4,
    borderTopWidth: 1.5,
    borderTopColor: colors.gray100,
    paddingTop: 16,
  },

  // ── Line items ──
  lines: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  rowLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      colors.gray600,
  },
  rowLabelDim: {
    color:      colors.gray400,
    fontWeight: '500',
  },
  rowValue: {
    fontSize:   13,
    fontWeight: '700',
    color:      colors.gray800,
  },

  balanceCard: baseBalanceCard,
  mainCard: baseBalanceCard,
  balanceCardHeader: {
    gap: 4,
  },
  balanceHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    lineHeight: 18,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.gray50,
  },
  balanceAfterRow: {
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray700,
  },
  balanceNote: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.gray800,
  },

  divider: {
    height:          1,
    backgroundColor: colors.gray100,
    marginVertical:  2,
  },

  // ── Total card ──
  totalRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical:   14,
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  totalIconBadge: {
    width:          38,
    height:         38,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
  },
  totalLabel: {
    fontSize:   15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  totalSub: {
    fontSize:   11,
    fontWeight: '500',
    color:      colors.gray400,
    marginTop:  2,
  },
  totalAmount: {
    fontSize:   26,
    fontWeight: '900',
    letterSpacing: -1,
  },
});