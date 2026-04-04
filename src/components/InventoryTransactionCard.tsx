import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { InventoryTransaction } from '../types/Inventory';
import { Currency } from '../types/Currency';

// ─── Types ────────────────────────────────────────────────────────────────────

// NOTE: onEdit and onDelete have been removed.
// All swipe actions are now handled by SwipeRow's hidden layer
// in InventoryTransactionsScreen — this component is a pure display card.

interface TransactionCardProps {
    item:     InventoryTransaction;
    currency: Currency | null;
    onPress:  (item: InventoryTransaction) => void;
}

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
    paid:    { bg: colors.primaryLight, text: colors.successText, dot: colors.primary },
    unpaid:  { bg: colors.dangerLight,  text: colors.danger,      dot: colors.error   },
    partial: { bg: colors.infoLight,    text: colors.infoText,    dot: colors.info    },
};

const ROUTE_META: Record<string, { color: string; bg: string }> = {
    invoice:           { color: colors.primary, bg: colors.primaryMuted },
    'sale-returns':    { color: colors.info,    bg: colors.infoLight    },
    purchases:         { color: colors.warning, bg: colors.warningLight },
    'purchase-returns':{ color: colors.purple,  bg: colors.purpleLight  },
};

const DEFAULT_ROUTE_META = { color: colors.primary, bg: colors.primaryMuted };

// ─── Component ────────────────────────────────────────────────────────────────

const InventoryTransactionCard: React.FC<TransactionCardProps> = ({
    item, currency, onPress,
}) => {
    const meta   = item.payment_status
        ? (STATUS_META[item.payment_status] ?? STATUS_META.unpaid)
        : null;
    const config = ROUTE_META[item.route] ?? DEFAULT_ROUTE_META;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item)}
            style={styles.card}
        >
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
                <Icon name="receipt-long" size={22} color={config.color} />
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.invoiceNumber} numberOfLines={1}>
                    {item.invoice_number}
                </Text>
                <Text style={styles.contact}>{item.contact}</Text>
                {item.payment_status && meta && (
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                        <View style={[styles.dot, { backgroundColor: meta.dot }]} />
                        <Text style={[styles.badgeText, { color: meta.text }]}>
                            {item.payment_status.toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Amount + date */}
            <View style={styles.right}>
                <Text style={styles.amount}>
                    {currency?.symbol}{item.amount.toFixed(2)}
                </Text>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.date}>{item.date}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default InventoryTransactionCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12 },
    iconWrap:      { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info:          { flex: 1, gap: 2 },
    invoiceNumber: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    contact:       { fontSize: 13, fontWeight: '500', color: '#61896f' },
    badge:         { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
    dot:           { width: 6, height: 6, borderRadius: 3 },
    badgeText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    right:         { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    amount:        { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    dateLabel:     { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    date:          { fontSize: 11, fontWeight: '600', color: '#6b7280' },
});