import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ActivityIndicator, TextInput, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../theme';
import AsyncDropdown from './AsyncDropdown';
import DatePickerField from './DatePickerField';
import { Account } from '../types/payments';
import { getChequeInstallments } from '../services/cheques';
import { Cheque } from '../types/cheques';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstallmentDialogProps {
    visible: boolean;
    cheque: Cheque | null;
    loading: boolean;
    onConfirm: (amount: string, account: Account | undefined, date: Date | null) => void;
    onCancel: () => void;
}

interface ConfirmDialogProps {
    visible: boolean;
    cheque: Cheque | null;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    icon: string;
    dateLabel?: string;
    loading: boolean;
    onConfirm: (date: Date | null) => void;
    onCancel: () => void;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
// Simple dialog — no keyboard interaction needed here.

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    visible, cheque, title, message, confirmLabel, confirmColor,
    icon, dateLabel, loading, onConfirm, onCancel,
}) => {
    const [date, setDate] = useState<Date | null>(new Date());

    // Reset to today whenever the dialog is (re)opened
    useEffect(() => {
        if (visible) setDate(new Date());
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={[styles.iconWrap, { backgroundColor: confirmColor + '18' }]}>
                        <Icon name={icon} size={32} color={confirmColor} />
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    {cheque && (
                        <View style={styles.chequePill}>
                            <Icon name="description" size={14} color={colors.textSecondary} />
                            <Text style={styles.chequePillText}>{cheque.cheque_number}</Text>
                            <Text style={[styles.chequePillAmount, { color: confirmColor }]}>
                                {cheque.amount}
                            </Text>
                        </View>
                    )}
                    <View style={styles.dateField}>
                        <DatePickerField
                            label={dateLabel ?? 'Date'}
                            value={date}
                            onChange={setDate}
                            placeholder="Select date"
                            inputBg={colors.backgroundLight}
                        />
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={onCancel}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <Text style={styles.btnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnConfirm, { backgroundColor: confirmColor }, loading && styles.btnDisabled]}
                            onPress={() => onConfirm(date)}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color={colors.white} />
                                : <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Installment Dialog ───────────────────────────────────────────────────────

export const InstallmentDialog: React.FC<InstallmentDialogProps> = ({
    visible, cheque, loading, onConfirm, onCancel,
}) => {
    const [amount,  setAmount]  = useState('');
    const [account, setAccount] = useState<Account | null>(null);
    const [date,    setDate]    = useState<Date | null>(new Date());
    const [error,   setError]   = useState('');

    // ── Fetch installment details ─────────────────────────────────────────────
    const { data, isLoading: fetching } = useQuery({
        queryKey: ['cheque-installment', cheque?.id],
        queryFn:  () => getChequeInstallments(cheque!),
        enabled:  visible && !!cheque?.id,
        staleTime: 0,
    });

    // ── Derived values ────────────────────────────────────────────────────────
    const symbol      = data?.currency?.symbol ?? '$';
    const originalAmt = data?.amount ?? 0;
    const paidSoFar   = data?.transactions.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const remaining   = originalAmt - paidSoFar;

    // ── Reset on close ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!visible) {
            setAmount('');
            setAccount(null);
            setDate(new Date());
            setError('');
        }
    }, [visible]);

    const handleConfirm = () => {
        if (!amount.trim() || Number(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (Number(amount) > remaining) {
            setError(`Amount cannot exceed remaining balance (${symbol}${remaining.toFixed(2)}).`);
            return;
        }
        setError('');
        onConfirm(amount, account ?? undefined, date);
    };

    const handleCancel = () => {
        setAmount('');
        setAccount(null);
        setDate(new Date());
        setError('');
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
            // Prevents the modal from intercepting keyboard events on Android
            statusBarTranslucent
        >
            {/*
             * KeyboardAvoidingView pushes the content upward when the soft
             * keyboard appears.  "padding" mode works on both platforms:
             * on iOS it adds bottom padding; on Android it shrinks the view.
             */}
            <KeyboardAvoidingView
                style={styles.kavWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
            >
                <View style={styles.overlay}>
                    <View style={styles.card}>

                        {/* Icon */}
                        <View style={[styles.iconWrap, { backgroundColor: colors.warningLight }]}>
                            <Icon name="schedule" size={32} color={colors.warning} />
                        </View>

                        <Text style={styles.title}>Record Installment</Text>

                        {/* Cheque pill */}
                        {cheque && (
                            <View style={styles.chequePill}>
                                <Icon name="description" size={14} color={colors.textSecondary} />
                                <Text style={styles.chequePillText}>{cheque.cheque_number}</Text>
                                <Text style={[styles.chequePillAmount, { color: colors.warning }]}>
                                    {cheque.amount}
                                </Text>
                            </View>
                        )}

                        {/*
                         * ScrollView lets the dropdown expand freely without
                         * overflowing the action buttons below it.
                         * nestedScrollEnabled is needed on Android when inside a Modal.
                         */}
                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {/* ── Balance summary ── */}
                            {fetching
                                ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                                : data && (
                                    <View style={styles.balanceRow}>
                                        <View style={styles.balanceItem}>
                                            <Text style={styles.balanceLabel}>Original</Text>
                                            <Text style={styles.balanceValue}>{symbol}{originalAmt.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.balanceDivider} />
                                        <View style={styles.balanceItem}>
                                            <Text style={styles.balanceLabel}>Paid</Text>
                                            <Text style={[styles.balanceValue, { color: colors.primary }]}>
                                                {symbol}{paidSoFar.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={styles.balanceDivider} />
                                        <View style={styles.balanceItem}>
                                            <Text style={styles.balanceLabel}>Remaining</Text>
                                            <Text style={[styles.balanceValue, { color: colors.danger }]}>
                                                {symbol}{remaining.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            }

                            {/* ── Past transactions ── */}
                            {!fetching && data && data.transactions.length > 0 && (
                                <View style={styles.txSection}>
                                    <Text style={styles.txTitle}>Previous Installments</Text>
                                    {data.transactions.map((tx) => (
                                        <View key={tx.id} style={styles.txRow}>
                                            <View style={styles.txLeft}>
                                                <Icon name="receipt" size={14} color={colors.textSecondary} />
                                                <Text style={styles.txDate}>{tx.date}</Text>
                                            </View>
                                            <Text style={styles.txAmount}>
                                                -{symbol}{tx.amount.toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* ── Amount input ── */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Installment Amount</Text>
                                <View style={styles.amountWrap}>
                                    <Text style={styles.amountPrefix}>{symbol}</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={amount}
                                        onChangeText={(v) => { setAmount(v); setError(''); }}
                                        placeholder="0.00"
                                        placeholderTextColor={colors.textPlaceholder}
                                        keyboardType="decimal-pad"
                                    />
                                    {remaining > 0 && (
                                        <TouchableOpacity
                                            style={styles.maxBtn}
                                            onPress={() => setAmount(remaining.toFixed(2))}
                                        >
                                            <Text style={styles.maxBtnText}>MAX</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* ── Date ── */}
                            <View style={styles.fieldGroup}>
                                <DatePickerField
                                    label="Installment Date"
                                    value={date}
                                    onChange={setDate}
                                    placeholder="Select date"
                                    inputBg={colors.backgroundLight}
                                />
                            </View>

                            {/* ── Account dropdown ── */}
                            <View style={styles.fieldGroup}>
                                <AsyncDropdown
                                    url="/accounts"
                                    searchParam="q"
                                    minSearchLength={2}
                                    creatable={false}
                                    label="Receiving Account"
                                    leadingIconName="account-balance-wallet"
                                    inputBg={colors.backgroundLight}
                                    onSelect={(v) => { setAccount(v as unknown as Account); setError(''); }}
                                />
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorRow}>
                                    <Icon name="error-outline" size={14} color={colors.danger} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* ── Buttons — always pinned outside the scroll area ── */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={handleCancel}
                                activeOpacity={0.8}
                                disabled={loading}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnConfirm,
                                    { backgroundColor: colors.warning },
                                    (loading || fetching) && styles.btnDisabled,
                                ]}
                                onPress={handleConfirm}
                                activeOpacity={0.8}
                                disabled={loading || fetching}
                            >
                                {loading
                                    ? <ActivityIndicator size="small" color={colors.white} />
                                    : <Text style={styles.btnConfirmText}>Confirm</Text>
                                }
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // KeyboardAvoidingView must be flex:1 to fill the modal's transparent layer
    kavWrapper:    { flex: 1 },

    overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },

    card: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        // Cap card height so it never taller than 85% of screen;
        // the ScrollView inside handles overflow.
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 16,
    },

    iconWrap:      { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title:         { fontSize: 17, fontWeight: '900', color: colors.gray900, letterSpacing: -0.3, marginBottom: 6, textAlign: 'center' },
    message:       { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 12 },

    // Cheque pill
    chequePill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.backgroundLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14 },
    chequePillText:   { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    chequePillAmount: { fontSize: 13, fontWeight: '800' },

    // Date field (ConfirmDialog)
    dateField:        { width: '100%', marginBottom: 14 },

    // Scroll area — fills available space between the pill and the buttons
    scrollArea:    { width: '100%', flexGrow: 0 },
    scrollContent: { paddingBottom: 4 },

    // Balance summary
    balanceRow:     { flexDirection: 'row', width: '100%', backgroundColor: colors.backgroundLight, borderRadius: 14, padding: 14, marginBottom: 14, alignItems: 'center' },
    balanceItem:    { flex: 1, alignItems: 'center', gap: 4 },
    balanceDivider: { width: 1, height: 32, backgroundColor: colors.gray200 },
    balanceLabel:   { fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue:   { fontSize: 14, fontWeight: '800', color: colors.gray900 },

    // Transactions list
    txSection: { width: '100%', marginBottom: 14 },
    txTitle:   { fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    txRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    txLeft:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txDate:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    txAmount:  { fontSize: 13, fontWeight: '800', color: colors.danger },

    // Fields
    fieldGroup:    { width: '100%', marginBottom: 10 },
    fieldLabel:    { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
    amountWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.gray200 },
    amountPrefix:  { fontSize: 18, fontWeight: '800', color: colors.textPlaceholder, marginRight: 4 },
    amountInput:   { flex: 1, fontSize: 18, fontWeight: '800', color: colors.gray900 },
    maxBtn:        { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    maxBtnText:    { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },

    // Error
    errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 10 },
    errorText: { fontSize: 12, color: colors.danger, fontWeight: '600' },

    // Buttons — pinned below the scroll area, never hidden by keyboard
    actions:        { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
    btnCancel:      { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.gray200, alignItems: 'center' },
    btnCancelText:  { fontSize: 14, fontWeight: '800', color: colors.gray600 },
    btnConfirm:     { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    btnConfirmText: { fontSize: 14, fontWeight: '800', color: colors.white },
    btnDisabled:    { opacity: 0.6 },
});