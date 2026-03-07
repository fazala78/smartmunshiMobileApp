import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChequeStatus = 'pending' | 'bounced' | 'cleared' | 'partial' |
    'unsettled' | 'installment' | 'issued' | 'clearing' | 'handed_over';

export interface Cheque {
    id:            number;
    cheque_number: string;
    bank_name:     string;
    contact_name:  string;
    amount:        string;
    clearing_date: string;
    status:        ChequeStatus;
}

export interface ChequeAction {
    label:   string;
    icon:    string;
    color:   string;
    onPress: (id: number) => void;
}

interface ChequeCardProps {
    item:     Cheque;
    currency: any;
    actions:  ChequeAction[];   // ← caller controls which buttons appear
    onPress:  (item: Cheque) => void;
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
    pending:     { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
    unsettled:   { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
    bounced:     { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' },
    cleared:     { bg: '#d1fae5', text: '#059669', dot: '#10b981' },
    partial:     { bg: '#dbeafe', text: '#2563eb', dot: '#3b82f6' },
    installment: { bg: '#dbeafe', text: '#2563eb', dot: '#3b82f6' },
    issued:      { bg: '#d1fae5', text: '#059669', dot: '#10b981' },
    clearing:    { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
    handed_over: { bg: '#f3e8ff', text: '#7c3aed', dot: '#8b5cf6' },
};

// ─── Component ────────────────────────────────────────────────────────────────

const BUTTON_WIDTH = 76;

const ChequeCard: React.FC<ChequeCardProps> = ({ item, currency, actions, onPress }) => {

    const swipeWidth = BUTTON_WIDTH * actions.length;
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen     = useRef(false);

    const close = useCallback(() => {
        Animated.spring(translateX, {
            toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
        }).start();
        isOpen.current = false;
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,

            onPanResponderMove: (_, g) => {
                const base = isOpen.current ? -swipeWidth : 0;
                translateX.setValue(Math.max(-swipeWidth, Math.min(0, base + g.dx)));
            },

            onPanResponderRelease: (_, g) => {
                // dragging right (positive dx) always closes
                if (g.dx > 10) {
                    close();
                    return;
                }
                // dragging left past half → open
                const shouldOpen = isOpen.current
                    ? g.dx > -(swipeWidth / 2)   // was open, not dragged back far enough → stay
                    : g.dx < -(swipeWidth / 2);  // was closed, dragged past half → open

                if (shouldOpen) {
                    Animated.spring(translateX, {
                        toValue: -swipeWidth, useNativeDriver: true, tension: 80, friction: 12,
                    }).start();
                    isOpen.current = true;
                } else {
                    close();
                }
            },
        })
    ).current;

    const meta = STATUS_META[item.status] ?? STATUS_META.pending;

    return (
        <View style={styles.wrap}>

            {/* ── Action buttons (revealed behind card) ── */}
            <View style={[styles.actionsRow, { width: swipeWidth }]}>
                {actions.map((action, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.actionBtn, { backgroundColor: action.color, width: BUTTON_WIDTH }]}
                        onPress={() => { close(); action.onPress(item.id); }}
                    >
                        <Icon name={action.icon} size={22} color="#fff" />
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Sliding card ── */}
            <Animated.View
                style={[styles.card, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)} style={styles.cardInner}>

                    {/* Icon */}
                    <View style={styles.iconWrap}>
                        <Icon name="description" size={24} color="#d97706" />
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>
                            {item.cheque_number} • {item.bank_name}
                        </Text>
                        <Text style={styles.sub}>{item.contact_name}</Text>
                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                            <View style={[styles.dot, { backgroundColor: meta.dot }]} />
                            <Text style={[styles.badgeText, { color: meta.text }]}>
                                {item.status.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Amount + date */}
                    <View style={styles.right}>
                        <Text style={styles.amount}>{currency?.symbol}{item.amount}</Text>
                        <Text style={styles.dateLabel}>Clearing Date</Text>
                        <Text style={styles.date}>{item.clearing_date}</Text>
                    </View>

                </TouchableOpacity>
            </Animated.View>

        </View>
    );
};

export default ChequeCard;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrap:        { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    actionsRow:  { position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' },
    actionBtn:   { alignItems: 'center', justifyContent: 'center', gap: 4 },
    actionLabel: { fontSize: 9, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    card:        { backgroundColor: colors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16 },
    cardInner:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
    iconWrap:    { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    info:        { flex: 1, gap: 2 },
    title:       { fontSize: 14, fontWeight: '800', color: colors.gray900 },
    sub:         { fontSize: 13, fontWeight: '500', color: '#61896f' },
    badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
    dot:         { width: 6, height: 6, borderRadius: 3 },
    badgeText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    right:       { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    amount:      { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    dateLabel:   { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    date:        { fontSize: 11, fontWeight: '600', color: '#6b7280' },
});