import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterTab {
    key:   string;
    label: string;
}

interface FilterTabsProps {
    tabs:     FilterTab[];
    value:    string;
    onChange: (key: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const FilterTabs: React.FC<FilterTabsProps> = ({ tabs, value, onChange }) => (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.row}
        contentContainerStyle={styles.content}
    >
        {tabs.map((tab) => {
            const active = value === tab.key;
            return (
                <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => onChange(tab.key)}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </ScrollView>
);

export default FilterTabs;

const styles = StyleSheet.create({
    row:           { flexGrow: 0, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
    content:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab:           { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: '#f0f4f2' },
    tabActive:     { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
    tabText:       { fontSize: 11, fontWeight: '800', color: colors.gray900, letterSpacing: 0.8, textTransform: 'uppercase' },
    tabTextActive: { color: colors.white },
});