import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api';
import { colors } from '../theme';
import { ExpenseAccount } from '../types/payments';

// ── Name → icon mapping (checked top-to-bottom, first match wins) ─────────────
const ICON_RULES: [string[], string][] = [
    [['wages', 'salaries', 'salary', 'payroll'],        'people'],
    [['international'],                                   'flight'],
    [['travel'],                                          'directions-car'],
    [['telephone', 'internet', 'phone'],                 'wifi'],
    [['subscription'],                                    'subscriptions'],
    [['courier', 'freight'],                              'local-shipping'],
    [['shipping'],                                        'local-shipping'],
    [['discount'],                                        'local-offer'],
    [['repair', 'maintenance'],                           'build'],
    [['rent', 'lease'],                                   'home'],
    [['print', 'stationery'],                             'print'],
    [['office'],                                          'business-center'],
    [['motor', 'vehicle'],                                'directions-car'],
    [['legal'],                                           'gavel'],
    [['insurance'],                                       'security'],
    [['entertainment'],                                   'movie'],
    [['electricity'],                                     'bolt'],
    [['depreciation'],                                    'trending-down'],
    [['cost of goods', 'cogs'],                           'store'],
    [['consulting'],                                      'work'],
    [['charity'],                                         'volunteer-activism'],
    [['advertising', 'marketing'],                        'campaign'],
    [['general'],                                         'account-balance-wallet'],
];

function getIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const [keywords, icon] of ICON_RULES) {
        if (keywords.some(k => lower.includes(k))) return icon;
    }
    return 'receipt';
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    value: ExpenseAccount | null | undefined;
    onSelect: (account: ExpenseAccount) => void;
}

const QUICK_COUNT = 3;

