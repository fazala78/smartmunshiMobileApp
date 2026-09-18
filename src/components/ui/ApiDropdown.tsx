import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../services/api';
import { colors, typography } from '../../theme';

export interface ApiDropdownItem {
  label: string;
  value: string;
}

interface ApiDropdownProps {
  label?: string;
  placeholder?: string;
  modalTitle?: string;

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

  // Kept for call-site compatibility with the previous inline-dropdown
  // implementation — meaningless now that selection happens in a modal.
  zIndex?: number;
  zIndexInverse?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Opens a full-screen modal (matching LocalDropdown/AsyncDropdown's modalMode)
// with a searchable, checkable list instead of the old inline dropdown-picker —
// far more usable for multi-select on a phone-sized field.

const ApiDropdown: React.FC<ApiDropdownProps> = ({
  label,
  placeholder = 'Select',
  modalTitle,
  url,
  searchParam = 'q',
  labelKey = 'name',
  valueKey = 'id',
  modalKey = 'modal_type',
  dataKey = 'data',
  value,
  onValueChange,
  multiple = true,
  searchable = true,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<ApiDropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedValues: string[] = Array.isArray(value) ? value : value ? [value] : [];

  const fetchData = async (search = '') => {
    setLoading(true);
    try {
      const response = await api.get(url, {
        params: search ? { [searchParam]: search } : {},
      });
      const data = dataKey ? response.data[dataKey] : response.data;
      const mapped: ApiDropdownItem[] = data.map((item: any) => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleOpen = () => {
    if (disabled) return;
    setSearchText('');
    fetchData('');
    setModalVisible(true);
  };

  const handleClose = () => setModalVisible(false);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (!searchable) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(text), 400);
  };

  const toggleItem = (itemValue: string) => {
    if (multiple) {
      const next = selectedValues.includes(itemValue)
        ? selectedValues.filter((v) => v !== itemValue)
        : [...selectedValues, itemValue];
      onValueChange(next);
    } else {
      onValueChange(itemValue);
      setModalVisible(false);
    }
  };

  const handleClearAll = () => onValueChange(multiple ? [] : null);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={handleOpen}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Icon name="filter-list" size={18} color={colors.gray400} />
        {selectedValues.length > 0 ? (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>
              {selectedValues.length} selected
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholderText} numberOfLines={1}>{placeholder}</Text>
        )}
        <View style={styles.trailingArea}>
          {selectedValues.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearAll}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={disabled}
            >
              <Icon name="close" size={18} color={colors.gray400} />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-right" size={20} color={colors.gray400} />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{modalTitle ?? label ?? 'Select'}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleClose} activeOpacity={0.7}>
              <Icon name="close" size={20} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.modalSearchRow}>
              <Icon name="search" size={20} color={colors.gray400} />
              <TextInput
                style={styles.modalSearchInput}
                value={searchText}
                onChangeText={handleSearchChange}
                placeholder="Search..."
                placeholderTextColor={colors.gray400}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchChange('')} activeOpacity={0.7}>
                  <Icon name="cancel" size={18} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {selectedValues.length > 0 && (
            <TouchableOpacity style={styles.modalClearRow} onPress={handleClearAll} activeOpacity={0.7}>
              <Icon name="close" size={16} color={colors.danger} />
              <Text style={styles.modalClearText}>Clear selection ({selectedValues.length})</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.stateText}>Loading…</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.stateBox}>
              <Icon name="search-off" size={30} color={colors.gray300} />
              <Text style={styles.stateText}>
                {searchText ? `No results for "${searchText}"` : 'No results found'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {items.map((item, index) => {
                const isChosen = selectedValues.includes(item.value);
                return (
                  <React.Fragment key={item.value}>
                    {index > 0 && <View style={styles.separator} />}
                    <TouchableOpacity
                      style={[styles.listItem, isChosen && styles.listItemSelected]}
                      onPress={() => toggleItem(item.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isChosen && styles.checkboxChecked]}>
                        {isChosen && <Icon name="check" size={14} color={colors.white} />}
                      </View>
                      <Text style={[styles.listItemName, isChosen && styles.listItemNameSelected]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {isChosen && <Icon name="check-circle" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>
                Done{selectedValues.length > 0 ? ` (${selectedValues.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default ApiDropdown;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundLight,
    borderColor: colors.gray200,
    borderWidth: 1.5,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  triggerDisabled: { opacity: 0.5 },
  placeholderText: { flex: 1, fontSize: typography.body.fontSize, color: colors.gray400 },
  selectedChip: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedChipText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  trailingArea: { flexDirection: 'row', alignItems: 'center' },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundLight,
    justifyContent: 'center', alignItems: 'center',
  },
  modalSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.backgroundLight,
  },
  modalSearchInput: { flex: 1, fontSize: typography.body.fontSize, color: colors.gray900, paddingVertical: 0 },
  modalClearRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10 },
  modalClearText: { fontSize: 13, fontWeight: '600', color: colors.danger },
  modalList: { flex: 1, marginTop: 8 },

  separator: { height: 1, backgroundColor: colors.gray200, marginHorizontal: 12 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.white,
  },
  listItemSelected: { backgroundColor: colors.primaryMuted },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.gray300,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  listItemName: { flex: 1, fontSize: typography.body.fontSize, fontWeight: '600', color: colors.gray900 },
  listItemNameSelected: { color: colors.primary },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { fontSize: 13, color: colors.gray400, textAlign: 'center' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  modalFooter: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  doneBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
