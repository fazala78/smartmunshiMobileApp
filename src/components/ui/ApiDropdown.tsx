import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import api from '../../services/api';
import { colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
export interface ApiDropdownItem {
  label: string;
  value: string;
}

interface ApiDropdownProps {
  label?: string;
  placeholder?: string;

  url: string;                    // 👈 API endpoint
  searchParam?: string;           // default: search
  labelKey?: string;              // default: label
  valueKey?: string;              // default: value
  dataKey?: string;
  modalKey?: string;        // default: data

  value: string | string[] | null;
  onValueChange: (value: string | string[] | null) => void;

  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;

  zIndex?: number;
  zIndexInverse?: number;
}

const ApiDropdown: React.FC<ApiDropdownProps> = ({
  label,
  placeholder = 'Select',
  url,
  searchParam = 'q',
  labelKey = 'name',
  valueKey = 'id',
  modalKey = 'modal_type',
  dataKey = 'data',
  value,
  onValueChange,
  multiple = false,
  searchable = true,
  disabled = false,
  zIndex = 1000,
  zIndexInverse = 1000,
}) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiDropdownItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Local state to control the dropdown
  const [internalValue, setInternalValue] = useState<string | string[] | null>(value);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (search = '') => {
    setLoading(true);
    try {
      const response = await api.get(url, {
        params: search ? { [searchParam]: search } : {},
      });
      const data = dataKey ? response.data[dataKey] : response.data;
      const mapped: ApiDropdownItem[] = data.map((item: any) => (
        {
          label: item[labelKey],
          value: String(item[valueKey] + '_' + item[modalKey]),
        }));

      setItems(mapped);
    } catch (e) {
      console.error('Dropdown API error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchData();
  }, [url]);

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // backend search with debounce
  const handleSearch = (text: string) => {
    if (!searchable) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchData(text);
    }, 400);
  };

  const handleValueChange = (val: any) => {
    console.log('Selected value:', val);
    setInternalValue(val); // Update internal state
    onValueChange(val);     // Notify parent
  };

  return (
    <View style={[styles.wrapper, { zIndex }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <DropDownPicker
        open={open}
        value={internalValue}
        items={items}
        setOpen={setOpen}
        setValue={setInternalValue}  // 👈 CRITICAL: This was missing!
        setItems={setItems}
        onChangeValue={handleValueChange}

        multiple={multiple}
        mode={multiple ? 'BADGE' : 'DEFAULT'}

        searchable={searchable}
        onChangeSearchText={handleSearch}
        searchPlaceholder="Search..."

        placeholder={placeholder}
        disabled={disabled}
        loading={loading}
        zIndex={zIndex}
        zIndexInverse={zIndexInverse}

        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        searchTextInputStyle={styles.searchInput}
        textStyle={styles.text}
        placeholderStyle={styles.placeholder}
        selectedItemContainerStyle={styles.selectedItemContainer}
        selectedItemLabelStyle={styles.selectedItemLabel}
        badgeStyle={styles.badge}
        badgeTextStyle={styles.badgeText}
        badgeDotStyle={styles.badgeDot}

        listMode="SCROLLVIEW"
        dropDownDirection="BOTTOM"

        searchTextInputProps={{
          autoFocus: true,
        }}

        // Icons
        ArrowDownIconComponent={() => (
          <Icon
            name='keyboard-arrow-down'
            size={22}
            color={colors.gray400}
          />

        )}
        ArrowUpIconComponent={() => (
          <Icon
            name='keyboard-arrow-up'
            size={22}
            color={colors.gray400}
          />
        )}
        TickIconComponent={() => (
          <Text style={styles.tick}>✓</Text>
        )}

        ActivityIndicatorComponent={() => (
          <ActivityIndicator size="small" color={colors.primary} />
        )}

        listMessageTextStyle={styles.listMessage}

        // Multiple mode specific
        {...(multiple && {
          min: 0,
          badgeSeparatorStyle: styles.badgeSeparator,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
  
  dropdown: {
    backgroundColor: colors.backgroundLight,
    borderColor: colors.gray200,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderColor: colors.textPlaceholder,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  text: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.gray400,
    fontSize: 15,
    fontWeight:500,
  },
  searchInput: {
    borderColor: colors.textPlaceholder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111813',
    height: 45,
  },
  selectedItemContainer: {
    backgroundColor: 'rgba(19, 236, 91, 0.1)',
  },
  selectedItemLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  badgeSeparator: {
    width: 4,
  },
  arrow: {
    fontSize: 12,
    color: colors.backgroundDark,
  },
  tick: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  listMessage: {
    color: colors.textPlaceholder,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
    wrapper: { gap: 6 },
});

export default ApiDropdown;