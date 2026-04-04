import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { underscoreToSpace } from '../../utils/stringUtils';
import { STATUS_META } from '../../utils/status';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BadgeProps {
    status: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Badge: React.FC<BadgeProps> = ({ status }) => {
    const meta = STATUS_META[status] ?? STATUS_META.pending;
    return (
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <View style={[styles.dot, { backgroundColor: meta.dot }]} />
            <Text style={[styles.badgeText, { color: meta.text }]}>
                {underscoreToSpace(status).toUpperCase()}
            </Text>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    badge:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
    dot:       { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});