export default function ExpenseAccountPicker({ value, onSelect }: Props) {
    const [accounts, setAccounts]   = useState<ExpenseAccount[]>([]);
    const [loading, setLoading]     = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [search, setSearch]       = useState('');

    useEffect(() => {
        let alive = true;
        api.get('/expense-account')
            .then(res => {
                if (!alive) return;
                const raw = res.data;
                const list: ExpenseAccount[] =
                    Array.isArray(raw?.data) ? raw.data :
                    Array.isArray(raw)        ? raw       : [];
                setAccounts(list);
            })
            .catch(() => {})
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    // First 3 quick tiles; if selected is outside them swap it into the last slot
    const quickTiles = useMemo(() => {
        const base = accounts.slice(0, QUICK_COUNT);
        if (!value || base.some(a => a.id === value.id)) return base;
        return [...base.slice(0, QUICK_COUNT - 1), value];
    }, [accounts, value]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter(
            a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
        );
    }, [accounts, search]);

    const handleSelect = (account: ExpenseAccount) => {
        onSelect(account);
        setSheetOpen(false);
        setSearch('');
    };

    const openSheet = () => setSheetOpen(true);
    const closeSheet = () => { setSheetOpen(false); setSearch(''); };

    // ── Tile ──────────────────────────────────────────────────────────────────
    const renderTile = (account: ExpenseAccount) => {
        const active = value?.id === account.id;
        return (
            <TouchableOpacity
                key={account.id}
                style={[styles.tile, active && styles.tileActive]}
                onPress={() => onSelect(account)}
                activeOpacity={0.7}
            >
                <View style={[styles.tileIconWrap, active && styles.tileIconWrapActive]}>
                    <Icon
                        name={getIcon(account.name)}
                        size={18}
                        color={active ? colors.white : colors.gray400}
                    />
                </View>
                <Text
                    style={[styles.tileName, active && styles.tileNameActive]}
                    numberOfLines={2}
                >
                    {account.name}
                </Text>
            </TouchableOpacity>
        );
    };

    // ── Root ──────────────────────────────────────────────────────────────────
    return (
        <View>
            <Text style={styles.label}>
                EXPENSE ACCOUNT <Text style={styles.req}>*</Text>
            </Text>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <View style={styles.tilesRow}>
                    {quickTiles.map(renderTile)}

                    {/* More tile */}
                    <TouchableOpacity
                        style={styles.tile}
                        onPress={openSheet}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tileIconWrap}>
                            <Icon name="apps" size={18} color={colors.gray400} />
                        </View>
                        <Text style={styles.tileName}>More</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Bottom sheet ─────────────────────────────────────────────── */}
            <Modal
                visible={sheetOpen}
                transparent
                animationType="slide"
                onRequestClose={closeSheet}
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    {/* Tap-outside-to-close */}
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} activeOpacity={1} />

                    <SafeAreaView style={styles.sheet} edges={['bottom']}>
                        {/* Handle */}
                        <View style={styles.grip} />

                        <Text style={styles.sheetTitle}>Choose Expense Account</Text>

                        {/* Search */}
                        <View style={styles.searchBox}>
                            <Icon name="search" size={18} color={colors.gray400} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or code..."
                                placeholderTextColor={colors.gray400}
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                            {search.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearch('')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="close" size={16} color={colors.gray400} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Account list */}
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {filtered.map((account, i) => {
                                const active = value?.id === account.id;
                                return (
                                    <React.Fragment key={account.id}>
                                        {i > 0 && <View style={styles.separator} />}
                                        <TouchableOpacity
                                            style={[styles.listRow, active && styles.listRowActive]}
                                            onPress={() => handleSelect(account)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.listIconWrap, active && styles.listIconWrapActive]}>
                                                <Icon
                                                    name={getIcon(account.name)}
                                                    size={18}
                                                    color={active ? colors.primary : colors.gray400}
                                                />
                                            </View>
                                            <View style={styles.listInfo}>
                                                <Text style={[styles.listName, active && styles.listNameActive]}>
                                                    {account.name}
                                                </Text>
                                                <Text style={styles.listCode}>Code: {account.code}</Text>
                                            </View>
                                            {active && (
                                                <Icon name="check-circle" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    </React.Fragment>
                                );
                            })}

                            {filtered.length === 0 && (
                                <View style={styles.emptyBox}>
                                    <Icon name="search-off" size={30} color={colors.gray300} />
                                    <Text style={styles.emptyText}>No accounts found</Text>
                                </View>
                            )}

                            <View style={{ height: 16 }} />
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    label: {
        fontSize: 10, fontWeight: '800', color: colors.textPlaceholder,
        letterSpacing: 1.2, marginBottom: 10,
    },
    req: { color: colors.danger },

    loadingBox: {
        height: 100, alignItems: 'center', justifyContent: 'center',
        borderRadius: 12, backgroundColor: colors.backgroundLight,
        borderWidth: 1.5, borderColor: colors.gray200,
    },

    // ── Quick tiles ───────────────────────────────────────────────────────────
    tilesRow: { flexDirection: 'row', gap: 8 },
    tile: {
        flex: 1, alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 4,
        backgroundColor: colors.backgroundLight,
        borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray200,
    },
    tileActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    tileIconWrap: {
        width: 32, height: 32, borderRadius: 9,
        backgroundColor: colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    tileIconWrapActive: { backgroundColor: colors.primary },
    tileName: {
        fontSize: 9.5, fontWeight: '600', color: colors.gray600,
        textAlign: 'center', lineHeight: 13,
    },
    tileNameActive: { color: colors.primary },

    // ── Sheet ─────────────────────────────────────────────────────────────────
    overlay: {
        flex: 1,
        backgroundColor: colors.backgroundOverlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingHorizontal: 16,
        maxHeight: '75%',
    },
    grip: {
        width: 40, height: 5, borderRadius: 99,
        backgroundColor: colors.gray300,
        alignSelf: 'center', marginVertical: 10,
    },
    sheetTitle: {
        fontSize: 16, fontWeight: '700', color: colors.gray900,
        marginBottom: 14,
    },

    // ── Search ────────────────────────────────────────────────────────────────
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.backgroundLight,
        borderRadius: 10, borderWidth: 1.5, borderColor: colors.gray200,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    },
    searchInput: {
        flex: 1, fontSize: 14, color: colors.gray900, paddingVertical: 0,
    },

    // ── List rows ─────────────────────────────────────────────────────────────
    separator: { height: 1, backgroundColor: colors.gray100, marginHorizontal: 8 },
    listRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
    },
    listRowActive: { backgroundColor: colors.primaryMuted },
    listIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    listIconWrapActive: { backgroundColor: colors.primaryLight },
    listInfo: { flex: 1 },
    listName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
    listNameActive: { color: colors.primary },
    listCode: { fontSize: 11, color: colors.gray400, marginTop: 1 },

    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 13, color: colors.gray400 },
});
