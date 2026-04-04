import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import { PaymentListing } from '../../types/payments';
// ─── Types ────────────────────────────────────────────────────────────────────



interface DeleteTransactionDialogProps {
    visible: boolean;
    item: PaymentListing;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}


// ─── Component ────────────────────────────────────────────────────────────────

const DeletePaymentTransactionDialog: React.FC<DeleteTransactionDialogProps> = ({
    visible, item, loading, onConfirm, onCancel,
}) => {

    const handleConfirm = () => {
        onConfirm();
    };

    // const hasLinkedData = payments.length > 0 || !!saleReturn;

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
                        <Text style={styles.invoiceHighlight}>{item?.receipt_number ?? 'this transaction'}</Text>?
                    </Text>


                    {/* ── Warning note ── */}
                    {item?.payment_method === 'cheque' && (
                        <View style={styles.warningRow}>
                            <Icon name="info-outline" size={14} color={colors.warning} />
                            <Text style={styles.warningText}>
                                Are you sure you want to delete this cheque? All related records, including installments, bank deposits, or third-party handovers, will also be deleted.
                            </Text>
                        </View>
                    )}
                    {item?.payment_method === 'forward cheque' && (
                        <View style={styles.warningRow}>
                            <Icon name="info-outline" size={14} color={colors.warning} />
                            <Text style={styles.warningText}>
                              Are you sure you want to delete this cheque? Since this cheque was received from the client, it will be remarked as Unsettled.
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

export default DeletePaymentTransactionDialog;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    card: { width: '100%', backgroundColor: colors.white, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },

    // Header
    iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { fontSize: 17, fontWeight: '900', color: colors.gray900, marginBottom: 6, textAlign: 'center' },
    message: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    invoiceHighlight: { fontWeight: '800', color: colors.gray900 },

    // Linked data
    linkedSection: { width: '100%', maxHeight: 260, marginBottom: 12 },
    group: { marginBottom: 12 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    groupTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

    // Row
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.backgroundLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, borderWidth: 1.5, borderColor: 'transparent' },
    rowSelected: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },
    methodIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1 },
    rowName: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
    rowMethod: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginTop: 1 },
    rowAmount: { fontSize: 13, fontWeight: '800', color: colors.gray700 },
    rowAmountSelected: { color: colors.danger },

    // Warning
    warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.warningLight, borderRadius: 10, padding: 10, marginBottom: 14, width: '100%' },
    warningText: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.warningText, lineHeight: 16 },

    // Buttons
    actions: { flexDirection: 'row', gap: 10, width: '100%' },
    btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.gray200, alignItems: 'center' },
    btnCancelText: { fontSize: 14, fontWeight: '800', color: colors.gray600 },
    btnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    btnConfirmInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnConfirmText: { fontSize: 14, fontWeight: '800', color: colors.white },
    btnDisabled: { opacity: 0.6 },
});