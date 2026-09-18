import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import { formatBalance } from '../../utils/currency';
import { Currency, ChequeSummaryItem } from '../../types/contact';
import { STATUS_META } from '../../utils/status';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChequeSummaryCardsProps {
    items: ChequeSummaryItem[];
    currency?: Currency | null;
    /** Called when a card carrying a `cheque_status` is tapped (e.g. to drill into that cheque list). */
    onCardPress?: (item: ChequeSummaryItem) => void;
}

// ─── Visual mapping ───────────────────────────────────────────────────────────
// The API decides which cards/labels apply (vendor vs client/walk-in) — this
// component only maps whatever it's given to an icon + color. Cards carrying
// a `cheque_status` (pending/partial/issued/installment/handed_over/…) borrow
// their color straight from STATUS_META so they stay consistent with the
// Badge component used elsewhere for the same statuses.

const STATUS_ICON: Record<string, string> = {
    pending: 'schedule',
    unsettled: 'schedule',
    clearing: 'hourglass-top',
    bounced: 'error-outline',
    cleared: 'task-alt',
    issued: 'receipt-long',
    partial: 'donut-large',
    installment: 'event-repeat',
    handed_over: 'swap-horiz',
};

const getCardVisual = (item: ChequeSummaryItem, amount: number) => {
    if (item.cheque_status) {
        const meta = STATUS_META[item.cheque_status] ?? STATUS_META.pending;
        return { icon: STATUS_ICON[item.cheque_status] ?? 'receipt-long', iconColor: meta.dot, iconBg: meta.bg };
    }

    const label = item.label.toLowerCase();
    if (label.includes('current balance')) {
        return amount < 0
            ? { icon: 'trending-down', iconColor: colors.danger, iconBg: colors.dangerLight }
            : { icon: 'trending-up', iconColor: colors.primary, iconBg: colors.primaryLight };
    }
    if (label.includes('total')) {
        return { icon: 'receipt-long', iconColor: colors.info, iconBg: colors.infoLight };
    }
    if (label.includes('balance')) {
        return { icon: 'account-balance-wallet', iconColor: colors.primary, iconBg: colors.primaryLight };
    }
    return { icon: 'info-outline', iconColor: colors.gray500, iconBg: colors.gray100 };
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChequeSummaryCards: React.FC<ChequeSummaryCardsProps> = ({ items, currency, onCardPress }) => {
    if (!items || items.length === 0) return null;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.grid}
        >
            {items.map((item, index) => {
                const amount = parseFloat(String(item.amount)) || 0;
                const visual = getCardVisual(item, amount);
                // Only cards tied to a cheque status (pending/partial/…) drill into a list — plain
                // totals/balances have nowhere to navigate to.
                const isPressable = !!item.cheque_status && !!onCardPress;

                const content = (
                    <>
                        <View style={[styles.iconBox, { backgroundColor: visual.iconBg }]}>
                            <Icon name={visual.icon} size={16} color={visual.iconColor} />
                        </View>
                        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
                        <Text style={styles.value} numberOfLines={1}>
                            {formatBalance(amount, currency ?? undefined)}
                        </Text>
                        {item.transactions != null && (
                            <Text style={styles.count}>
                                {item.transactions} {item.transactions === 1 ? 'txn' : 'txns'}
                            </Text>
                        )}
                    </>
                );

                return isPressable ? (
                    <TouchableOpacity
                        key={`${item.label}-${index}`}
                        style={styles.card}
                        activeOpacity={0.75}
                        onPress={() => onCardPress!(item)}
                    >
                        {content}
                    </TouchableOpacity>
                ) : (
                    <View key={`${item.label}-${index}`} style={styles.card}>
                        {content}
                    </View>
                );
            })}
        </ScrollView>
    );
};

export default ChequeSummaryCards;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', gap: 10, paddingRight: 16 },
    card: { width: 148, backgroundColor: colors.backgroundLight, borderRadius: 14, padding: 12, gap: 6 },
    iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, fontWeight: '700', color: colors.textPlaceholder, textTransform: 'uppercase', letterSpacing: 0.6 },
    value: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
    count: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
});
