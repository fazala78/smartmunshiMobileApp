import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { InstallmentTransaction } from '../types/cheques';

// ─── Props ────────────────────────────────────────────────────────────────────

interface InstallmentLineChartProps {
    transactions: InstallmentTransaction[];
    currencySymbol?: string;
}

// ─── Layout constants ─────────────────────────────────────────────────────────
// Each installment is drawn as a single horizontal line growing left → right —
// its length is proportional to that installment's amount, so the stack of
// lines reads like a simple horizontal bar chart of the payment history.

const LINE_H   = 6;
const MIN_PCT  = 8;

// ─── Component ────────────────────────────────────────────────────────────────

const InstallmentLineChart: React.FC<InstallmentLineChartProps> = ({ transactions, currencySymbol = '$' }) => {
    if (!transactions.length) return null;

    const max = Math.max(...transactions.map((t) => t.amount));

    return (
        <View style={styles.wrap}>
            <View style={styles.header}>
                <Text style={styles.title}>Installments</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{transactions.length} recorded</Text>
                </View>
            </View>

            <View style={styles.list}>
                {transactions.map((t, i) => {
                    const pct = Math.max(MIN_PCT, (t.amount / max) * 100);
                    return (
                        <View key={t.id ?? i} style={styles.row}>
                            <Text style={styles.seq}>#{i + 1}</Text>
                            <View style={styles.track}>
                                <View style={[styles.line, { width: `${pct}%` }]} />
                            </View>
                            <Text style={styles.value} numberOfLines={1}>
                                {currencySymbol}{t.amount.toLocaleString()}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export default InstallmentLineChart;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrap:        { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    title:       { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
    countBadge:  { backgroundColor: colors.infoLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    countText:   { fontSize: 10, fontWeight: '800', color: colors.info },

    list:        { gap: 10 },
    row:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seq:         { width: 22, fontSize: 9, fontWeight: '700', color: colors.textMuted },
    track:       { flex: 1, height: LINE_H, borderRadius: LINE_H / 2, backgroundColor: colors.info + '14', overflow: 'hidden' },
    line:        { height: LINE_H, borderRadius: LINE_H / 2, backgroundColor: colors.info },
    value:       { width: 64, fontSize: 9, fontWeight: '800', color: colors.gray700, textAlign: 'right' },
});
