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
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ViewStyle,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// BASE RECORD
//
// Extend this interface for every entity you use the dropdown with:
//
//   import { BaseRecord } from './aysncDropdown';
//
//   export interface aysnc extends BaseRecord {
//     id: number; name: string; phone: string;
//     email: string; type: string; route: string;
//     currency: Currency; balance: number;
//   }
//
//   export interface Account extends BaseRecord {
//     id: number; name: string; code: string; category: string;
//   }
//
//   export interface Vendor extends BaseRecord {
//     id: number; name: string; phone: string; tax_id: string;
//   }
//
// Usage:
//   <aysncDropdown<aysnc> url="/customers" ... />
//   <aysncDropdown<Account> url="/accounts"  ... />
//   <aysncDropdown<Vendor>  url="/vendors"   ... />
// ─────────────────────────────────────────────────────────────────────────────
export interface BaseRecord {
    /** undefined when the record is newly created and not yet saved to the DB */
    id?: number | string;
    name: string;
    [key: string]: unknown;
}

// ─── Internal normalized list item ────────────────────────────────────────────
interface DropdownItem<T extends BaseRecord> {
    label: string;
    value: string; // "__new__" for unsaved created records
    _raw: T;
}

// ─── Ref methods ──────────────────────────────────────────────────────────────
export interface AsyncDropdownRef {
    reset: () => void; // clears selection + search, reloads list
    reload: () => void; // re-fetches with the current search text
    focus: () => void; // focuses the input (opens the dropdown)
}

