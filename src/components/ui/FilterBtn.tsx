import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

interface FilterButtonProps {
  onPress: () => void;
}

const FilterBtn: React.FC<FilterButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.filterButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="tune" size={24} color={colors.white} />
    </TouchableOpacity>
  );
};

export default FilterBtn;

const styles = StyleSheet.create({
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
