import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Option {
  [key: string]: any;
}

interface MultiSelectFilterProps {
  title?: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (newSelection: string[]) => void;
  valueKey?: string; // Key to use for the unique identifier (default: 'id')
  labelKey?: string; // Key to use for the display label (default: 'label')
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  title,
  options = [],
  selectedValues = [],
  onSelectionChange,
  valueKey = 'id',
  labelKey = 'label',
}) => {
  const handleToggle = (optionValue: string): void => {
    const currentSelection = Array.isArray(selectedValues) ? selectedValues : [];
    const isSelected = currentSelection.includes(optionValue);
    const newSelection = isSelected
      ? currentSelection.filter(val => val !== optionValue)
      : [...currentSelection, optionValue];
    onSelectionChange(newSelection);
  };

  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  return (
    <View style={styles.filterSection}>
      {title && (
        <Text style={styles.filterLabel}>{title}</Text>
      )}
      
      <View style={styles.grid}>
        {options.map((option, index) => {
          const optionValue = option[valueKey];
          const optionLabel = option[labelKey];
          const isSelected = safeSelectedValues.includes(optionValue);
          
          return (
            <TouchableOpacity
              key={optionValue || index}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
              ]}
              onPress={() => handleToggle(optionValue)}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                {optionLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    marginBottom: 15,
  },
  filterLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase',marginBottom:10 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.backgroundLight,
  },
  chipActive: {
    backgroundColor: 'rgba(19, 236, 91, 0.2)',
    borderColor: colors.primaryBorder,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default MultiSelectFilter;