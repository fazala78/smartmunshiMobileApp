import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import api from '../../services/api';
import { colors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);


export interface DropdownItem {
  label: string;
  value: string;
}

interface FlexibleDropdownProps {
  // Basic Props
  label?: string;
  placeholder?: string;

  // Selection Mode
  multiple?: boolean; // true = multi-select, false = single-select

  // Data Source
  items?: DropdownItem[]; // Static items
  async?: boolean; // If true, fetch from API
  apiUrl?: string; // API endpoint to fetch data
  searchable?: boolean; // Enable search

  // Values
  value?: string | string[] | null; // Single value or array for multiple
  onValueChange: (value: string | string[] | null) => void;

  // Optional Props
  disabled?: boolean;
  maxHeight?: number;
  zIndex?: number;
  zIndexInverse?: number;

  // API specific
  apiSearchParam?: string; // Query param name for search (default: 'search')
  apiLabelKey?: string; // Key in API response for label (default: 'label')
  apiValueKey?: string; // Key in API response for value (default: 'value')
  apiDataKey?: string; // Key in API response where array is (default: 'data')
}

const FlexibleDropdown: React.FC<FlexibleDropdownProps> = ({
  label,
  placeholder = 'Select an option',
  multiple = false,
  items = [],
  async = false,
  apiUrl,
  searchable = true,
  value,
  onValueChange,
  disabled = false,
  maxHeight = 300,
  zIndex = 1000,
  zIndexInverse = 1000,
  apiSearchParam = 'search',
  apiLabelKey = 'label',
  apiValueKey = 'value',
  apiDataKey = 'data',
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [dropdownItems, setDropdownItems] = useState<DropdownItem[]>(items);
  const [loading, setLoading] = useState<boolean>(false);

  // For single select
  const [singleValue, setSingleValue] = useState<string | null>(
    !multiple && typeof value === 'string' ? value : null
  );

  // For multi select
  const [multiValue, setMultiValue] = useState<string[]>(
    multiple && Array.isArray(value) ? value : []
  );

  // Load items from API
  const loadFromAPI = async (search: string = '') => {
    if (!apiUrl) {
      console.error('API URL is required when async is true');
      return;
    }

    setLoading(true);
    try {
      const params: any = {};
      if (search) {
        params[apiSearchParam] = search;
      }

      const response = await api.get(apiUrl, { params });

      // Extract data from response
      const responseData = apiDataKey
        ? response.data[apiDataKey]
        : response.data;

      // Map to dropdown format
      const mappedItems: DropdownItem[] = responseData.map((item: any) => ({
        label: item[apiLabelKey],
        id: item[apiValueKey],
      }));

      setDropdownItems(mappedItems);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setDropdownItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount if async
  useEffect(() => {
    if (async) {
      loadFromAPI();
    } else {
      setDropdownItems(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [async, apiUrl]);

  // Update items when prop changes (for static mode)
  useEffect(() => {
    if (!async) {
      setDropdownItems(items);
    }
  }, [items, async]);

  // Sync external value changes
  useEffect(() => {
    if (multiple && Array.isArray(value)) {
      setMultiValue(value);
    } else if (!multiple && typeof value === 'string') {
      setSingleValue(value);
    }
  }, [value, multiple]);

  // Handle search for API mode
  const handleSearch = (text: string) => {
    if (async) {
      // Debounce API calls
      const timeoutId = setTimeout(() => {
        loadFromAPI(text);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle value change
  const handleValueChange = (val: any) => {
    console.log(val);
    onValueChange(val);
  };


  return (
    <View style={[styles.wrapper, { zIndex }]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <DropDownPicker
        open={open}
        value={multiple ? multiValue : singleValue}
        items={dropdownItems}
        setOpen={setOpen}
        setValue={multiple ? setMultiValue : setSingleValue}
        setItems={setDropdownItems}
        onChangeValue={handleValueChange}

        // Selection mode
        multiple={multiple}
        mode={multiple ? 'BADGE' : 'DEFAULT'}

        // Search
        searchable={searchable}
        onChangeSearchText={handleSearch}
        searchPlaceholder="Search..."

        // UI
        placeholder={placeholder}
        disabled={disabled}
        loading={loading}
        maxHeight={maxHeight}
        zIndex={zIndex}
        zIndexInverse={zIndexInverse}

        // Styling
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        textStyle={styles.text}
        placeholderStyle={styles.placeholder}
        searchTextInputStyle={styles.searchInput}
        selectedItemContainerStyle={styles.selectedItemContainer}
        selectedItemLabelStyle={styles.selectedItemLabel}
        badgeStyle={styles.badge}
        badgeTextStyle={styles.badgeText}
        badgeDotStyle={styles.badgeDot}
        listMode="SCROLLVIEW"
        dropDownDirection="BOTTOM"
        searchTextInputProps={{
          autoFocus: true,   // 👈 focus search input on open
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

        // Loading
        ActivityIndicatorComponent={() => (
          <ActivityIndicator size="small" color={colors.primary} />
        )}

        // Translations
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
    borderColor: colors.gray200,
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
  },
  searchInput: {
    borderColor: colors.gray200,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111813',
    height: 45
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

export default FlexibleDropdown;