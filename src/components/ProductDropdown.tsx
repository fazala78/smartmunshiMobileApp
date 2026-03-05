import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors } from '../theme';
// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of a product returned from your API. Extend as needed. */
export interface BaseRecord {
    /** undefined when the record is newly created and not yet saved to the DB */
    id?: number | string;
    name: string;
    [key: string]: unknown;
}

interface ProductItem<T extends BaseRecord>  {
  label: string;
  value: string;
  price: number;
  image: string | null;
  sku:   string | null;
  _raw:  T;
}

export interface ProductDropdownRef {
  /** Clears search text, closes list, reloads full list */
  reset:  () => void;
  /** Re-fetches using the current search text */
  reload: () => void;
  /** Programmatically focus the input to open the dropdown */
  focus:  () => void;
}



export interface ProductDropdownProps<T extends BaseRecord> {
  /** Called with the full Product object on selection */
  onSelect:         (product: T) => void;
  /** API endpoint — default '/products' */
  url?:             string;
  /** Query param key — default 'search' */
  searchParam?:     string;
  /** Placeholder shown in the input when empty */
  placeholder?:     string;
  /** Label above the input — default 'Add Items' */
  label?:           string;
  /** Show the label — default true */
  showLabel?:       boolean;
  /** Show the barcode button — default true */
  showBarcodeBtn?:  boolean;
  /** Called when barcode button is pressed */
  onBarcodePress?:  () => void;
  /** Auto-clear the input after each selection — default true */
  autoReset?:       boolean;
  /** Min chars before API search fires — default 1 */
  minSearchLength?: number;
  /** Debounce delay ms — default 350 */
  debounceMs?:      number;
  /** zIndex for dropdown stacking — default 2000 */
  zIndex?:          number;
  /** Disable the input — default false */
  disabled?:        boolean;
  /** Outer wrapper style override */
  style?:           ViewStyle;
}

/**
 * ProductDropdown — combobox pattern
 *
 * The input field IS the search field. Tapping it immediately opens the
 * suggestion list and every keystroke fires a debounced server search.
 * No second tap on a separate search row is needed.
 *
 * When `autoReset` is true (default), the input is cleared after each pick
 * so the user can immediately search for another product.
 *
 * Example
 * ──────────────────────────────────────────────────────────────────────────
 * const ref = useRef<ProductDropdownRef>(null);
 *
 * <ProductDropdown
 *   url="/products"
 *   searchParam="search"
 *   onSelect={(product) => console.log(product.id, product.price, product.sku)}
 *   ref={ref}
 * />
 */
