import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import InputField from '../components/ui/InputField';
import AsyncDropdown from '../components/AsyncDropdown';
import useCurrency from '../utils/currency';
import { JournalEntry } from '../types/manualJournalEntry';
import DatePickerField from '../components/DatePickerField';
import { toDateString } from '../utils/stringUtils';
import { postJournalEntries } from '../services/journalEntryService';
import SuccessModal, { SuccessResponse } from './modals/SuccessModal';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { useSuccessSound } from '../utils/useSuccessSound';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'JournalEntry'>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;
const emptyDraft = (): JournalEntry => ({
    id: 0,
    reference: '',
    amount: '',
    remarks: '',
    debit_account: null,
    credit_account: null,
    currency: null,
    date: new Date(),
});

/** Keep the hero amount field a clean decimal string — digits + one dot, max 2 dp */
const cleanAmount = (v: string): string => {
    const stripped = v.replace(/[^0-9.]/g, '');
    const parts = stripped.split('.');
    return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : stripped;
};

const accountName = (a: any | null): string => a?.name ?? a?.label ?? '';

// ─── Saved-line row ───────────────────────────────────────────────────────────

interface LineItemProps {
    entry: JournalEntry;
    active: boolean;
    currencySymbol: string;
    onPress: () => void;
    onRemove: () => void;
}

