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
import { colors, typography } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  _isNew?: boolean; // flag for creatable option
}

export interface ProductDropdownRef {
  reset: () => void;
  reload: () => void;
  focus: () => void;
}

export interface ProductDropdownProps<T extends BaseRecord> {
  onSelect: (product: T) => void;
  /** Called when the user confirms a new product creation. Receives the typed name. */
  onCreate?: (name: string) => void;
  url?: string;
  searchParam?: string;
  placeholder?: string;
  label?: string;
  showLabel?: boolean;
  showBarcodeBtn?: boolean;
  onBarcodePress?: () => void;
  autoReset?: boolean;
  minSearchLength?: number;
  debounceMs?: number;
  zIndex?: number;
  disabled?: boolean;
  /** When true, shows a "Create '{query}'" row when no results match. */
  creatable?: boolean;
  /** Label prefix for the create row. Defaults to "Create". */
  createLabel?: string;
  style?: ViewStyle;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ProductDropdown = forwardRef<ProductDropdownRef, ProductDropdownProps<any>>(
  function ProductDropdown(
    {
      onSelect,
      onCreate,
      url = '/products',
      searchParam = 'search',
      placeholder = 'Search products or SKU...',
      label = 'Add Items',
      showLabel = true,
      showBarcodeBtn = true,
      onBarcodePress,
      autoReset = true,
      minSearchLength = 1,
      debounceMs = 350,
      zIndex = 2000,
      disabled = false,
      creatable = false,
      createLabel = 'Create',
      style,
    },
    ref
  ) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [open, setOpen]                     = useState<boolean>(false);
    const [inputText, setInputText]           = useState<string>('');
    const [items, setItems]                   = useState<ProductItem<any>[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [searchLoading, setSearchLoading]   = useState<boolean>(false);
    const [error, setError]                   = useState<string | null>(null);
    const [isCreating, setIsCreating]         = useState<boolean>(false);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const inputRef           = useRef<TextInput>(null);
    const debounceTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMounted          = useRef<boolean>(true);

    // ── Mount / unmount ────────────────────────────────────────────────────────
    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
        // Cancel any in-flight request and pending debounce on unmount
        abortControllerRef.current?.abort();
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, []);

    // ── Ref API ────────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      reset:  () => handleReset(),
      reload: () => fetchProducts(inputText, false),
      focus:  () => inputRef.current?.focus(),
    }));

    // ── Core fetch ─────────────────────────────────────────────────────────────
    const fetchProducts = useCallback(
      async (search: string = '', isInitial: boolean = false): Promise<void> => {
        // FIX: guard that was missing — clear list and bail on empty search
        if (!isInitial && search.length === 0) {
          setItems([]);
          return;
        }

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

          // Support: T[] | { data: T[] } | { products: T[] }
          const raw = response.data;
          const list: any[] = Array.isArray(raw)
            ? raw
            : raw?.data ?? raw?.products ?? [];

          const normalized: ProductItem<any>[] = list.map((p) => ({
            label: p.name  ?? p.title ?? '',
            value: String(p.id),
            price: parseFloat(String(p.price ?? p.sale_price ?? p.unit_price ?? 0)),
            image: p.image ?? p.image_url ?? p.thumbnail ?? null,
            sku:   p.sku   ?? p.code   ?? null,
            _raw:  p,
          }));

          setItems(normalized);
        } catch (err: unknown) {
          const e = err as {
            name?: string;
            response?: { data?: { message?: string } };
            message?: string;
          };
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

    useEffect(() => {
      fetchProducts('', true);
    }, [fetchProducts]);

    // ── Derived: show creatable row ────────────────────────────────────────────
    /**
     * Show the "Create" row when:
     *  - `creatable` prop is enabled
     *  - user has typed something (trimmed, meets minSearchLength)
     *  - no exact-name match already exists in the list
     *  - not currently loading
     */
    const trimmedInput = inputText.trim();
    const showCreateRow =
      creatable &&
      trimmedInput.length >= minSearchLength &&
      !searchLoading &&
      !initialLoading &&
      !items.some(
        (item) => item.label.toLowerCase() === trimmedInput.toLowerCase()
      );

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleRowPress = (): void => {
      if (disabled) return;
      if (open) {
        inputRef.current?.focus();
        return;
      }
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleFocus = (): void => {
      if (disabled) return;
      setOpen(true);
    };

    const handleChangeText = (text: string): void => {
      setInputText(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (text.length === 0) {
        setItems([]);
        return;
      }
      if (text.length < minSearchLength) return;

      debounceTimer.current = setTimeout(() => fetchProducts(text, false), debounceMs);
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
      setIsCreating(false);
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
      setItems([]);
      inputRef.current?.focus();
    };

    /**
     * Called when the user taps "Create '{name}'".
     * Calls the `onCreate` callback with the trimmed input, then resets.
     */
    const handleCreate = async (): Promise<void> => {
      if (!trimmedInput || isCreating) return;
      setIsCreating(true);
      try {
        // Build a minimal synthetic product and fire onSelect immediately,
        // matching the same shape callers expect from a real search result.
        const syntheticProduct = {
          name: trimmedInput,
           label: trimmedInput,
            value: trimmedInput,
          price: 0,
          quantity: 1,
          sku: null,
          _isNew: true,   // callers can use this flag to detect new products
        };
        onSelect(syntheticProduct as any);

        // Also fire the optional onCreate so the parent can persist it
        await onCreate?.(trimmedInput);
      } finally {
        if (isMounted.current) {
          setIsCreating(false);
          if (autoReset) handleReset();
          else {
            setOpen(false);
            inputRef.current?.blur();
          }
        }
      }
    };

    // ── Render helpers ─────────────────────────────────────────────────────────

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
            <Text style={styles.listItemName} numberOfLines={1}>
              {item.label}
            </Text>
            {item.sku && (
              <Text style={styles.listItemSku}>SKU: {item.sku}</Text>
            )}
          </View>

          <Text style={styles.listItemPrice}>${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
      </React.Fragment>
    );

    /**
     * "Create '{name}'" row — shown at the bottom of the list (or alone)
     * when `showCreateRow` is true.
     */
    const renderCreateRow = () => (
      <React.Fragment>
        {items.length > 0 && <View style={styles.separator} />}
        <TouchableOpacity
          style={styles.createRow}
          onPress={handleCreate}
          activeOpacity={0.75}
          disabled={isCreating}
        >
          <View style={styles.createIconWrapper}>
            {isCreating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="add" size={16} color={colors.white} />
            )}
          </View>

          <View style={styles.listItemInfo}>
            <Text style={styles.createRowText} numberOfLines={1}>
              {isCreating
                ? 'Creating…'
                : `${createLabel} "${trimmedInput}"`}
            </Text>
            <Text style={styles.createRowHint}>
              Add as a new product
            </Text>
          </View>

          {!isCreating && (
            <Icon name="chevron-right" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </React.Fragment>
    );

    const renderDropdownBody = () => {
      if (initialLoading) {
        return (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Loading products…</Text>
          </View>
        );
      }

      if (error) {
        return (
          <View style={styles.stateBox}>
            <Icon name="error-outline" size={22} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchProducts(inputText, false)}
            >
              <Icon name="refresh" size={15} color={colors.primary} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (searchLoading) {
        return (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Searching…</Text>
          </View>
        );
      }

      // No results and no creatable option → empty state
      if (items.length === 0 && !showCreateRow && inputText.length > 0) {
        return (
          <View style={styles.stateBox}>
            <Icon name="inventory-2" size={30} color={colors.gray300} />
            <Text style={styles.stateText}>No results for "{inputText}"</Text>
          </View>
        );
      }

      // Prompt before the user starts typing
      if (items.length === 0 && inputText.length === 0) {
        return (
          <View style={styles.stateBox}>
            <Icon name="search" size={28} color={colors.gray300} />
            <Text style={styles.stateText}>Type to search products</Text>
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
          {showCreateRow && items.length === 0 && renderCreateRow()}
        </ScrollView>
      );
    };

    // ── Root ───────────────────────────────────────────────────────────────────
    return (
      <View style={[styles.wrapper, { zIndex }, style]}>
        {showLabel && <Text style={styles.label}>{label}</Text>}

        {/* ── Input row ── */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[
              styles.inputBox,
              open && styles.inputBoxFocused,
              disabled && styles.inputBoxDisabled,
            ]}
            onPress={handleRowPress}
            activeOpacity={0.85}
            accessible={false}
          >
            <Icon
              name="search"
              size={20}
              color={open ? colors.primary : colors.gray400}
            />

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
              {searchLoading && open ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : inputText.length > 0 ? (
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

          {/* Barcode button — always shown when showBarcodeBtn=true.
              onPress is guarded so it's a no-op when no handler is provided. */}
          {showBarcodeBtn && (
            <TouchableOpacity
              style={[styles.barcodeBtn, disabled && styles.inputBoxDisabled]}
              onPress={() => onBarcodePress?.()}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Icon name="qr-code-scanner" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Suggestion list ── */}
        {open && (
          <View style={styles.dropdown}>
            {renderDropdownBody()}
          </View>
        )}
      </View>
    );
  }
);

export default ProductDropdown;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPlaceholder,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Input row ──────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  inputBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputBoxDisabled: { opacity: 0.5 },

  textInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.gray900,
    paddingVertical: 2,
  },

  trailingArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  barcodeBtn: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    width: 48,
  },

  // ── Dropdown ───────────────────────────────────────────────────────────────
  dropdown: {
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
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
    backgroundColor: colors.gray200,
    marginHorizontal: 12,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },

  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  listItemInfo: { flex: 1 },

  listItemName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.gray900,
  },
  listItemSku: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 3,
  },
  listItemPrice: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.gray700,
    minWidth: 54,
    textAlign: 'right',
  },

  // ── Create row ─────────────────────────────────────────────────────────────
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',  // subtle green tint to distinguish from normal rows
  },
  createIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createRowText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.primary,
  },
  createRowHint: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 3,
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
    color: colors.gray400,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
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
    borderColor: colors.primary,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});