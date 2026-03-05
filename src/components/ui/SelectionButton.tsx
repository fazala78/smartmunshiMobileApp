import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

export interface SelectionOption {
  key:   string;
  label: string;
  icon:  string;
}

interface SelectionButtonProps {
  label:    string;
  options:  SelectionOption[];
  value:    string;
  onSelect: (key: string) => void;
}

const SelectionButton: React.FC<SelectionButtonProps> = ({ label, options, value, onSelect }) => {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const active = value === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => onSelect(option.key)}
              activeOpacity={0.75}
            >
              <Icon name={option.icon} size={24} color={active ? colors.primary : colors.textPlaceholder} />
              <Text style={[styles.btnLabel, active && styles.btnLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SelectionButton;

const styles = StyleSheet.create({
  fieldGroup:     { gap: 8 },
  fieldLabel:     { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
  grid:           { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btn:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent', gap: 6, minWidth: 72 },
  btnActive:      { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  btnLabel:       { fontSize: 11, fontWeight: '800', color: colors.gray900, textAlign: 'center' },
  btnLabelActive: { color: colors.primary },
});