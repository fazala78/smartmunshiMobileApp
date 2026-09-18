import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    Platform, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

/** Keep the amount field a clean decimal string — digits + one dot, max 2 dp */
const cleanAmount = (v: string): string => {
    const stripped = v.replace(/[^0-9.]/g, '');
    const parts = stripped.split('.');
    return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : stripped;
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const JournalEntryScreen: React.FC<Props> = ({ navigation }) => {

    const [draft, setDraft] = useState<JournalEntry>(emptyDraft());
    // Bumped on "Add Another" to force the form (incl. the AsyncDropdown
    // account pickers, whose internal selection state isn't fully driven
    // by a `value` prop) to remount fresh instead of carrying over state.
    const [formKey, setFormKey] = useState(0);
    const [loading, setLoading] = useState(false);
    let resetSwipe: (() => void) | null = null;
    const currency = useCurrency();
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const { play } = useSuccessSound();

    const symbol = currency?.symbol ?? '$';

    // ── Draft helpers ─────────────────────────────────────────────────────────
    const up = (fields: Partial<JournalEntry>) => setDraft((d) => ({ ...d, ...fields }));
    const canSubmit = !!draft.debit_account && !!draft.credit_account
        && !!draft.amount && parseFloat(draft.amount) > 0 && !!draft.date;

    const resetDraft = () => setDraft(emptyDraft());

    // ── Footer error ──────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string | null => {
        if (!draft.amount || parseFloat(draft.amount) <= 0)
            return 'Please enter a valid amount.';
        if (!draft.debit_account)
            return 'Please select a debit account.';
        if (!draft.credit_account)
            return 'Please select a credit account.';
        if (!draft.date)
            return 'Please select a date.';
        return null;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (loading) return;
        const err = validate();
        if (err) { showError(err); resetSwipe?.(); return; }
        try {
            setLoading(true);

            const payload = [{
                ...draft,
                date: draft.date ? toDateString(draft.date) : undefined,
                currency,
            }];
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
        resetDraft();
        setSuccess(null);
        resetSwipe?.();
        setFormKey((k) => k + 1);
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
            <Header title='Journal Entry' navigation={navigation} />

            <KeyboardAwareScrollView
                key={formKey}
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                enableOnAndroid
                extraScrollHeight={20}
                enableResetScrollToCoords={false}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Where it moved ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Where it moved <Text style={styles.requiredMark}>*</Text>
                    </Text>

                    <View style={styles.acctInlineRow}>
                        <View style={styles.acctInlineItem}>
                            <View style={styles.acctTagRow}>
                                <Icon name="trending-down" size={12} color={colors.danger} />
                                <Text style={styles.acctTagDr}>Credit</Text>
                            </View>
                            <AsyncDropdown
                                url="/search-account"
                                searchParam="q"
                                minSearchLength={2}
                                creatable={false}
                                showLabel={false}
                                leadingIconName="trending-down"
                                inputBg={colors.backgroundLight}
                                placeholder="Credit account…"
                                onSelect={(v) => up({ credit_account: v })}
                                modalMode
                                modalTitle="Select Credit Account"
                            />
                        </View>

                        <View style={styles.acctInlineArrowBox}>
                            <Icon name="arrow-forward" size={16} color={colors.gray300} />
                        </View>

                        <View style={styles.acctInlineItem}>
                            <View style={styles.acctTagRow}>
                                <Icon name="trending-up" size={12} color={colors.primary} />
                                <Text style={styles.acctTagCr}>Debit</Text>
                            </View>
                            <AsyncDropdown
                                url="/search-account"
                                searchParam="q"
                                minSearchLength={2}
                                creatable={false}
                                showLabel={false}
                                leadingIconName="trending-up"
                                inputBg={colors.backgroundLight}
                                placeholder="Debit account…"
                                onSelect={(v) => up({ debit_account: v })}
                                modalMode
                                modalTitle="Select Debit Account"
                            />
                        </View>
                    </View>
                </View>

                {/* ── Amount ── */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                        Amount <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={styles.amountInputWrap}>
                        <Text style={styles.amountPrefix}>{symbol}</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={draft.amount}
                            onChangeText={(v) => up({ amount: cleanAmount(v) })}
                            placeholder="0.00"
                            placeholderTextColor={colors.textPlaceholder + '66'}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                {/* ── Details ── */}
                <View style={styles.section}>
                    <DatePickerField
                        label="Date"
                        value={draft.date ?? null}
                        onChange={(v) => up({ date: v ?? undefined })}
                        placeholder="Select date"
                        inputBg={colors.backgroundLight}
                    />

                    <InputField
                        bg="white"
                        label="Reference"
                        type="text"
                        value={draft.reference}
                        onChangeText={(v) => up({ reference: v })}
                        placeholder="e.g. JE-001"
                        icon="tag"
                    />

                    <InputField
                        bg="white"
                        textAlign="left"
                        label="Remarks"
                        type="text"
                        value={draft.remarks}
                        onChangeText={(v) => up({ remarks: v })}
                        placeholder="Remarks"
                        icon="description"
                        multiline
                        numberOfLines={3}
                    />
                </View>
            </KeyboardAwareScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
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
                    railBackgroundColor={colors.primaryLight}
                    railBorderColor={colors.primaryLight}
                    railFillBackgroundColor={colors.primary}
                    thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                    thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                    disabledRailBackgroundColor={colors.primaryLight}
                    disabledThumbIconBackgroundColor={colors.gray400}
                    disabledThumbIconBorderColor={colors.gray400}
                    titleColor={colors.primaryDark}
                    titleFontSize={15}
                    height={52}
                    swipeSuccessThreshold={70}
                    disabled={loading || !canSubmit}
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

    // Amount field
    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
    amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 16, height: 68, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.gray200 },
    amountPrefix: { fontSize: 24, fontWeight: '800', color: colors.textPlaceholder, marginRight: 4 },
    amountInput: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.gray900 },
    requiredMark: { fontSize: 11, fontWeight: '700', color: colors.danger },

    // Sections (Where it moved / Details) — divider-underlined titles, no card chrome
    section: { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primaryMuted, alignSelf: 'flex-start' },

    // "Where it moved" — debit → credit flow
    acctTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    acctTagDr: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.danger, textTransform: 'uppercase' },
    acctTagCr: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.primary, textTransform: 'uppercase' },
    acctInlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    acctInlineItem: { flex: 1, gap: 6 },
    acctInlineArrowBox: { width: 24, height: 48, alignItems: 'center', justifyContent: 'center' },

    // Footer
    footer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
});
