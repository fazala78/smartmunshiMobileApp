import React, {
    useState, useEffect, useRef, useCallback,
    forwardRef, useImperativeHandle,
} from 'react';
import {
    View, Text, TextInput, StyleSheet,
    TouchableOpacity, ViewStyle, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography } from '../theme';
import { searchContacts } from '../services/storage';

export interface BaseRecord {
    id?: number | string;
    name: string;
    //[key: string]: unknown;
}

interface DropdownItem<T extends BaseRecord> {
    label: string;
    value: string;
    _raw: T;
}

export interface AsyncDropdownRef {
    reset:  () => void;
    reload: () => void;
    focus:  () => void;
}

export interface CreatePayload { name: string; }

export interface LocalDropdownProps<T extends BaseRecord> {
    onSelect:          (record: T | null) => void;
    creatable?:        boolean;
    onCreate?:         (payload: CreatePayload) => void;
    createLabel?:      string;
    value?:            T | null;                    // ← parent passes full object
    labelResolver?:    (record: T) => string;
    subLabelResolver?: (record: T) => string | null | undefined;
    leadingIconName?:  string;
    placeholder?:      string;
    label?:            string;
    showLabel?:        boolean;
    minSearchLength?:  number;
    zIndex?:           number;
    disabled?:         boolean;
    style?:            ViewStyle;
    inputBg:           string;
}

function LocalDropdownInner<T extends BaseRecord>(
    {
        onSelect,
        creatable      = false,
        onCreate,
        createLabel    = 'Create',
        value          = null,
        labelResolver  = (r: T) => r.name,
        subLabelResolver,
        leadingIconName = 'person-outline',
        placeholder    = 'Search...',
        label          = 'Contact',
        showLabel      = true,
        minSearchLength = 1,
        zIndex         = 3000,
        disabled       = false,
        style,
        inputBg,
    }: LocalDropdownProps<T>,
    ref: React.ForwardedRef<AsyncDropdownRef>
) {
    const [open, setOpen]           = useState(false);
    const [inputText, setInputText] = useState('');
    const [selected, setSelected]   = useState<T | null>(null);
    const [items, setItems]         = useState<DropdownItem<T>[]>([]);

    const labelResolverRef    = useRef(labelResolver);
    const subLabelResolverRef = useRef(subLabelResolver);
    const selectedRef         = useRef<T | null>(null);
    const inputTextRef        = useRef('');
    const inputRef            = useRef<TextInput>(null);
    const isCreatingRef       = useRef(false);
    const isMounted           = useRef(true);

    labelResolverRef.current    = labelResolver;
    subLabelResolverRef.current = subLabelResolver;
    selectedRef.current         = selected;
    inputTextRef.current        = inputText;

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // ── Load from MMKV ─────────────────────────────────────────────────────────
    const loadRecords = useCallback((query: string = '') => {
        // searchContacts is sync — no loading state needed
        const results = searchContacts(query) as unknown as T[];
        const resolver = labelResolverRef.current;
        setItems(results.map(r => ({
            label: resolver(r),
            value: r.id !== undefined ? String(r.id) : '__new__',
            _raw:  r,
        })));
    }, []);

    // Initial load
    useEffect(() => { loadRecords(''); }, [loadRecords]);

    // ── Sync value from parent ─────────────────────────────────────────────────
    useEffect(() => {
        if (!value) {
            setSelected(null);
            return;
        }
        // value is the full object — use it directly
        setSelected(value as unknown as T);
        setInputText('');
    }, [value]);

    // ── Ref API ────────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        reset:  () => handleClear(),
        reload: () => loadRecords(inputTextRef.current),
        focus:  () => inputRef.current?.focus(),
    }));

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleFocus = () => {
        if (disabled) return;
        if (selected) { setSelected(null); setInputText(''); onSelect(null); }
        setOpen(true);
        loadRecords('');
    };

    const handleChangeText = (text: string) => {
        setInputText(text);
        loadRecords(text); // instant — no debounce needed for local search
    };

    const handleSelect = (item: DropdownItem<T>) => {
        setSelected(item._raw);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        onSelect(item._raw);
    };

    const handleClear = () => {
        setSelected(null);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        loadRecords('');
        onSelect(null);
    };

    const handleCreate = () => {
        const name = inputTextRef.current.trim();
        isCreatingRef.current = false;
        if (!name) return;
        const newRecord = { name } as unknown as T;
        setSelected(newRecord);
        setInputText('');
        setOpen(false);
        inputRef.current?.blur();
        onSelect(newRecord);
        onCreate?.({ name });
    };

    const handleBlur = () => {
        setTimeout(() => {
            if (!isMounted.current) return;
            if (isCreatingRef.current) return;
            setOpen(false);
            if (!selectedRef.current) setInputText('');
        }, 200);
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const showSelectedChip = selected !== null && !open;
    const showCreateRow    =
        creatable &&
        inputText.trim().length >= minSearchLength &&
        items.length === 0 &&
        !open === false; // only when open

    // ── Render (identical to your original) ───────────────────────────────────
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
                    <Icon name={leadingIconName} size={18} color={isChosen ? colors.primary : colors.gray400} />
                </View>
                <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemName, isChosen && styles.listItemNameSelected]} numberOfLines={1}>
                        {item.label}
                    </Text>
                    {sub ? <Text style={styles.listItemSub} numberOfLines={1}>{sub}</Text> : null}
                </View>
                {isChosen && <Icon name="check-circle" size={18} color={colors.primary} />}
            </TouchableOpacity>
        );
    };

    const renderDropdownBody = () => {
        if (items.length === 0 && !showCreateRow) {
            return (
                <View style={styles.stateBox}>
                    <Icon name="search-off" size={30} color={colors.gray300} />
                    <Text style={styles.stateText}>
                        {inputText ? `No results for "${inputText}"` : 'No contacts found'}
                    </Text>
                </View>
            );
        }
        return (
            <>
                <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {items.map((item, index) => (
                        <React.Fragment key={item.value}>
                            {index > 0 && <View style={styles.separator} />}
                            {renderItem({ item })}
                        </React.Fragment>
                    ))}
                </ScrollView>
                {showCreateRow && (
                    <>
                        <View style={styles.createDivider} />
                        <TouchableOpacity
                            style={styles.createRow}
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
                    </>
                )}
            </>
        );
    };

    return (
        <View style={[styles.wrapper, { zIndex }, style]}>
            {showLabel && <Text style={styles.label}>{label}</Text>}

            <TouchableOpacity
                style={styles.chipArea}
                onPress={() => {
                    setSelected(null); setInputText(''); onSelect(null);
                    setOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.inputBox, { backgroundColor: inputBg },
                    open && styles.inputBoxFocused,
                    disabled && styles.inputBoxDisabled,
                ]}>
                    <Icon name={open ? 'search' : leadingIconName} size={20}
                        color={open ? colors.primary : colors.gray400} />

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
                        {selected ? (
                            <TouchableOpacity onPress={handleClear}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                disabled={disabled}>
                                <Icon name="close" size={18} color={colors.gray400} />
                            </TouchableOpacity>
                        ) : (
                            <Icon name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                size={22} color={colors.gray400} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {open && <View style={styles.dropdown}>{renderDropdownBody()}</View>}
        </View>
    );
}

const LocalDropdown = forwardRef(LocalDropdownInner) as <T extends BaseRecord>(
    props: LocalDropdownProps<T> & { ref?: React.Ref<AsyncDropdownRef> }
) => React.ReactElement;

export default LocalDropdown;

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