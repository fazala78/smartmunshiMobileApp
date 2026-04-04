import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ActivityIndicator, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import { DeletePayload, TransactionPayment, TransactionSaleReturn } from '../../types/Inventory';
// ─── Types ────────────────────────────────────────────────────────────────────



interface DeleteTransactionDialogProps {
    visible:      boolean;
    invoiceNumber?: string;
    payments:     TransactionPayment[];
    saleReturn:   TransactionSaleReturn | null;
    loading:      boolean;
    onConfirm:    (payload: DeletePayload) => void;
    onCancel:     () => void;
}

// ─── Payment method icon ──────────────────────────────────────────────────────

const METHOD_ICON: Record<string, string> = {
    Cash:   'payments',
    Cheque: 'description',
    Online: 'account-balance',
};

// ─── Component ────────────────────────────────────────────────────────────────

const DeleteTransactionDialog: React.FC<DeleteTransactionDialogProps> = ({
    visible, invoiceNumber, payments, saleReturn, loading, onConfirm, onCancel,
}) => {
    const [localPayments,   setLocalPayments]   = useState<TransactionPayment[]>([]);
    const [localSaleReturn, setLocalSaleReturn] = useState<TransactionSaleReturn | null>(null);

    // Reset local state whenever dialog opens with fresh data
    React.useEffect(() => {
        if (visible) {
            setLocalPayments(payments.map((p) => ({ ...p, is_delete: false })));
            setLocalSaleReturn(saleReturn ? { ...saleReturn, is_delete: false } : null);
        }
    }, [visible, payments, saleReturn]);

    const togglePayment = (id: number) => {
        setLocalPayments((prev) =>
            prev.map((p) => p.id === id ? { ...p, is_delete: !p.is_delete } : p)
        );
    };

    const toggleSaleReturn = () => {
        setLocalSaleReturn((prev) => prev ? { ...prev, is_delete: !prev.is_delete } : prev);
    };

    const handleConfirm = () => {
        onConfirm({ payments: localPayments, sale_return: localSaleReturn });
    };

    const hasLinkedData = payments.length > 0 || !!saleReturn;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.card}>

                    {/* ── Icon ── */}
                    <View style={styles.iconWrap}>
                        <Icon name="delete-forever" size={32} color={colors.danger} />
                    </View>

                    {/* ── Title ── */}
                    <Text style={styles.title}>Delete Transaction</Text>
                    <Text style={styles.message}>
                        Are you sure you want to delete{' '}
                        <Text style={styles.invoiceHighlight}>{invoiceNumber ?? 'this transaction'}</Text>?
                        {hasLinkedData
                            ? ' This transaction has linked records. Select which ones to also delete.'
                            : ' This action cannot be undone.'}
                    </Text>

                    {/* ── Linked data section ── */}
                    {hasLinkedData && (
                        <ScrollView
                            style={styles.linkedSection}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {/* Payments */}
                            {localPayments.length > 0 && (
                                <View style={styles.group}>
                                    <View style={styles.groupHeader}>
                                        <Icon name="payments" size={14} color={colors.textSecondary} />
                                        <Text style={styles.groupTitle}>Linked Payments</Text>
                                    </View>
                                    {localPayments.map((payment) => (
                                        <TouchableOpacity
                                            key={payment.id}
                                            style={[styles.row, payment.is_delete && styles.rowSelected]}
                                            onPress={() => togglePayment(payment.id)}
                                            activeOpacity={0.8}
                                        >
                                            {/* Checkbox */}
                                            <View style={[styles.checkbox, payment.is_delete && styles.checkboxChecked]}>
                                                {payment.is_delete && (
                                                    <Icon name="check" size={12} color={colors.white} />
                                                )}
                                            </View>

                                            {/* Method icon */}
                                            <View style={styles.methodIcon}>
                                                <Icon
                                                    name={METHOD_ICON[payment.payment_method] ?? 'payments'}
                                                    size={16}
                                                    color={colors.textSecondary}
                                                />
                                            </View>

                                            {/* Info */}
                                            <View style={styles.rowInfo}>
                                                <Text style={styles.rowName} numberOfLines={1}>
                                                    {payment.name}
                                                </Text>
                                                <Text style={styles.rowMethod}>{payment.payment_method}</Text>
                                            </View>

                                            {/* Amount */}
                                            <Text style={[
                                                styles.rowAmount,
                                                payment.is_delete && styles.rowAmountSelected,
                                            ]}>
                                                ${payment.amount.toFixed(2)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Sale return */}
                            {localSaleReturn && (
                                <View style={styles.group}>
                                    <View style={styles.groupHeader}>
                                        <Icon name="assignment-return" size={14} color={colors.textSecondary} />
                                        <Text style={styles.groupTitle}>Sale Return</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.row, localSaleReturn.is_delete && styles.rowSelected]}
                                        onPress={toggleSaleReturn}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.checkbox, localSaleReturn.is_delete && styles.checkboxChecked]}>
                                            {localSaleReturn.is_delete && (
                                                <Icon name="check" size={12} color={colors.white} />
                                            )}
                                        </View>
                                        <View style={styles.methodIcon}>
                                            <Icon name="assignment-return" size={16} color={colors.textSecondary} />
                                        </View>
                                        <View style={styles.rowInfo}>
                                            <Text style={styles.rowName}>Sale Return #{localSaleReturn.id}</Text>
                                        </View>
                                        <Text style={[
                                            styles.rowAmount,
                                            localSaleReturn.is_delete && styles.rowAmountSelected,
                                        ]}>
                                            ${parseFloat(localSaleReturn.amount).toFixed(2)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {/* ── Warning note ── */}
                    {hasLinkedData && (
                        <View style={styles.warningRow}>
                            <Icon name="info-outline" size={14} color={colors.warning} />
                            <Text style={styles.warningText}>
                                Unchecked records will be kept. Only checked items will be deleted.
                            </Text>
                        </View>
                    )}

                    {/* ── Buttons ── */}
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
                            style={[styles.btnConfirm, loading && styles.btnDisabled]}
                            onPress={handleConfirm}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color={colors.white} />
                                : (
                                    <View style={styles.btnConfirmInner}>
                                        <Icon name="delete" size={16} color={colors.white} />
                                        <Text style={styles.btnConfirmText}>Delete</Text>
                                    </View>
                                )
                            }
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

export default DeleteTransactionDialog;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    card:               { width: '100%', backgroundColor: colors.white, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },

    // Header
    iconWrap:           { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title:              { fontSize: 17, fontWeight: '900', color: colors.gray900, marginBottom: 6, textAlign: 'center' },
    message:            { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    invoiceHighlight:   { fontWeight: '800', color: colors.gray900 },

    // Linked data
    linkedSection:      { width: '100%', maxHeight: 260, marginBottom: 12 },
    group:              { marginBottom: 12 },
    groupHeader:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    groupTitle:         { fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

    // Row
    row:                { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.backgroundLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, borderWidth: 1.5, borderColor: 'transparent' },
    rowSelected:        { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    checkbox:           { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked:    { backgroundColor: colors.danger, borderColor: colors.danger },
    methodIcon:         { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
    rowInfo:            { flex: 1 },
    rowName:            { fontSize: 13, fontWeight: '700', color: colors.gray900 },
    rowMethod:          { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginTop: 1 },
    rowAmount:          { fontSize: 13, fontWeight: '800', color: colors.gray700 },
    rowAmountSelected:  { color: colors.danger },

    // Warning
    warningRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.warningLight, borderRadius: 10, padding: 10, marginBottom: 14, width: '100%' },
    warningText:        { flex: 1, fontSize: 11, fontWeight: '600', color: colors.warningText, lineHeight: 16 },

    // Buttons
    actions:            { flexDirection: 'row', gap: 10, width: '100%' },
    btnCancel:          { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.gray200, alignItems: 'center' },
    btnCancelText:      { fontSize: 14, fontWeight: '800', color: colors.gray600 },
    btnConfirm:         { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    btnConfirmInner:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnConfirmText:     { fontSize: 14, fontWeight: '800', color: colors.white },
    btnDisabled:        { opacity: 0.6 },
});