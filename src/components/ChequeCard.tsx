import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { Cheque } from '../types/cheques';
import { Badge } from './ui/Badge';

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
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item)}
            style={styles.card}
        >
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
                <Text style={styles.dateLabel}>Clearing Date</Text>
                <Text style={styles.date}>{item.clearing_date}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default ChequeCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 5 },
    iconWrap:  { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info:      { flex: 1, gap: 2 },
    title:     { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    sub:       { fontSize: 13, fontWeight: '500', color: '#61896f' },
    right:     { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    amount:    { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    dateLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    date:      { fontSize: 11, fontWeight: '600', color: '#6b7280' },
});