import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { Cheque } from '../types/cheques';
import { Badge } from './ui/Badge';
import InstallmentLineChart from './InstallmentLineChart';

// ─── Statuses that carry an inline installment history ───────────────────────
const INSTALLMENT_STATUSES = ['partial', 'installment'];

// ─── clearing_date arrives as "04-Jun-2026" — `new Date(string)` parses that
// format inconsistently across JS engines, so parse it explicitly. ──────────
const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const parseClearingDate = (dateStr: string): Date | null => {
    const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(dateStr);
    if (!match) return null;
    const month = MONTHS[match[2]];
    if (month === undefined) return null;
    return new Date(Number(match[3]), month, Number(match[1]));
};

// ─── Days past the clearing date (0 or negative = not yet due) ───────────────
const daysOverdue = (dateStr: string): number => {
    const clearing = parseClearingDate(dateStr);
    if (!clearing) return 0;
    clearing.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - clearing.getTime()) / (1000 * 60 * 60 * 24));
};

// ─── Types ────────────────────────────────────────────────────────────────────

// NOTE: ChequeAction and the actions prop have been removed.
// All swipe actions are now handled by SwipeListView's renderHiddenItem
// in ChequeListScreen — this component is a pure display card.

interface ChequeCardProps {
    item:     Cheque;
    currency: any;
    onPress:  (item: Cheque) => void;
}

// ─── Status colours ───────────────────────────────────────────────────────────



// ─── Component ────────────────────────────────────────────────────────────────

const ChequeCard: React.FC<ChequeCardProps> = ({ item, currency, onPress }) => {
    const showInstallments = INSTALLMENT_STATUSES.includes(item.status) && !!item.transactions?.length;
    const overdueDays = daysOverdue(item.clearing_date);
    const isOverdue = overdueDays > 0;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item)}
            style={styles.card}
        >
            <View style={styles.row}>
                {/* Icon */}
                <View style={styles.iconWrap}>
                    <Icon name="description" size={24} color={colors.gray500} />
                </View>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.cheque_number}
                    </Text>
                    <Text style={styles.sub}>{item.source_name}</Text>
                    <Badge status={item.status} />
                </View>

                {/* Amount + date */}
                <View style={styles.right}>
                    <Text style={styles.amount}>{currency?.symbol}{item.amount}</Text>
                    {isOverdue ? (
                        <>
                            <Text style={styles.overdueLabel}>Overdue</Text>
                            <Text style={styles.overdueDays}>{overdueDays} day{overdueDays !== 1 ? 's' : ''}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.dateLabel}>Clearing Date</Text>
                            <Text style={styles.date}>{item.clearing_date}</Text>
                        </>
                    )}
                </View>
            </View>

            {/* Installment history — each transaction is one installment */}
            {showInstallments && (
                <InstallmentLineChart
                    transactions={item.transactions!}
                    currencySymbol={item.currency?.symbol ?? currency?.symbol}
                />
            )}
        </TouchableOpacity>
    );
};

export default ChequeCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card:      { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 5 },
    row:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap:  { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info:      { flex: 1, gap: 2 },
    title:     { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    sub:       { fontSize: 13, fontWeight: '500', color: '#61896f' },
    right:     { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    amount:    { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    dateLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    date:      { fontSize: 11, fontWeight: '600', color: '#6b7280' },
    overdueLabel: { fontSize: 9, fontWeight: '800', color: colors.danger, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    overdueDays:  { fontSize: 11, fontWeight: '700', color: colors.danger },
});