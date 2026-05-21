import React from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import FilterBtn from './ui/FilterBtn';


interface HasSearchQuery {
  searchQuery: string;
}
interface FilterProps<T extends HasSearchQuery> {
  filters: T;
  placeHolder:string;
  setFilters: React.Dispatch<React.SetStateAction<T>>;
  handleOpenFilters: () => void;
}



const Filter = <T extends HasSearchQuery>(props: FilterProps<T>) => {


  return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <View style={styles.searchIconContainer}>
            <Icon name="search" size={24} color="#61896f" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={props.placeHolder}
            placeholderTextColor="#61896f"
            value={props.filters.searchQuery}
            onChangeText={(value) =>
              props.setFilters({ ...props.filters, searchQuery: value })
            }
          />
          {props.filters.searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => props.setFilters({ ...props.filters, searchQuery: '' })}
              style={styles.clearButton}
            >
              <Icon name="close" size={20} color="#61896f" />
            </TouchableOpacity>
          )}
        </View>
        <FilterBtn onPress={props.handleOpenFilters} />
      </View>
  );
};

const styles = StyleSheet.create({
   searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    overflow: 'hidden',

  },
   searchIconContainer: {
    paddingLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111813',
    backgroundColor: colors.backgroundLight,
  },
    clearButton: {
    paddingHorizontal: 12,
  },

});

export default Filter;