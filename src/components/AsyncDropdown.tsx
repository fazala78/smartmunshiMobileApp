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
    Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors, typography } from '../theme';
import { Account } from '../types/Inventory';
import { Bank, Contact } from '../types/contact';
import { Cheque } from '../types/payments';

// ─────────────────────────────────────────────────────────────────────────────
// BASE RECORD
// ─────────────────────────────────────────────────────────────────────────────
export interface BaseRecord {
    id?: number | string;
    name: string;
    [key: string]: unknown;
}

// ─── Internal normalized list item ────────────────────────────────────────────
interface DropdownItem<T extends BaseRecord> {
    label: string;
    value: string;
    _raw: T;
}

// ─── Ref methods ──────────────────────────────────────────────────────────────
export interface AsyncDropdownRef {
    reset:  () => void;
    reload: () => void;
    focus:  () => void;
}

// ─── onCreate payload ─────────────────────────────────────────────────────────
export interface CreatePayload {
    name: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AsyncDropdownProps<T extends BaseRecord> {
    onSelect: (record: T | null) => void;
    onOpen?:           () => void;
    onClose?:          () => void;

    creatable?:        boolean;
    onCreate?:         (payload: CreatePayload) => void;
    createLabel?:      string;

    value: Contact | Account | null | Cheque | Bank;

    url?:              string;
    searchParam?:      string;
    responseMapper?:   (responseData: unknown) => T[];
    labelResolver?:    (record: T) => string;
    subLabelResolver?: (record: T) => string | null | undefined;
    leadingIconName?:  string;

    placeholder?:      string;
    label?:            string;
    showLabel?:        boolean;
    minSearchLength?:  number;
    debounceMs?:       number;
    zIndex?:           number;
    disabled?:         boolean;
    style?:            ViewStyle;
    inputBg:           string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function AsyncDropdownInner<T extends BaseRecord>(
    {
        onSelect,
        onOpen,
        onClose,
        creatable       = false,
        onCreate,
        createLabel     = 'Create',
        value           = null,
        url             = '/customers',
        searchParam     = 'search',
        responseMapper,
        labelResolver   = (r: T) => r.name,
        subLabelResolver,
        leadingIconName = 'person-outline',
        placeholder     = 'Search...',
        label           = 'Customer',
        showLabel       = true,
        minSearchLength = 1,
        debounceMs      = 350,
        zIndex          = 3000,
        disabled        = false,
        style,
        inputBg,
    }: AsyncDropdownProps<T>,
    ref: React.ForwardedRef<AsyncDropdownRef>
) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [open, setOpen]                     = useState<boolean>(false);
    const [inputText, setInputText]           = useState<string>('');
    const [selected, setSelected]             = useState<T | null>(null);
    const [items, setItems]                   = useState<DropdownItem<T>[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(false);
    const [searchLoading, setSearchLoading]   = useState<boolean>(false);
    const [error, setError]                   = useState<string | null>(null);

    // ── Stable refs ────────────────────────────────────────────────────────────
    const labelResolverRef    = useRef<(record: T) => string>(labelResolver);
    const responseMapperRef   = useRef<((data: unknown) => T[]) | undefined>(responseMapper);
    const subLabelResolverRef = useRef<((record: T) => string | null | undefined) | undefined>(subLabelResolver);
    const selectedRef         = useRef<T | null>(null);
    const inputTextRef        = useRef<string>('');      // mirrors inputText for closures
    const inputRef            = useRef<TextInput>(null);
    const debounceTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef  = useRef<AbortController | null>(null);
    const isMounted           = useRef<boolean>(true);
    const isCreatingRef       = useRef<boolean>(false);  // true while create row tap is in flight
    const willKeepOpenRef    = useRef<boolean>(false);  // true when onOpen-triggered dismiss should not close dropdown

    // Keep refs in sync with latest values on every render
    labelResolverRef.current    = labelResolver;
    responseMapperRef.current   = responseMapper;
    subLabelResolverRef.current = subLabelResolver;
    selectedRef.current         = selected;
    inputTextRef.current        = inputText;

    // ── Mount / unmount ────────────────────────────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            abortControllerRef.current?.abort();
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    // ── Ref API ────────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        reset:  () => handleClear(),
        reload: () => fetchRecords(inputTextRef.current, false),
        focus:  () => inputRef.current?.focus(),
    }));

    // ── Default response mapper ────────────────────────────────────────────────
    const defaultMapperFn = (data: unknown): T[] => {
        if (Array.isArray(data)) return data as T[];
        if (data && typeof data === 'object') {
            const found = Object.values(data as Record<string, unknown>).find(Array.isArray);
            if (found) return found as T[];
        }
        return [];
    };

    // ── Core fetch ─────────────────────────────────────────────────────────────
    const fetchRecords = useCallback(
        async (search: string = '', isInitial: boolean = false): Promise<void> => {
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

                const mapper    = responseMapperRef.current ?? defaultMapperFn;
                const list: T[] = mapper(response.data);
                const resolver  = labelResolverRef.current;

                const normalized: DropdownItem<T>[] = list.map((record) => ({
                    label: resolver(record),
                    value: record.id !== undefined ? String(record.id) : '__new__',
                    _raw:  record,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [url, searchParam]
    );

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        fetchRecords('', true);
    }, [fetchRecords]);

    // ── Sync external `value` prop ─────────────────────────────────────────────
    useEffect(() => {
        if (value === null) {
            setSelected(null);
            //setInputText('');
            return;
        }
        const found = items.find((i) => i.value === String(value));
        if (found) {
            setSelected(found._raw);
            setInputText('');
        }
    }, [value, items]);

    // ── Event handlers ─────────────────────────────────────────────────────────

    const handleFocus = (): void => {
        if (disabled) return;

        // Only clear if there is a confirmed saved selection.
        // Do NOT wipe inputText — the user may already be mid-typing
        // and re-focusing (e.g. after dismissing the keyboard briefly).
        if (selected) {
            setSelected(null);
            setInputText('');
            onSelect(null);
        }

        setOpen(true);
        // Guard against the blur that fires when onOpen calls Keyboard.dismiss()
        willKeepOpenRef.current = true;
        onOpen?.();

        // Auto-fetch only when the list is empty AND the input is also empty.
        // If the user already typed something, keep their search text + results.
        if (items.length === 0 && !initialLoading && inputTextRef.current.length === 0) {
            fetchRecords('', false);
        }
    };

    const handleChangeText = (text: string): void => {
        setInputText(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (text.length === 0) {
            fetchRecords('', false);
            return;
        }
        if (text.length < minSearchLength) return;

        debounceTimer.current = setTimeout(
            () => fetchRecords(text, false),
            debounceMs
        );
    };

    const handleSelect = (item: DropdownItem<T>): void => {
        setSelected(item._raw);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        onSelect(item._raw);
        onClose?.();
    };

    const handleClear = (): void => {
        setSelected(null);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        fetchRecords('', false);
        onSelect(null);
        onClose?.();
    };

    const handleCreate = (): void => {
        // Read from ref — not state — so blur can never race-clear it first
        const name = inputTextRef.current.trim();

        isCreatingRef.current = false; // reset flag after we've captured the value

        if (!name) return;

        const newRecord = { name } as unknown as T;

        setSelected(newRecord);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();

        onSelect(newRecord);
        onCreate?.({ name });
        onClose?.();
    };

    const handleBlur = (): void => {
        setTimeout(() => {
            if (!isMounted.current) return;

            // The "Create" row was tapped — do NOT clear anything here.
            // handleCreate reads inputTextRef and tidies up state itself.
            if (isCreatingRef.current) return;

            // onOpen triggered a Keyboard.dismiss() which caused this blur — keep dropdown open
            if (willKeepOpenRef.current) {
                willKeepOpenRef.current = false;
                return;
            }

            setOpen(false);
            onClose?.();

            // Only wipe the search text when nothing has been selected.
            if (!selectedRef.current) {
                setInputText('');
            }
        }, 200); // 200 ms gives onPressIn → onPress time to complete
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const showSelectedChip = selected !== null && !open;

    // NOTE: showCreateRow intentionally does NOT depend on `open`.
    // This means it stays truthy even during the brief blur→close
    // transition, so the row is visible long enough for the tap to register.
    const showCreateRow =
        creatable                                  &&
        inputText.trim().length >= minSearchLength &&
        items.length === 0                         &&
        !initialLoading                            &&
        !searchLoading                             &&
        !error;

    // ── Render helpers ─────────────────────────────────────────────────────────

    const renderItem = ({ item }: { item: DropdownItem<T> }) => {
        const isChosen = selected?.id !== undefined && String(selected.id) === item.value;
        const sub      = subLabelResolverRef.current?.(item._raw);

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
                        color={isChosen ? colors.primary : colors.gray400}
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

                {isChosen && <Icon name="check-circle" size={18} color={colors.primary} />}
            </TouchableOpacity>
        );
    };

    const renderCreateRow = () => (
        <TouchableOpacity
            style={styles.createRow}
            // onPressIn fires BEFORE the TextInput blur event fires,
            // so the flag is already set when handleBlur runs.
            onPressIn={() => { isCreatingRef.current = true; }}
            onPress={handleCreate}
            activeOpacity={0.7}
        >
            <View style={styles.createIconBox}>
                <Icon name="add" size={18} color={colors.primary} />
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
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.stateText}>Loading…</Text>
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
                        onPress={() => fetchRecords(inputTextRef.current, false)}
                    >
                        <Icon name="refresh" size={15} color={colors.primary} />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const isEmpty = items.length === 0;

        if (isEmpty && !showCreateRow) {
            return (
                <View style={styles.stateBox}>
                    <Icon name="search-off" size={30} color={colors.gray300} />
                    <Text style={styles.stateText}>
                        {inputText
                            ? `No results for "${inputText}"`
                            : 'No results found'}
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
                <View
                    style={[
                        styles.inputBox,
                        { backgroundColor: inputBg },
                        open     && styles.inputBoxFocused,
                        disabled && styles.inputBoxDisabled,
                    ]}
                >
                    <Icon
                        name={open ? 'search' : leadingIconName}
                        size={20}
                        color={open ? colors.primary : colors.gray400}
                    />

                    {showSelectedChip ? (
                        <View style={styles.chipRow}>
                            <Text style={styles.chipText} numberOfLines={1}>
                                {labelResolverRef.current(selected!)}
                            </Text>
                            {selected?.id === undefined && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newBadgeText}>New</Text>
                                </View>
                            )}
                        </View>
                    ) : (
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
                    )}

                    <View style={styles.trailingArea}>
                        {searchLoading && open ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : selected ? (
                            <TouchableOpacity
                                onPress={handleClear}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                disabled={disabled}
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
                </View>
            </TouchableOpacity>

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrapper: { gap: 6 },

    label: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textPlaceholder,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },

    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: colors.gray200,
        borderRadius: 8,
        minHeight: 48,
        paddingHorizontal: 12,
        gap: 8,
        borderWidth: 1.5,
    },
    inputBoxFocused:  { borderColor: colors.primary, backgroundColor: colors.white },
    inputBoxDisabled: { opacity: 0.5 },

    chipArea: { flex: 1, justifyContent: 'center' },
    chipRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipText: {
        fontSize: typography.body.fontSize,
        fontWeight: '600',
        color: colors.gray900,
        flexShrink: 1,
    },
    newBadge: {
        backgroundColor: colors.backgroundLight,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    newBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

    textInput: {
        flex: 1,
        fontSize: typography.body.fontSize,
        color: colors.gray900,
        paddingVertical: 0,
    },

    trailingArea: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    dropdown: {
        marginTop: 4,
        backgroundColor: colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gray200,
        maxHeight: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 7,
        overflow: 'hidden',
    },

    list:      { maxHeight: 260 },
    separator: { height: 1, backgroundColor: colors.gray200, marginHorizontal: 12 },

    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.white,
    },
    listItemSelected: { backgroundColor: colors.primary },

    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSelected: { backgroundColor: colors.primaryLight },

    listItemInfo:         { flex: 1 },
    listItemName: {
        fontSize: typography.body.fontSize,
        fontWeight: '600',
        color: colors.gray900,
    },
    listItemNameSelected: { color: colors.primaryLight },
    listItemSub:          { fontSize: 12, color: colors.gray400, marginTop: 2 },

    createDivider: { height: 1, backgroundColor: colors.gray200 },
    createRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.white,
    },
    createIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: 'dashed',
    },
    createText:      { flex: 1, fontSize: typography.body.fontSize, color: colors.gray700 },
    createHighlight: { fontWeight: '700', color: colors.gray900 },

    stateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        gap: 8,
    },
    stateText: { fontSize: 13, color: colors.gray400, textAlign: 'center' },
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
        backgroundColor: colors.backgroundLight,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
        marginTop: 4,
    },
    retryText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});