import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.95;
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { colors } from '../../theme';
import InputField from '../../components/ui/InputField';
import AsyncDropdown from '../../components/AsyncDropdown';
import FooterError from '../../components/common/FooterError';
import SuccessModal, { SuccessResponse } from './SuccessModal';
import { createBankAccount } from '../../services/bankListService';
import { BankInfo } from '../../types/bankList';
import useCurrency from '../../utils/currency';
import { useSuccessSound } from '../../utils/useSuccessSound';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankAccountForm {
    name: string;
    code: string;
    bank: BankInfo | null;
    bank_branch_code: string;
    bank_code: string;
    opn_balance: number | null;
    balance_type: 'debit' | 'credit';
}

const INITIAL: BankAccountForm = {
    name: '',
    code: '',
    bank: null,
    bank_branch_code: '',
    bank_code: '',
    opn_balance: null,
    balance_type: 'debit',
};

export interface AddBankAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const AddBankAccountModal: React.FC<AddBankAccountModalProps> = ({
    visible,
    onClose,
    onSuccess,
}) => {
    const [form, setForm] = useState<BankAccountForm>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const [success, setSuccess] = useState<SuccessResponse | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const currency = useCurrency();
    const { play } = useSuccessSound();
    let resetSwipe: (() => void) | null = null;

    const update = (fields: Partial<BankAccountForm>) =>
        setForm((prev) => ({ ...prev, ...fields }));

    const showError = (message: string) => {
        setFooterError(message);
        setTimeout(() => setFooterError(null), 4000);
    };

    const validate = (): string | null => {
        if (!form.name.trim()) return 'Please enter an account name.';
        if (!form.code.trim()) return 'Please enter an account code.';
        if (!form.bank) return 'Please select a bank.';
        return null;
    };

    const handleSubmit = async () => {
        if (loading) return;
        const err = validate();
        if (err) {
            showError(err);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            const response = await createBankAccount({
                name: form.name.trim(),
                code: form.code.trim(),
                bank_id: form.bank!.id,
                bank_branch_code: form.bank_branch_code.trim(),
                bank_code: form.bank_code.trim(),
                opn_balance: form.opn_balance,
                balance_type: form.balance_type,
                currency,
            });
            play();
            setSuccess(response);
            setShowSuccess(true);
        } catch (error: any) {
            const apiErrors: string[] = [];
            if (error?.response?.data?.errors) {
                Object.values(error.response.data.errors).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else {
                apiErrors.push(
                    error?.response?.data?.message ?? 'Something went wrong. Please try again.'
                );
            }
            showError(apiErrors[0]);
        } finally {
            setLoading(false);
            resetSwipe?.();
        }
    };

    const handleAddAnother = () => {
        setShowSuccess(false);
        setForm(INITIAL);
        setSuccess(null);
        onSuccess?.();
    };

    const handleDone = () => {
        setShowSuccess(false);
        setForm(INITIAL);
        onSuccess?.();
        onClose();
    };

    const handleClose = () => {
        setForm(INITIAL);
        setFooterError(null);
        onClose();
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.backgroundDark} />
            : <Icon name="keyboard-double-arrow-right" size={24} color={colors.backgroundDark} />;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <SuccessModal
                visible={showSuccess}
                response={success}
                onClose={handleAddAnother}
                onDone={handleDone}
                closeLabel="Add Another"
                doneLabel="Done"
            />

            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    style={styles.sheet}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {/* Handle */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>New Bank Account</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <Icon name="close" size={22} color={colors.gray700} />
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── Account Details ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Account Details</Text>

                            <InputField
                                bg="white"
                                label="Account Name"
                                type="text"
                                value={form.name}
                                onChangeText={(v) => update({ name: v })}
                                placeholder="Enter account holder name"
                                icon="badge"
                            />

                            <InputField
                                bg="white"
                                label="Account Code / Number"
                                type="text"
                                value={form.code}
                                onChangeText={(v) => update({ code: v })}
                                placeholder="Enter account number"
                                icon="tag"
                            />
                        </View>

                        {/* ── Opening Balance ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Opening Balance</Text>

                            <InputField
                                bg="white"
                                label="Opening Balance"
                                type="decimal"
                                value={form.opn_balance?.toString() ?? ''}
                                onChangeText={(v) => update({ opn_balance: parseFloat(v) || null })}
                                placeholder="0.00"
                                icon="account-balance-wallet"
                            />

                            <View style={styles.balanceToggleRow}>
                                <TouchableOpacity
                                    style={[styles.balanceToggleBtn, form.balance_type === 'debit' && styles.balanceToggleBtnActiveDr]}
                                    onPress={() => update({ balance_type: 'debit' })}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.balanceBadge, { backgroundColor: form.balance_type === 'debit' ? colors.primary : colors.gray400 }]}>
                                        <Text style={[styles.balanceBadgeText, { color: form.balance_type === 'debit' ? colors.backgroundDark : colors.white }]}>DR</Text>
                                    </View>
                                    <Text style={[styles.balanceToggleLabel, form.balance_type === 'debit' && { color: colors.primary }]}>
                                        Debit
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.balanceToggleBtn, form.balance_type === 'credit' && styles.balanceToggleBtnActiveCr]}
                                    onPress={() => update({ balance_type: 'credit' })}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.balanceBadge, { backgroundColor: form.balance_type === 'credit' ? colors.danger : colors.gray400 }]}>
                                        <Text style={[styles.balanceBadgeText, { color: colors.white }]}>CR</Text>
                                    </View>
                                    <Text style={[styles.balanceToggleLabel, form.balance_type === 'credit' && { color: colors.danger }]}>
                                        Credit
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Bank ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Bank</Text>

                            <AsyncDropdown
                                url="/banks"
                                searchParam="search"
                                minSearchLength={0}
                                leadingIconName="account-balance"
                                label="Select Bank"
                                placeholder="Search bank..."
                                inputBg={colors.backgroundLight}
                                value={form.bank as any}
                                onSelect={(v) => update({ bank: v as unknown as BankInfo })}
                                zIndex={3000}
                            />

                            <View style={styles.row}>
                                <View style={styles.flexOne}>
                                    <InputField
                                        bg="white"
                                        label="Branch Code"
                                        type="text"
                                        value={form.bank_branch_code}
                                        onChangeText={(v) => update({ bank_branch_code: v })}
                                        placeholder="e.g. 0123"
                                        icon="location-city"
                                    />
                                </View>
                                <View style={styles.flexOne}>
                                    <InputField
                                        bg="white"
                                        label="Bank Code"
                                        type="text"
                                        value={form.bank_code}
                                        onChangeText={(v) => update({ bank_code: v })}
                                        placeholder="e.g. MBPK"
                                        icon="numbers"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={{ height: 24 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {footerError ? (
                            <FooterError
                                setFooterError={setFooterError}
                                footerError={footerError}
                            />
                        ) : null}
                        <SwipeButton
                            title={loading ? 'Saving...' : 'Slide to Save'}
                            thumbIconComponent={ThumbIcon}
                            railBackgroundColor={colors.backgroundLight}
                            railBorderColor={colors.primary}
                            railFillBackgroundColor={colors.primary}
                            thumbIconBackgroundColor={colors.primary}
                            thumbIconBorderColor={colors.primary}
                            titleColor={colors.primary}
                            titleFontSize={13}
                            height={52}
                            swipeSuccessThreshold={70}
                            disabled={loading}
                            onSwipeSuccess={handleSubmit}
                            forceReset={(reset: () => void) => { resetSwipe = reset; }}
                        />
                        <Text style={styles.footerHint}>Confirm &amp; Create Bank Account</Text>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default AddBankAccountModal;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray200,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.gray900,
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.backgroundLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { flex: 1 },
    bodyContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 20,
    },
    section: { gap: 12 },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        paddingBottom: 6,
        borderBottomWidth: 2,
        borderBottomColor: colors.primaryMuted,
        alignSelf: 'flex-start',
    },
    row: { flexDirection: 'row', gap: 8 },
    flexOne: { flex: 1 },
    balanceToggleRow: { flexDirection: 'row', gap: 10 },
    balanceToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent' },
    balanceToggleBtnActiveDr: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    balanceToggleBtnActiveCr: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    balanceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    balanceBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    balanceToggleLabel: { fontSize: 11, fontWeight: '800', color: colors.gray500, letterSpacing: 0.8, textTransform: 'uppercase' },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    footerHint: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 10,
        fontWeight: '800',
        color: colors.gray400,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});