const LineItem: React.FC<LineItemProps> = ({ entry, active, currencySymbol, onPress, onRemove }) => (
    <TouchableOpacity
        style={[styles.lineItem, active && styles.lineItemActive]}
        onPress={onPress}
        activeOpacity={0.75}
    >
        <View style={styles.lineTop}>
            <Text style={styles.lineAmt}>
                {currencySymbol}{(parseFloat(entry.amount) || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <TouchableOpacity onPress={onRemove} style={styles.lineRemoveBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={15} color={colors.gray400} />
            </TouchableOpacity>
        </View>

        <View style={styles.lineFlow}>
            <View style={styles.lineAcct}>
                <View style={[styles.lineAcctIcon, styles.lineAcctIconDr]}>
                    <Icon name="trending-up" size={13} color={colors.danger} />
                </View>
                <Text style={styles.lineAcctName} numberOfLines={1}>
                    {accountName(entry.debit_account) || 'Debit account'}
                </Text>
            </View>
            <Icon name="arrow-forward" size={15} color={colors.gray300} style={styles.lineArrow} />
            <View style={styles.lineAcct}>
                <View style={[styles.lineAcctIcon, styles.lineAcctIconCr]}>
                    <Icon name="trending-down" size={13} color={colors.primary} />
                </View>
                <Text style={styles.lineAcctName} numberOfLines={1}>
                    {accountName(entry.credit_account) || 'Credit account'}
                </Text>
            </View>
        </View>

        {(entry.reference || entry.remarks) && (
            <Text style={styles.lineNote} numberOfLines={1}>
                {[entry.reference, entry.remarks].filter(Boolean).join('  ·  ')}
            </Text>
        )}
    </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const JournalEntryScreen: React.FC<Props> = ({ navigation }) => {

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [draft, setDraft] = useState<JournalEntry>(emptyDraft());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    let resetSwipe: (() => void) | null = null;
    const currency = useCurrency();
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const { play } = useSuccessSound();

    const symbol = currency?.symbol ?? '$';

    // ── Totals ────────────────────────────────────────────────────────────────
    const total = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    // ── Draft helpers ─────────────────────────────────────────────────────────
    const up = (fields: Partial<JournalEntry>) => setDraft((d) => ({ ...d, ...fields }));
    const canAdd = !!draft.debit_account && !!draft.credit_account
        && !!draft.amount && parseFloat(draft.amount) > 0 && !!draft.date;
    const dirty = !!(draft.debit_account || draft.credit_account || draft.amount || draft.reference || draft.remarks);

    const resetDraft = () => { setDraft(emptyDraft()); setEditingId(null); };

    // ── Draft → list CRUD ─────────────────────────────────────────────────────
    const addOrUpdateLine = () => {
        if (!canAdd) return;
        if (editingId != null) {
            setEntries((es) => es.map((e) => e.id === editingId ? { ...draft, id: editingId } : e));
        } else {
            setEntries((es) => [...es, { ...draft, id: nextId++ }]);
        }
        resetDraft();
    };

    const editLine = (entry: JournalEntry) => {
        setDraft({ ...entry });
        setEditingId(entry.id);
    };

    const removeLine = (id: number) => {
        setEntries((es) => es.filter((e) => e.id !== id));
        if (editingId === id) resetDraft();
    };

    // ── Footer error ──────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string | null => {
        if (entries.length === 0)
            return 'Add at least one line before posting.';
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const n = i + 1;
            if (!e.amount || parseFloat(e.amount) <= 0)
                return `Line #${n}: Please enter a valid amount.`;
            if (!e.debit_account)
                return `Line #${n}: Please select a debit account.`;
            if (!e.credit_account)
                return `Line #${n}: Please select a credit account.`;
            if (!e.date)
                return `Line #${n}: Please select a date.`;
        }
        return null;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (loading) return;
        const err = validate();
        if (err) { showError(err); resetSwipe?.(); return; }
        try {
            setLoading(true);

            const payload = entries.map((entry) => ({
                ...entry,
                date: entry.date ? toDateString(entry.date) : undefined,
                currency: entry.currency = currency
            }));
            const response = await postJournalEntries(payload);
            setSuccess(response);
            play();
            setShowSuccess(true);
        } catch (error: any) {
            resetSwipe?.();
            const msg = error?.response?.data?.message ?? 'Something went wrong.';
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.backgroundDark} />
            : <Icon name="chevron-right" size={26} color={colors.backgroundDark} />;

    // ─── Render ────────────────────────────────────────────────────────────────
    const handleAddAnother = () => {
        setShowSuccess(false);
        setEntries([]);
        resetDraft();
        setSuccess(null);
    };

    // "Done" — go back
    const handleDone = () => {
        setShowSuccess(false);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            <SuccessModal
                visible={showSuccess}
                response={success}
                onClose={handleAddAnother}
                onDone={handleDone}
                closeLabel="Add Another"
                doneLabel="Done"
            />
            {/* ── Header ── */}
            <Header title='Multi-Entry Journal' navigation={navigation} />

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets
                showsVerticalScrollIndicator={false}
            >
                {/* ── Amount hero ── */}
                <View style={styles.amountHero}>
                    <Text style={styles.amountLabel}>
                        Amount <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountSymbol}>{symbol}</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={draft.amount}
                            onChangeText={(v) => up({ amount: cleanAmount(v) })}
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                {editingId != null && (
                    <View style={styles.editBanner}>
                        <View style={styles.editBannerLeft}>
                            <Icon name="edit" size={14} color={colors.primary} />
                            <Text style={styles.editBannerText}>Editing this line</Text>
                        </View>
                        <TouchableOpacity onPress={resetDraft} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.editBannerCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Where it moved ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Where it moved <Text style={styles.requiredMark}>*</Text>
                    </Text>

                    <View style={styles.acctTagRow}>
                        <Icon name="trending-up" size={12} color={colors.danger} />
                        <Text style={styles.acctTagDr}>Credit · money out</Text>
                    </View>
                    <AsyncDropdown
                        url="/search-account"
                        searchParam="q"
                        minSearchLength={2}
                        creatable={false}
                        showLabel={false}
                        leadingIconName="trending-up"
                        inputBg={colors.backgroundLight}
                        placeholder="Choose credit account…"
                        onSelect={(v) => up({ credit_account: v })}
                    />

                    <View style={styles.flowConnector}>
                        <View style={styles.flowConnectorLine} />
                        <View style={styles.flowConnectorIcon}>
                            <Icon name="arrow-downward" size={13} color={colors.gray400} />
                        </View>
                        <View style={styles.flowConnectorLine} />
                    </View>

                    <View style={styles.acctTagRow}>
                        <Icon name="trending-down" size={12} color={colors.primary} />
                        <Text style={styles.acctTagCr}>Debit · money in</Text>
                    </View>
                    <AsyncDropdown
                        url="/search-account"
                        searchParam="q"
                        minSearchLength={2}
                        creatable={false}
                        showLabel={false}
                        leadingIconName="trending-down"
                        inputBg={colors.backgroundLight}
                        placeholder="Choose debit account…"
                        onSelect={(v) => up({ debit_account: v })}
                    />
                </View>

                {/* ── Details ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    <View style={styles.row}>
                        <View style={styles.rowItem}>
                            <DatePickerField
                                label="Date"
                                value={draft.date ?? null}
                                onChange={(v) => up({ date: v ?? undefined })}
                                placeholder="Select date"
                                inputBg={colors.backgroundLight}
                            />
                        </View>

                        <View style={styles.rowItem}>
                            <InputField
                                bg="white"
                                label="Reference"
                                type="text"
                                value={draft.reference}
                                onChangeText={(v) => up({ reference: v })}
                                placeholder="e.g. JE-001"
                                icon="tag"
                            />
                        </View>
                    </View>

                    <InputField
                        bg="white"
                        label="Remarks"
                        type="text"
                        value={draft.remarks}
                        onChangeText={(v) => up({ remarks: v })}
                        placeholder="e.g. Stock adjustment"
                        icon="notes"
                    />

                    <View style={styles.addLineRow}>
                        {dirty && editingId == null && (
                            <TouchableOpacity onPress={resetDraft} style={styles.clearBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.clearBtnText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.addLineBtn, !canAdd && styles.addLineBtnDisabled]}
                            disabled={!canAdd}
                            onPress={addOrUpdateLine}
                            activeOpacity={0.85}
                        >
                            <Icon
                                name={editingId != null ? 'check' : 'add'}
                                size={18}
                                color={canAdd ? colors.white : colors.gray400}
                            />
                            <Text style={[styles.addLineBtnText, !canAdd && styles.addLineBtnTextDisabled]}>
                                {editingId != null ? 'Update line' : 'Add line'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Lines list ── */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>This entry</Text>
                        <Text style={styles.sectionTitleCount}>
                            {entries.length} {entries.length === 1 ? 'line' : 'lines'}
                        </Text>
                    </View>

                    {entries.length === 0 ? (
                        <View style={styles.linesEmpty}>
                            <View style={styles.linesEmptyIcon}>
                                <Icon name="receipt-long" size={20} color={colors.gray400} />
                            </View>
                            <Text style={styles.linesEmptyText}>
                                No lines yet. Fill in the form above{'\n'}and tap “Add line”.
                            </Text>
                        </View>
                    ) : entries.map((entry) => (
                        <LineItem
                            key={entry.id}
                            entry={entry}
                            active={editingId === entry.id}
                            currencySymbol={symbol}
                            onPress={() => editLine(entry)}
                            onRemove={() => removeLine(entry.id)}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                {/* Total + line count */}
                <View style={styles.footerSummary}>
                    <View>
                        <Text style={styles.footerLabel}>Total Journal Volume</Text>
                        <Text style={styles.footerTotal}>
                            {symbol}{total.toLocaleString('en', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={styles.lineCountBadge}>
                        <Icon name="receipt-long" size={13} color={colors.primary} />
                        <Text style={styles.lineCountText}>
                            {entries.length} {entries.length === 1 ? 'line' : 'lines'}
                        </Text>
                    </View>
                </View>

                {footerError ? (
                    <FooterError
                        setFooterError={setFooterError}
                        footerError={footerError}
                    />
                ) : null}

                {/* Swipe button */}
                <SwipeButton
                    title={loading ? 'Posting...' : 'Slide to Post'}
                    thumbIconComponent={ThumbIcon}
                    railBackgroundColor={colors.backgroundLight}
                    railBorderColor={colors.primary}
                    railFillBackgroundColor={colors.primary}
                    thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                    thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                    titleColor={colors.primary}
                    titleFontSize={13}
                    height={52}
                    swipeSuccessThreshold={70}
                    disabled={loading || entries.length === 0}
                    onSwipeSuccess={handleSubmit}
                    forceReset={(reset: () => void) => { resetSwipe = reset; }}
                />
            </View>

        </SafeAreaView>
    );
};

export default JournalEntryScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },

    // Body
    body: { flex: 1 },
    bodyContent: { padding: 16, gap: 16 },

    // Amount hero
    amountHero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
    amountLabel: { fontSize: 11, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 1.4 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
    amountSymbol: { fontSize: 26, fontWeight: '500', color: colors.gray400 },
    amountInput: { fontSize: 46, fontWeight: '800', color: colors.gray900, letterSpacing: -1, minWidth: 150, maxWidth: 240, textAlign: 'center', padding: 0 },
    requiredMark: { fontSize: 11, fontWeight: '700', color: colors.danger },

    // Sections (Where it moved / Details / This entry) — divider-underlined titles, no card chrome
    section: { gap: 12 },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primaryMuted, alignSelf: 'flex-start' },
    sectionTitleCount: { fontSize: 11, fontWeight: '600', color: colors.gray400, paddingBottom: 8 },

    // Edit banner
    editBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    editBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    editBannerText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
    editBannerCancel: { fontSize: 12.5, fontWeight: '800', color: colors.primary },

    // "Where it moved" — debit → credit flow
    acctTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    acctTagDr: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.danger, textTransform: 'uppercase' },
    acctTagCr: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.primary, textTransform: 'uppercase' },
    flowConnector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
    flowConnectorLine: { flex: 1, height: 1, backgroundColor: colors.border },
    flowConnectorIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

    // Add / update line
    addLineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
    clearBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    clearBtnText: { fontSize: 13, fontWeight: '700', color: colors.gray400 },
    addLineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14 },
    addLineBtnDisabled: { backgroundColor: colors.gray100 },
    addLineBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
    addLineBtnTextDisabled: { color: colors.gray400 },

    // Lines list
    linesEmpty: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gray200, borderRadius: 16, gap: 10 },
    linesEmptyIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.backgroundLight, alignItems: 'center', justifyContent: 'center' },
    linesEmptyText: { fontSize: 12.5, color: colors.gray400, textAlign: 'center', lineHeight: 18 },

    lineItem: { backgroundColor: colors.backgroundLight, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13 },
    lineItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    lineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lineAmt: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
    lineRemoveBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    lineFlow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
    lineAcct: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
    lineAcctIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    lineAcctIconDr: { backgroundColor: colors.dangerLight },
    lineAcctIconCr: { backgroundColor: colors.primaryMuted },
    lineAcctName: { fontSize: 12.5, fontWeight: '600', color: colors.gray700, flexShrink: 1 },
    lineArrow: { flexShrink: 0 },
    lineNote: { fontSize: 11.5, color: colors.gray400, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border },

    // Footer
    footer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
    footerSummary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
    footerLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
    footerTotal: { fontSize: 28, fontWeight: '900', color: colors.gray900, letterSpacing: -0.5 },
    lineCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    lineCountText: { fontSize: 12, fontWeight: '800', color: colors.primary },
});