// ─── onCreate payload ─────────────────────────────────────────────────────────
export interface CreatePayload {
    name: string; // exactly what the user typed
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AsyncDropdownProps<T extends BaseRecord> {
    /** Required — fires with the full T object on pick, or null on clear */
    onSelect: (record: T | null) => void;

    // Creatable
    /**
     * Show a "Create '{text}'" row when search returns no results.
     * @default false
     */
    creatable?: boolean;
    /** Fires when the user presses the create row */
    onCreate?: (payload: CreatePayload) => void;
    /** Prefix for the create row label — default "Create" */
    createLabel?: string;

    // Pre-selection
    value?: number | string | null;

    // API
    /** @default '/customers' */
    url?: string;
    /** Query-param key for the search term — @default 'search' */
    searchParam?: string;
    /**
     * Map raw API response → T[].
     * Default supports: T[] | { data: T[] } | { [anyKey]: T[] }
     *
     * ⚠️  Pass a STABLE reference (defined outside the component or wrapped in
     * useCallback) — this function is called inside a ref so it won't trigger
     * re-renders, but a stable reference is still good practice.
     */
    responseMapper?: (responseData: unknown) => T[];
    /**
     * Build the display label for each row.
     * @default (r) => r.name
     *
     * ⚠️  Pass a STABLE reference (useMemo / useCallback / defined outside
     * the component) or the dropdown will still work correctly but you may
     * see a lint warning about the exhaustive-deps rule.
     */
    labelResolver?: (record: T) => string;
    /**
     * Secondary line shown under the label (phone, code, email …).
     * Same stability note as labelResolver.
     */
    subLabelResolver?: (record: T) => string | null | undefined;
    /** MaterialIcons icon name — @default 'person-outline' */
    leadingIconName?: string;

    // UI
    placeholder?: string;
    label?: string;
    showLabel?: boolean;
    minSearchLength?: number;
    debounceMs?: number;
    zIndex?: number;
    disabled?: boolean;
    style?: ViewStyle;
    inputBg:string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function AsyncDropdownInner<T extends BaseRecord>(
    {
        onSelect,
        creatable = false,
        onCreate,
        createLabel = 'Create',
        value = null,
        url = '/customers',
        searchParam = 'search',
        responseMapper,
        labelResolver = (r: T) => r.name,
        subLabelResolver,
        leadingIconName = 'person-outline',
        placeholder = 'Search...',
        label = 'Customer',
        showLabel = true,
        minSearchLength = 1,
        debounceMs = 350,
        zIndex = 3000,
        disabled = false,
        style,
        inputBg,
    }: AsyncDropdownProps<T>,
    ref: React.ForwardedRef<AsyncDropdownRef>
) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [open, setOpen] = useState<boolean>(false);
    const [inputText, setInputText] = useState<string>('');
    const [selected, setSelected] = useState<T | null>(null);

    const [items, setItems] = useState<DropdownItem<T>[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [searchLoading, setSearchLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // ── Stable refs ────────────────────────────────────────────────────────────
    //
    // ROOT CAUSE OF THE INFINITE LOOP:
    // ──────────────────────────────────────────────────────────────────────────
    // When props like `labelResolver` or `responseMapper` are inline arrow
    // functions, they get a NEW reference on every parent render.
    // That makes `fetchRecords` (via useCallback) also get a new reference,
    // which re-triggers the `useEffect(() => fetchRecords('', true), [fetchRecords])`
    // on every render → infinite API calls.
    //
    // FIX: Store those function props in refs. `fetchRecords` then only
    // depends on the PRIMITIVE props `url` and `searchParam`, which are
    // stable strings that don't change on every render.
    //
    const labelResolverRef = useRef<(record: T) => string>(labelResolver);
    const responseMapperRef = useRef<((data: unknown) => T[]) | undefined>(responseMapper);
    const subLabelResolverRef = useRef<((record: T) => string | null | undefined) | undefined>(subLabelResolver);
    const selectedRef = useRef<T | null>(null);    // for handleBlur closure
    const inputRef = useRef<TextInput>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMounted = useRef<boolean>(true);

    // Keep refs in sync with latest prop values on every render (no extra effect needed)
    labelResolverRef.current = labelResolver;
    responseMapperRef.current = responseMapper;
    subLabelResolverRef.current = subLabelResolver;
    selectedRef.current = selected;

    // ── Mount / unmount ────────────────────────────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            abortControllerRef.current?.abort();
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []); // ← empty array: runs once only

    // ── Ref API ────────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        reset: () => handleClear(),
        reload: () => fetchRecords(inputText, false),
        focus: () => inputRef.current?.focus(),
    }));

    // ── Default response mapper ────────────────────────────────────────────────
    // Defined OUTSIDE fetchRecords (no re-creation on every call) and does NOT
    // live in the dependency array — it's called via responseMapperRef instead.
    const defaultMapperFn = (data: unknown): T[] => {
        if (Array.isArray(data)) return data as T[];
        if (data && typeof data === 'object') {
            const found = Object.values(data as Record<string, unknown>).find(Array.isArray);
            if (found) return found as T[];
        }
        return [];
    };

    // ── Core fetch ─────────────────────────────────────────────────────────────
    // Dependency array contains ONLY stable primitive props: url, searchParam.
    // All callback props are accessed through refs, so they are intentionally
    // excluded from the dependency array — this is the key fix.
    const fetchRecords = useCallback(
        async (search: string = '', isInitial: boolean = false): Promise<void> => {
            // Cancel any in-flight request
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();

            if (isInitial) setInitialLoading(true);
            else setSearchLoading(true);
            setError(null);

            try {
                const response = await api.get(url, {
                    params: search ? { [searchParam]: search } : {},
                    signal: abortControllerRef.current.signal,
                });

                if (!isMounted.current) return;

                // Use the ref — never the closure-captured prop value
                const mapper = responseMapperRef.current ?? defaultMapperFn;
                const list: T[] = mapper(response.data);

                const resolver = labelResolverRef.current;
                const normalized: DropdownItem<T>[] = list.map((record) => ({
                    label: resolver(record),
                    value: record.id !== undefined ? String(record.id) : '__new__',
                    _raw: record,
                }));

                setItems(normalized);
            } catch (err: unknown) {
                const e = err as {
                    name?: string;
                    response?: { data?: { message?: string } };
                    message?: string;
                };
                // Cancelled requests are not errors
                if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
                if (!isMounted.current) return;
                setError(
                    e?.response?.data?.message ?? e?.message ?? 'Failed to load results'
                );
            } finally {
                if (isMounted.current) {
                    setInitialLoading(false);
                    setSearchLoading(false);
                }
            }
        },
        // ↓ ONLY stable string primitives — never functions or objects
        [url, searchParam]
    );

    // ── Initial load — fires exactly ONCE (when fetchRecords is first created) ─
    // Because fetchRecords only changes when url or searchParam change,
    // this effect also only re-runs when those strings actually change.
    useEffect(() => {
        fetchRecords('', true);
    }, [fetchRecords]);

    // ── Sync external `value` prop ────────────────────────────────────────────
    useEffect(() => {
        if (value == null) return;
        const found = items.find((i) => i.value === String(value));
        if (found) { setSelected(found._raw); setInputText(''); }
    }, [value, items]);

    // ── Event handlers ─────────────────────────────────────────────────────────

    const handleFocus = (): void => {
        if (disabled) return;
        if (selected) {
            setSelected(null);
            setInputText('');
            onSelect(null);
        }
        setOpen(true);
        if (items.length === 0 && !initialLoading) fetchRecords('', false);
    };

    const handleChangeText = (text: string): void => {
        setInputText(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (text.length === 0) { fetchRecords('', false); return; }
        if (text.length < minSearchLength) return;
        debounceTimer.current = setTimeout(() => fetchRecords(text, false), debounceMs);
    };

    const handleSelect = (item: DropdownItem<T>): void => {
        setSelected(item._raw);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        onSelect(item._raw);
    };

    const handleClear = (): void => {
        setSelected(null);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        fetchRecords('', false);
        onSelect(null);
    };

    const handleCreate = (): void => {
        const name = inputText.trim();
        if (!name) return;

        // Build a minimal T-shaped object with no id (not yet saved to DB).
        // Cast is safe: the parent knows id is absent because BaseRecord.id is optional.
        const newRecord = { name } as unknown as T;

        setSelected(newRecord);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();

        // Fire both callbacks so the parent can:
        //  - show the name in the form immediately  (onSelect)
        //  - open a create modal / call the API     (onCreate)
        onSelect(newRecord);
        onCreate?.({ name });
    };

    // Delayed 150 ms so a list-row tap registers before the list closes
    const handleBlur = (): void => {
        setTimeout(() => {
            if (!isMounted.current) return;
            setOpen(false);
            if (!selectedRef.current) setInputText('');
        }, 150);
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const showSelectedChip = selected !== null && !open;

    const showCreateRow =
        creatable &&
        inputText.trim().length >= minSearchLength &&
        items.length === 0 &&
        !initialLoading &&
        !searchLoading &&
        !error;

    // ── Render helpers ─────────────────────────────────────────────────────────

    const renderItem = ({ item }: { item: DropdownItem<T> }) => {
        const isChosen = selected?.id !== undefined && String(selected.id) === item.value;
        const sub = subLabelResolverRef.current?.(item._raw);

        return (
            <TouchableOpacity
                style={[styles.listItem, isChosen && styles.listItemSelected]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.avatar, isChosen && styles.avatarSelected]}>
                    <Icon
                        name={leadingIconName}
                        size={18}
                        color={isChosen ? COLORS.brand : COLORS.gray400}
                    />
                </View>

                <View style={styles.listItemInfo}>
                    <Text
                        style={[styles.listItemName, isChosen && styles.listItemNameSelected]}
                        numberOfLines={1}
                    >
                        {item.label}
                    </Text>
                    {sub ? (
                        <Text style={styles.listItemSub} numberOfLines={1}>{sub}</Text>
                    ) : null}
                </View>

                {isChosen && <Icon name="check-circle" size={18} color={COLORS.brand} />}
            </TouchableOpacity>
        );
    };

    const renderCreateRow = () => (
        <TouchableOpacity style={styles.createRow} onPress={handleCreate} activeOpacity={0.7}>
            <View style={styles.createIconBox}>
                <Icon name="add" size={18} color={COLORS.brand} />
            </View>
            <Text style={styles.createText}>
                {createLabel}{' '}
                <Text style={styles.createHighlight}>"{inputText.trim()}"</Text>
            </Text>
        </TouchableOpacity>
    );

    const renderDropdownBody = () => {
        if (initialLoading) {
            return (
                <View style={styles.stateBox}>
                    <ActivityIndicator size="small" color={COLORS.brand} />
                    <Text style={styles.stateText}>Loading…</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.stateBox}>
                    <Icon name="error-outline" size={22} color={COLORS.red} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRecords(inputText, false)}>
                        <Icon name="refresh" size={15} color={COLORS.brand} />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const isEmpty = items.length === 0;

        if (isEmpty && !showCreateRow) {
            return (
                <View style={styles.stateBox}>
                    <Icon name="search-off" size={30} color={COLORS.gray300} />
                    <Text style={styles.stateText}>
                        {inputText ? `No results for "${inputText}"` : 'No results found'}
                    </Text>
                </View>
            );
        }

        return (
            <>
                {!isEmpty && (

                    <ScrollView
                        style={styles.list}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled          // ← key prop that allows nesting inside a ScrollView
                    >
                        {items.map((item, index) => (
                            <React.Fragment key={item.value}>
                                {index > 0 && <View style={styles.separator} />}
                                {renderItem({ item })}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                )}
                {showCreateRow && (
                    <>
                        {!isEmpty && <View style={styles.createDivider} />}
                        {renderCreateRow()}
                    </>
                )}
            </>
        );
    };

    // ── Root ───────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.wrapper, { zIndex }, style]}>
            {showLabel && <Text style={styles.label}>{label}</Text>}

            {/* Combobox input */}
            <View
                style={[
                    styles.inputBox,{ backgroundColor: inputBg },
                    open && styles.inputBoxFocused,
                    disabled && styles.inputBoxDisabled,
                ]}
            >
                <Icon
                    name={open ? 'search' : leadingIconName}
                    size={20}
                    color={open ? COLORS.brand : COLORS.gray400}
                />

                {showSelectedChip ? (
                    <TouchableOpacity
                        style={styles.chipArea}
                        onPress={() => {
                            setSelected(null);
                            setInputText('');
                            onSelect(null);
                            setOpen(true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        disabled={disabled}
                        activeOpacity={0.7}
                    >
                        <View style={styles.chipRow}>
                            <Text style={styles.chipText} numberOfLines={1}>
                                {labelResolverRef.current(selected!)}
                            </Text>
                            {/* Show a 'New' badge when the record has no id yet */}
                            {selected?.id === undefined && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newBadgeText}>New</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ) : (
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
                )}

                <View style={styles.trailingArea}>
                    {searchLoading && open ? (
                        <ActivityIndicator size="small" color={COLORS.brand} />
                    ) : selected ? (
                        <TouchableOpacity
                            onPress={handleClear}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

            {/* Suggestion list */}
            {open && <View style={styles.dropdown}>{renderDropdownBody()}</View>}
        </View>
    );
}

// ─── forwardRef + generic cast ────────────────────────────────────────────────
const AsyncDropdown = forwardRef(AsyncDropdownInner) as <T extends BaseRecord>(
    props: AsyncDropdownProps<T> & { ref?: React.Ref<AsyncDropdownRef> }
) => React.ReactElement;

export default AsyncDropdown;

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLORS = {
    brand: colors.primary,
    brandBg: '#f0fdf4',
    inputBg: colors.backgroundLight,
    white: colors.white,
    gray900: '#111827',
    gray700: '#374151',
    gray400: '#9ca3af',
    gray300: '#d1d5db',
    gray200: '#e5e7eb',
    red: colors.error,
    green900: '#166534',
    green100: '#dcfce7',
} as const;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrapper: { gap: 6 },

    label: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },

    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
       // backgroundColor: COLORS.inputBg,
       borderColor:colors.gray200,
        borderRadius: 8,
        minHeight: 48,
        paddingHorizontal: 12,
        gap: 8,
        borderWidth: 1.5,
    },
    inputBoxFocused: {
        borderColor: COLORS.brand,
        backgroundColor: COLORS.white,
    },
    inputBoxDisabled: { opacity: 0.5 },

    chipArea: { flex: 1, justifyContent: 'center' },
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipText: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, flexShrink: 1 },
    newBadge: {
        backgroundColor: COLORS.brandBg,
        borderWidth: 1,
        borderColor: COLORS.brand,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    newBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.brand },

    textInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.gray900,
        paddingVertical: 0,
    },

    trailingArea: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    dropdown: {
        marginTop: 4,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        maxHeight: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 7,
        overflow: 'hidden',
    },

    list: { maxHeight: 260 },
    separator: { height: 1, backgroundColor: COLORS.gray200, marginHorizontal: 12 },

    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
    },
    listItemSelected: { backgroundColor: COLORS.brandBg },

    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.inputBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSelected: { backgroundColor: COLORS.green100 },

    listItemInfo: { flex: 1 },
    listItemName: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
    listItemNameSelected: { color: COLORS.green900 },
    listItemSub: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },

    createDivider: { height: 1, backgroundColor: COLORS.gray200 },
    createRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
    },
    createIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.brandBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.brand,
        borderStyle: 'dashed',
    },
    createText: { flex: 1, fontSize: 14, color: COLORS.gray700 },
    createHighlight: { fontWeight: '700', color: COLORS.gray900 },

    stateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        gap: 8,
    },
    stateText: { fontSize: 13, color: COLORS.gray400, textAlign: 'center' },
    errorText: { fontSize: 13, color: COLORS.red, textAlign: 'center', paddingHorizontal: 16 },

    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.brandBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.brand,
        marginTop: 4,
    },
    retryText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
});