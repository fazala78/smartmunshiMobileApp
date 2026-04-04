import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
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
import { EntryCardProps, JournalEntry } from '../types/manualJournalEntry';
import DatePickerField from '../components/DatePickerField';
import { toDateString } from '../utils/stringUtils';
import { postJournalEntries } from '../services/journalEntryService';
import SuccessModal, { SuccessResponse } from './modals/SuccessModal';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
// ─── Types ────────────────────────────────────────────────────────────────────



type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'JournalEntry'>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;
const makeEntry = (): JournalEntry => ({
    id: nextId++,
    reference: '',
    amount: '',
    remarks: '',
    debit_account: null,
    credit_account: null,
    currency: null,
    date: new Date()
});

// ─── Single entry card ────────────────────────────────────────────────────────



const EntryCard: React.FC<EntryCardProps> = ({ entry, index, total, onChange, onDelete }) => {
    const up = (fields: Partial<JournalEntry>) => onChange(entry.id, fields);

    return (
        <View style={styles.entryCard}>
            {/* ── Card header ── */}
            <View style={styles.entryHeader}>
                <View style={styles.entryBadge}>
                    <Text style={styles.entryBadgeText}>Entry #{index + 1}</Text>
                </View>
                {total > 1 && (
                    <TouchableOpacity onPress={() => onDelete(entry.id)} style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="close" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Reference + Amount (side by side) ── */}
            <View style={styles.row}>
                <View style={styles.rowHalf}>
                    <InputField
                        bg="white"
                        label="Reference"
                        type="text"
                        value={entry.reference}
                        onChangeText={(v) => up({ reference: v })}
                        placeholder="REF-001"
                        icon="tag"
                    />
                </View>
                <View style={styles.rowHalf}>
                    <InputField
                        bg="white"
                        label="Amount"
                        type="decimal"
                        value={entry.amount}
                        onChangeText={(v) => up({ amount: v })}
                        placeholder="0.00"
                        icon="attach-money"
                        textAlign="right"
                    />
                </View>
            </View>

            <DatePickerField
                label="Date"
                value={entry.date ?? null}
                onChange={(v) => up({ date: v ?? undefined })}
                placeholder="Select date"
                inputBg={colors.backgroundLight}
            />

            {/* ── Remarks ── */}
            <InputField
                bg="white"
                label="Remarks"
                type="text"
                value={entry.remarks}
                onChangeText={(v) => up({ remarks: v })}
                placeholder="Brief description..."
                icon="notes"
            />

            {/* ── Debit account ── */}
            <View style={styles.debitArea}>
                <View style={styles.accountHeader}>
                    <Text style={styles.accountHeaderLabel}>Debit Account</Text>
                    <View style={styles.drBadge}>
                        <Text style={styles.drBadgeText}>DR</Text>
                    </View>
                </View>
                <AsyncDropdown
                    url="/search-account"
                    searchParam="q"
                    minSearchLength={2}
                    creatable={false}
                    label=""
                    leadingIconName="trending-up"
                    inputBg={colors.backgroundLight}
                    onSelect={(v) => up({ debit_account: v })}
                />

            </View>

            {/* ── Credit account ── */}
            <View style={styles.creditArea}>
                <View style={styles.accountHeader}>
                    <Text style={styles.accountHeaderLabel}>Credit Account</Text>
                    <View style={styles.crBadge}>
                        <Text style={styles.crBadgeText}>CR</Text>
                    </View>
                </View>
                <AsyncDropdown
                    url="/search-account"
                    searchParam="q"
                    minSearchLength={2}
                    creatable={false}
                    label=""
                    leadingIconName="trending-down"
                    inputBg={colors.backgroundLight}
                    onSelect={(v) => up({ credit_account: v })}
                />
            </View>
        </View>
    );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const JournalEntryScreen: React.FC<Props> = ({ navigation }) => {

    const [entries, setEntries] = useState<JournalEntry[]>([makeEntry()]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    let resetSwipe: (() => void) | null = null;
    const currency = useCurrency();
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);

    // ── Totals ────────────────────────────────────────────────────────────────
    const total = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const isBalanced = entries.every((e) => e.debit_account && e.credit_account);

    // ── Entry CRUD ────────────────────────────────────────────────────────────
    const addEntry = () => setEntries((p) => [...p, makeEntry()]);

    const deleteEntry = (id: number) =>
        setEntries((p) => p.filter((e) => e.id !== id));

    const updateEntry = (id: number, fields: Partial<JournalEntry>) =>
        setEntries((p) => p.map((e) => e.id === id ? { ...e, ...fields } : e));

    // ── Toast ──────────────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string | null => {
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const n = i + 1;
            if (!e.amount || parseFloat(e.amount) <= 0)
                return `Entry #${n}: Please enter a valid amount.`;
            if (!e.debit_account)
                return `Entry #${n}: Please select a debit account.`;
            if (!e.credit_account)
                return `Entry #${n}: Please select a credit account.`;
            if (!e.date)
                return `Entry #${n}: Please select a date.`;
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
        setEntries([makeEntry()]);
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

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Toast */}
                    {toast && (
                        <Animated.View style={[styles.toast, {
                            opacity: toastAnim,
                            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
                        }]}>
                            <Icon name="error-outline" size={16} color={colors.white} />
                            <Text style={styles.toastText} numberOfLines={3}>{toast}</Text>
                            <TouchableOpacity onPress={() => setToast(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="close" size={14} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {entries.map((entry, index) => (
                        <EntryCard
                            key={entry.id}
                            entry={entry}
                            index={index}
                            total={entries.length}
                            onChange={updateEntry}
                            onDelete={deleteEntry}
                        />
                    ))}

                    <View style={{ height: 160 }} />
                </ScrollView>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    {/* Total + balance + add button */}
                    <View style={styles.footerSummary}>
                        <View>
                            <Text style={styles.footerLabel}>Total Journal Volume</Text>
                            <Text style={styles.footerTotal}>
                                {currency?.symbol ?? '$'}{total.toLocaleString('en', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.footerRight}>
                            <View style={[styles.balancedBadge, !isBalanced && styles.unbalancedBadge]}>
                                <View style={[styles.balancedDot, !isBalanced && { backgroundColor: colors.warning }]} />
                                <Text style={[styles.balancedText, !isBalanced && { color: colors.warning }]}>
                                    {isBalanced ? 'Balanced' : 'Incomplete'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.addFooterBtn} onPress={addEntry}
                                activeOpacity={0.8}>
                                <Icon name="add" size={18} color={colors.white} />
                                <Text style={styles.addFooterText}>New Entry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Swipe button */}
                  
                        {footerError ? (
                            <FooterError
                                setFooterError={setFooterError}
                                footerError={footerError}
                            />

                        ) : null}
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
                            disabled={loading}
                            onSwipeSuccess={handleSubmit}
                            forceReset={(reset: () => void) => { resetSwipe = reset; }}
                        />
                    
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default JournalEntryScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundLight },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 40 },

    // Body
    body: { flex: 1 },
    bodyContent: { padding: 16, gap: 16 },

    // Toast
    toast: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.danger, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

    // Entry card
    entryCard: { backgroundColor: colors.white, borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    entryBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    entryBadgeText: { fontSize: 11, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.2 },
    deleteBtn: { padding: 4 },

    // Side by side row
    row: { flexDirection: 'row', gap: 10 },
    rowHalf: { flex: 1 },

    // DR / CR areas
    debitArea: { backgroundColor: '#f0fff4', borderRadius: 16, padding: 14, gap: 10 },
    creditArea: { backgroundColor: '#fff5f5', borderRadius: 16, padding: 14, gap: 10 },
    accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    accountHeaderLabel: { fontSize: 11, fontWeight: '900', color: colors.gray700, textTransform: 'uppercase', letterSpacing: 0.8 },
    drBadge: { backgroundColor: colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    drBadgeText: { fontSize: 10, fontWeight: '900', color: colors.backgroundDark, letterSpacing: 1 },
    crBadge: { backgroundColor: colors.danger, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    crBadgeText: { fontSize: 10, fontWeight: '900', color: colors.white, letterSpacing: 1 },

    // Footer add button
    footerRight: { alignItems: 'flex-end', gap: 8 },
    addFooterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    addFooterText: { fontSize: 12, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },

    // Footer
    footer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 14 },
    footerSummary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 },
    footerLabel: { fontSize: 10, fontWeight: '800', color: '#61896f', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
    footerTotal: { fontSize: 28, fontWeight: '900', color: colors.gray900, letterSpacing: -0.5 },
    balancedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    unbalancedBadge: { backgroundColor: colors.warningLight },
    balancedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    balancedText: { fontSize: 12, fontWeight: '800', color: colors.primary },
});