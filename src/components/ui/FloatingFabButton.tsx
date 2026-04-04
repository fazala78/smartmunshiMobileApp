import React from 'react';
import {  StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BadgeProps {
    onPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FloatingFabButton: React.FC<BadgeProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            style={styles.fab}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Icon name="add" size={32} color={colors.white} />
        </TouchableOpacity>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 32,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
});