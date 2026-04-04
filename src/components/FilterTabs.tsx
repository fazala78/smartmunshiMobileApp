import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export interface FilterTab {
  key:   string;
  label: string;
}

interface FilterTabsProps {
  tabs:     FilterTab[];
  value:    string;
  onChange: (key: string) => void;
}

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
          <Text
            style={[styles.tabText, active && styles.tabTextActive]}
            numberOfLines={1} // ← prevents text from wrapping and collapsing height
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

export default FilterTabs;

const styles = StyleSheet.create({
  row: {
    flexGrow:          0,
    flexShrink:        0,        // ← key fix: prevents FlatList from squeezing this
    height:            52,       // ← fixed height: never collapses regardless of parent
    backgroundColor:   colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    gap:               8,
    alignItems:        'center', // ← keeps chips vertically centered in fixed height
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical:   8,
    borderRadius:      999,
    backgroundColor:   '#f0f4f2',
    height:            36,                // ← fixed chip height
    justifyContent:    'center',
    alignItems:        'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    shadowColor:     colors.primary,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       4,
  },
  tabText: {
    fontSize:       11,
    fontWeight:     '800',
    color:          colors.gray900,
    letterSpacing:  0.8,
    textTransform:  'uppercase',
    lineHeight:     14,   // ← explicit lineHeight prevents text clipping
  },
  tabTextActive: {
    color: colors.white,
  },
});