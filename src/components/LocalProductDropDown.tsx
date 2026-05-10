import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View, Text, TextInput, Image, StyleSheet,
  TouchableOpacity, ViewStyle, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography } from '../theme';
import { searchProducts } from '../services/storage';

export interface BaseRecord {
  id?: number | string;
  name: string;
  [key: string]: unknown;
}

interface ProductItem<T extends BaseRecord> {
  label: string;
  value: string;
  price: number;
  image: string | null;
  sku: string | null;
  _raw: T;
}

export interface ProductDropdownRef {
  reset:  () => void;
  reload: () => void;
  focus:  () => void;
}

export interface ProductDropdownProps<T extends BaseRecord> {
  onSelect:        (product: T) => void;
  placeholder?:    string;
  label?:          string;
  showLabel?:      boolean;
  showBarcodeBtn?: boolean;
  onBarcodePress?: () => void;
  autoReset?:      boolean;
  minSearchLength?: number;
  zIndex?:         number;
  disabled?:       boolean;
  style?:          ViewStyle;
}

const LocalProductDropDown = forwardRef<ProductDropdownRef, ProductDropdownProps<any>>(
  function ProductDropdown(
    {
      onSelect,
      placeholder    = 'Search products or SKU...',
      label          = 'Add Items',
      showLabel      = true,
      showBarcodeBtn = true,
      onBarcodePress,
      autoReset      = true,
      minSearchLength = 1,
      zIndex         = 2000,
      disabled       = false,
      style,
    },
    ref
  ) {
    const [open, setOpen]           = useState(false);
    const [inputText, setInputText] = useState('');
    const [items, setItems]         = useState<ProductItem<any>[]>([]);

    // ── removed: initialLoading, searchLoading, error, abortController ──
    // Local search is instant — no async, no loading states needed

    const inputRef    = useRef<TextInput>(null);
    const isMounted   = useRef(true);

    useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
    }, []);

    useImperativeHandle(ref, () => ({
      reset:  () => handleReset(),
      reload: () => loadProducts(inputText),
      focus:  () => inputRef.current?.focus(),
    }));

    // ── MMKV local search (replaces fetchProducts) ─────────────────────────
    const loadProducts = useCallback((query: string = '') => {
      const results = searchProducts(query);

      const normalized: ProductItem<any>[] = results.map((p: any) => ({
        label: p.name  ?? p.title ?? '',
        value: String(p.id),
        price: parseFloat(String(p.price ?? p.sale_price ?? p.unit_price ?? 0)),
        image: p.image ?? p.image_url ?? p.thumbnail ?? null,
        sku:   p.sku   ?? p.code   ?? null,
        _raw:  p,
      }));

      setItems(normalized);
    }, []);

    // Load all on mount
    useEffect(() => { loadProducts(''); }, [loadProducts]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleRowPress = (): void => {
      if (disabled) return;
      if (open) { inputRef.current?.focus(); return; }
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleFocus = (): void => {
      if (disabled) return;
      setOpen(true);
    };

    const handleChangeText = (text: string): void => {
      setInputText(text);
      // Instant — no debounce needed for local MMKV search
      if (text.length === 0 || text.length >= minSearchLength) {
        loadProducts(text);
      }
    };

    const handleSelect = (item: ProductItem<any>): void => {
      onSelect(item._raw);
      if (autoReset) {
        setTimeout(() => handleReset(), 50);
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleReset = (): void => {
      setInputText('');
      setItems([]);
      setOpen(false);
      inputRef.current?.blur();
    };

    const handleBlur = (): void => {
      setTimeout(() => {
        if (!isMounted.current) return;
        setOpen(false);
        if (autoReset) setInputText('');
      }, 150);
    };

    const handleClearInput = (): void => {
      setInputText('');
      loadProducts('');
      inputRef.current?.focus();
    };

    // ── Render: single list row (unchanged) ───────────────────────────────
    const renderItem = (item: ProductItem<any>, index: number) => (
      <React.Fragment key={item.value}>
        {index > 0 && <View style={styles.separator} />}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Icon name="inventory-2" size={18} color={colors.gray300} />
            </View>
          )}
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemName} numberOfLines={1}>{item.label}</Text>
            {item.sku && <Text style={styles.listItemSku}>SKU: {item.sku}</Text>}
          </View>
          <Text style={styles.listItemPrice}>${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
      </React.Fragment>
    );

    // ── Render: dropdown body ─────────────────────────────────────────────
    const renderDropdownBody = () => {
      // No loading/error states — MMKV is sync

      if (items.length === 0 && inputText.length > 0) {
        return (
          <View style={styles.stateBox}>
            <Icon name="inventory-2" size={30} color={colors.gray300} />
            <Text style={styles.stateText}>No results for "{inputText}"</Text>
          </View>
        );
      }

      if (items.length === 0) {
        return (
          <View style={styles.stateBox}>
            <Icon name="inventory-2" size={30} color={colors.gray300} />
            <Text style={styles.stateText}>No products available</Text>
          </View>
        );
      }

      return (
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {items.map((item, index) => renderItem(item, index))}
        </ScrollView>
      );
    };

    // ── Root (unchanged) ──────────────────────────────────────────────────
    return (
      <View style={[styles.wrapper, { zIndex }, style]}>
        {showLabel && <Text style={styles.label}>{label}</Text>}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[
              styles.inputBox,
              open     && styles.inputBoxFocused,
              disabled && styles.inputBoxDisabled,
            ]}
            onPress={handleRowPress}
            activeOpacity={0.85}
            accessible={false}
          >
            <Icon name="search" size={20} color={open ? colors.primary : colors.gray400} />

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              placeholderTextColor={colors.gray400}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              editable={!disabled}
            />

            <View style={styles.trailingArea}>
              {inputText.length > 0 ? (
                <TouchableOpacity
                  onPress={handleClearInput}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={disabled}
                  activeOpacity={1}
                >
                  <Icon name="close" size={18} color={colors.gray400} />
                </TouchableOpacity>
              ) : (
                <Icon
                  name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={colors.gray400}
                />
              )}
            </View>
          </TouchableOpacity>

          {showBarcodeBtn && (
            <TouchableOpacity
              style={[styles.barcodeBtn, disabled && styles.inputBoxDisabled]}
              onPress={onBarcodePress}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Icon name="qr-code-scanner" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {open && <View style={styles.dropdown}>{renderDropdownBody()}</View>}
      </View>
    );
  }
);

export default LocalProductDropDown;

// ── Styles (100% unchanged from your original) ────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 10, fontWeight: '800', color: colors.textPlaceholder,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.backgroundLight, borderRadius: 8,
    minHeight: 48, paddingHorizontal: 12, gap: 8,
    borderWidth: 1.5, borderColor: colors.gray200,
  },
  inputBoxFocused:  { borderColor: colors.primary, backgroundColor: colors.white },
  inputBoxDisabled: { opacity: 0.5 },
  textInput: {
    flex: 1, fontSize: typography.body.fontSize,
    color: colors.gray900, paddingVertical: 2,
  },
  trailingArea: { flexDirection: 'row', alignItems: 'center' },
  barcodeBtn: {
    backgroundColor: colors.primary, padding: 12, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', height: 48, width: 48,
  },
  dropdown: {
    marginTop: 4, backgroundColor: colors.white, borderRadius: 10,
    borderWidth: 1, borderColor: colors.gray200, maxHeight: 340,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 7, overflow: 'hidden',
  },
  list: { maxHeight: 340 },
  separator: { height: 1, backgroundColor: colors.gray200, marginHorizontal: 12 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white,
  },
  thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.backgroundLight },
  thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: typography.body.fontSize, fontWeight: '600', color: colors.gray900 },
  listItemSku:  { fontSize: 11, color: colors.gray400, marginTop: 3 },
  listItemPrice: {
    fontSize: typography.body.fontSize, fontWeight: '700',
    color: colors.gray700, minWidth: 54, textAlign: 'right',
  },
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 8 },
  stateText: { fontSize: 13, color: colors.gray400, textAlign: 'center' },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center', paddingHorizontal: 16 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0fdf4',
    borderRadius: 8, borderWidth: 1, borderColor: colors.primary, marginTop: 4,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});