const ProductDropdown = forwardRef<ProductDropdownRef, ProductDropdownProps<any>>(
  function ProductDropdown(
    {
      onSelect,
      url             = '/products',
      searchParam     = 'search',
      placeholder     = 'Search products or SKU...',
      label           = 'Add Items',
      showLabel       = true,
      showBarcodeBtn  = true,
      onBarcodePress,
      autoReset       = true,
      minSearchLength = 1,
      debounceMs      = 350,
      zIndex          = 2000,
      disabled        = false,
      style,
    },
    ref
  ) {
    // ── State ──────────────────────────────────────────────────────────────
    const [open, setOpen]             = useState<boolean>(false);
    const [inputText, setInputText]   = useState<string>('');

    const [items, setItems]                   = useState<ProductItem<any>[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [searchLoading, setSearchLoading]   = useState<boolean>(false);
    const [error, setError]                   = useState<string | null>(null);

    // ── Refs ───────────────────────────────────────────────────────────────
    const inputRef           = useRef<TextInput>(null);
    const debounceTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMounted          = useRef<boolean>(true);

    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
        abortControllerRef.current?.abort();
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, []);

    // ── Ref API ────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      reset:  () => handleReset(),
      reload: () => fetchProducts(inputText, false),
      focus:  () => inputRef.current?.focus(),
    }));

    // ── Core fetch ─────────────────────────────────────────────────────────
    const fetchProducts = useCallback(
      async (search: string = '', isInitial: boolean = false): Promise<void> => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        if (isInitial) setInitialLoading(true);
        else           setSearchLoading(true);
        setError(null);

        try {
          const response = await api.get(url, {
            params: search ? { [searchParam]: search } : {},
            signal: abortControllerRef.current.signal,
          });

          if (!isMounted.current) return;

          const list: ProductItem<T>[] = Array.isArray(response.data)
            ? response.data
            : (response.data as { data?: ProductItem<T>[] }).data
              ?? (response.data as { products?: ProductItem<T>[] }).products
              ?? [];

          // ⚠️ Adjust field names to match your API shape
          const normalized: ProductItem<T>[] = list.map((p) => ({
            label: p.name ?? p.title ?? '',
            value: String(p.id),
            price: parseFloat(String(p.price ?? p.sale_price ?? p.unit_price ?? 0)),
            image: (p.image ?? p.image_url ?? p.thumbnail ?? null) as string | null,
            sku:   (p.sku ?? p.code ?? null) as string | null,
            _raw:  p,
          }));

          setItems(normalized);
        } catch (err: unknown) {
          const e = err as { name?: string; response?: { data?: { message?: string } }; message?: string };
          if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
          if (!isMounted.current) return;
          setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load products');
        } finally {
          if (isMounted.current) {
            setInitialLoading(false);
            setSearchLoading(false);
          }
        }
      },
      [url, searchParam]
    );

    // Initial list load on mount
    useEffect(() => {
      fetchProducts('', true);
    }, [fetchProducts]);

    // ── Input focus → open list ────────────────────────────────────────────
    const handleFocus = (): void => {
      if (disabled) return;
      setOpen(true);
      if (items.length === 0 && !initialLoading) {
        fetchProducts('', false);
      }
    };

    // ── Typing → debounced server search ───────────────────────────────────
    const handleChangeText = (text: string): void => {
      setInputText(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (text.length === 0) {
        fetchProducts('', false);
        return;
      }
      if (text.length < minSearchLength) return;

      debounceTimer.current = setTimeout(() => {
        fetchProducts(text, false);
      }, debounceMs);
    };

    // ── Pick a product ─────────────────────────────────────────────────────
    const handleSelect = (item: ProductItem<T>): void => {
      onSelect(item._raw);
      if (autoReset) {
        // Small delay so the tap registers before we blur/reset
        setTimeout(() => handleReset(), 50);
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    // ── Reset ──────────────────────────────────────────────────────────────
    const handleReset = (): void => {
      setInputText('');
      setOpen(false);
      inputRef.current?.blur();
      fetchProducts('', false);
    };

    // ── Close list on blur (delayed so list tap registers first) ───────────
    const handleBlur = (): void => {
      setTimeout(() => {
        if (isMounted.current) {
          setOpen(false);
          if (autoReset) setInputText('');
        }
      }, 150);
    };

    // ── Clear input button ─────────────────────────────────────────────────
    const handleClearInput = (): void => {
      setInputText('');
      fetchProducts('', false);
      inputRef.current?.focus();
    };

    // ── Render: list row ───────────────────────────────────────────────────
    const renderItem = ({ item }: { item: ProductItem <T>}) => (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Icon name="inventory-2" size={18} color={COLORS.gray300} />
          </View>
        )}

        {/* Name + SKU */}
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {item.label}
          </Text>
          {item.sku && (
            <Text style={styles.listItemSku}>SKU: {item.sku}</Text>
          )}
        </View>

        {/* Price */}
        <Text style={styles.listItemPrice}>${item.price.toFixed(2)}</Text>
      </TouchableOpacity>
    );

    // ─── Root ──────────────────────────────────────────────────────────────
    return (
      <View style={[styles.wrapper, { zIndex }, style]}>
        {showLabel && <Text style={styles.label}>{label}</Text>}

        {/* ── Input row (input + optional barcode btn) ── */}
        <View style={styles.inputRow}>
          <View
            style={[
              styles.inputBox,
              open && styles.inputBoxFocused,
              disabled && styles.inputBoxDisabled,
            ]}
          >
            {/* Leading search icon */}
            <Icon
              name="search"
              size={20}
              color={open ? COLORS.brand : COLORS.gray400}
            />

            {/* The search input itself */}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              placeholderTextColor={COLORS.gray400}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              editable={!disabled}
            />

            {/* Trailing: spinner OR clear button OR chevron */}
            <View style={styles.trailingArea}>
              {searchLoading && open ? (
                <ActivityIndicator size="small" color={COLORS.brand} />
              ) : inputText.length > 0 ? (
                <TouchableOpacity
                  onPress={handleClearInput}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={disabled}
                >
                  <Icon name="close" size={18} color={COLORS.gray400} />
                </TouchableOpacity>
              ) : (
                <Icon
                  name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={COLORS.gray400}
                />
              )}
            </View>
          </View>

          {/* Optional barcode button */}
          {showBarcodeBtn && (
            <TouchableOpacity
              style={[styles.barcodeBtn, disabled && styles.inputBoxDisabled]}
              onPress={onBarcodePress}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Icon name="qr-code-scanner" size={24} color={COLORS.gray600} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Suggestion list ── */}
        {open && (
          <View style={styles.dropdown}>
            {initialLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator size="small" color={COLORS.brand} />
                <Text style={styles.stateText}>Loading products…</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <Icon name="error-outline" size={22} color={COLORS.red} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchProducts(inputText, false)}
                >
                  <Icon name="refresh" size={15} color={COLORS.brand} />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : items.length === 0 && inputText && searchLoading? (
              <View style={styles.stateBox}>
                <Icon name="inventory-2" size={30} color={COLORS.gray300} />
                <Text style={styles.stateText}>
                  {inputText ? `No results for "${inputText}"` : 'No products found'}
                </Text>
              </View>
            ) : (
               <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {items.map((item, index) => (
                  <React.Fragment key={item.value}>
                    {index > 0 && <View style={styles.separator} />}
                    {renderItem({ item })}
                  </React.Fragment>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    );
  }
);

export default ProductDropdown;

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
  brand:   colors.primary,
  inputBg: colors.backgroundLight,
  white:   colors.white,
  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4b5563',
  gray400: '#9ca3af',
  gray300: '#d1d5db',
  gray200: '#e5e7eb',
  red:     colors.error,
} as const;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },

  // ── Input row (input box + barcode btn) ────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Unified input box ──────────────────────────────────────────────────────
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputBoxFocused: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.white,
  },
  inputBoxDisabled: { opacity: 0.5 },

  // The actual TextInput
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray900,
    paddingVertical: 0,
  },

  // Trailing icons
  trailingArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Barcode button
  barcodeBtn: {
    backgroundColor: COLORS.inputBg,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    width: 48,
  },

  // ── Dropdown panel ─────────────────────────────────────────────────────────
  dropdown: {
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    maxHeight: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 7,
    overflow: 'hidden',
  },

  // ── List ───────────────────────────────────────────────────────────────────
  list: { maxHeight: 340 },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: { flex: 1 },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  listItemSku: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 3,
  },
  listItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray700,
    minWidth: 54,
    textAlign: 'right',
  },

  // ── State boxes ────────────────────────────────────────────────────────────
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  stateText: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.red,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.brand,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
});