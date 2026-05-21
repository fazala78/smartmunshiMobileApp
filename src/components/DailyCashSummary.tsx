import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../theme';
import { getCashSummary } from '../services/dailyCashReportService';
import { CashSummaryItem, CashSummaryResponse } from '../types/dailyCashReport';
import { formatBalance } from '../utils/currency';
import useCurrency from '../utils/currency';
import { Currency } from '../types/Currency';
import Loading from './common/Loading';

interface Props {
    date?: string;
}

const SummaryRow: React.FC<{
    item: CashSummaryItem;
    total: number;
    accent: string;
    accentBg: string;
    currency: any;
}> = ({ item, total, accent, currency }) => {
    const pct = total > 0 ? Math.min((item.amount / total) * 100, 100) : 0;

    return (
        <View style={s.row}>
            <View style={s.rowTop}>
                <Text style={s.rowLabel} numberOfLines={1}>{item.label}</Text>
                <View style={s.rowRight}>
                    <Text style={[s.rowCount, { color: accent }]}>{item.count}x</Text>
                    <Text style={[s.rowAmount, { color: accent }]}>
                        {formatBalance(item.amount, currency as Currency)}
                    </Text>
                </View>
            </View>
            <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: accent, opacity: 0.85 }]} />
            </View>
        </View>
    );
};

const Section: React.FC<{
    label: string;
    items: CashSummaryItem[];
    total: number;
    accent: string;
    accentBg: string;
    currency: any;
}> = ({ label, items, total, accent, accentBg, currency }) => (
    <View style={s.section}>
        <View style={[s.sectionHeader, { borderLeftColor: accent }]}>
            <Text style={[s.sectionLabel, { color: accent }]}>{label}</Text>
            <Text style={[s.sectionTotal, { color: accent }]}>
                {formatBalance(total, currency as Currency)}
            </Text>
        </View>

        {items.length === 0 ? (
            <Text style={s.empty}>No entries</Text>
        ) : (
            items.map(item => (
                <SummaryRow
                    key={item.type}
                    item={item}
                    total={total}
                    accent={accent}
                    accentBg={accentBg}
                    currency={currency}
                />
            ))
        )}
    </View>
);

const DailyCashSummary: React.FC<Props> = React.memo(({ date }) => {
    const currency = useCurrency();

    const { data, isLoading } = useQuery<CashSummaryResponse>({
        queryKey: ['cashSummary', date],
        queryFn: () => getCashSummary(date),
        staleTime: 0.5 * 60 * 1000,
    });

    const debitTotal = (data?.debit_by_type ?? []).reduce((sum, i) => sum + i.amount, 0);
    const creditTotal = (data?.credit_by_type ?? []).reduce((sum, i) => sum + i.amount, 0);

    if (isLoading) {
        return (
            <View style={s.loadingWrap}>
                <Loading />
            </View>
        );
    }

    return (
        <View style={s.card}>
            <Section
                label="Cash In"
                items={data?.debit_by_type ?? []}
                total={debitTotal}
                accent={colors.primary}
                accentBg={colors.successLight}
                currency={currency}
            />
            <View style={s.divider} />
            <Section
                label="Cash Out"
                items={data?.credit_by_type ?? []}
                total={creditTotal}
                accent={colors.danger}
                accentBg={colors.dangerLight}
                currency={currency}
            />
        </View>
    );
});

export default DailyCashSummary;

const s = StyleSheet.create({
    loadingWrap: { paddingVertical: 20 },

    card: {
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gray100,
        overflow: 'hidden',
    },

    divider: {
        height: 1,
        backgroundColor: colors.gray100,
        marginHorizontal: 14,
    },

    // ── Section ──
    section: {
        padding: 14,
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
        paddingLeft: 8,
        marginBottom: 2,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    sectionTotal: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.4,
    },

    // ── Row ──
    row: {
        gap: 10,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.gray700,
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowCount: {
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.6,
    },
    rowAmount: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.2,
        minWidth: 70,
        textAlign: 'right',
    },

    // ── Progress bar ──
    barTrack: {
        height: 4,
        backgroundColor: colors.gray100,
        borderRadius: 100,
        overflow: 'hidden',
    },
    barFill: {
        height: 4,
        borderRadius: 100,
    },

    // ── Empty ──
    empty: {
        fontSize: 12,
        color: colors.gray400,
        fontStyle: 'italic',
        paddingLeft: 8,
    },
});
