import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { Inventory } from '../../types/Inventory';
import { colors } from '../../theme';
import DatePickerField from '../../components/DatePickerField';
import InputField from '../../components/ui/InputField';
import { createPurchaseReturn } from '../../services/transactionService';
import TransactionSummary from '../../components/TransactionSummary';
import FooterError from '../../components/common/FooterError';
import { toDateString } from '../../utils/stringUtils';
import { useSuccessSound } from '../../utils/useSuccessSound';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseReturnCheckoutModalProps {
    visible: boolean;
    payload: Inventory;
    setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
    onConfirm: (invoice: any) => void;
    onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const PurchaseReturnCheckoutModal: React.FC<PurchaseReturnCheckoutModalProps> = ({
    visible, payload, setPayload, onConfirm, onDismiss,
}) => {

    // ── State ──────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null); // replaces toast
    const [showBalanceOverview, setShowBalanceOverview] = useState(false);
   const {play} = useSuccessSound();

    let resetSwipe: (() => void) | null = null;

    // ── Toast helper ──────────────────────────────────────────────────────────
    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string[] => {
        const errs: string[] = [];

        if (!payload.contact) {
            errs.push('Please select a customer before checkout.');
        }
        if (payload.payments?.some((e) => !e.amount || e.amount <= 0)) {
            errs.push('One or more payment entries has a missing or zero amount.');
        }
        if (!Array.isArray(payload.cart) || payload.cart.length === 0) {
            errs.push('Cart is empty. Please add items before checkout.');
        }

        return errs;
    };

    // ── Checkout ───────────────────────────────────────────────────────────────
    const checkOut = async () => {
        if (loading) return;

        setShowBalanceOverview(true);

        const validationErrors = validate();
        if (validationErrors.length > 0) {
            showError(validationErrors[0]);
            resetSwipe?.();
            return;
        }

        try {
            setLoading(true);
              const submitPayload = { ...payload, date: toDateString(payload.date as Date) };
            const invoice = await createPurchaseReturn(submitPayload);
            play();
            onConfirm(invoice);

        } catch (error: any) {
            resetSwipe?.();

            const apiErrors: string[] = [];

            if (error?.response?.data?.errors) {
                const raw = error.response.data.errors;
                Object.values(raw).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else if (error?.response?.data?.message) {
                apiErrors.push(error.response.data.message);
            } else {
                apiErrors.push('Something went wrong. Please try again.');
            }

            showError(apiErrors[0] ?? 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Icon name="arrow-forward" size={22} color="#fff" />;

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    style={styles.kavWrapper}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                >
                    <View style={styles.container}>

                        {/* ── Header ── */}
                        <View style={styles.header}>
                            <View style={styles.handleBar} />
                            <View style={styles.headerRow}>
                                <Text style={styles.title}>Checkout Pur. Return</Text>
                                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Icon name="close" size={22} color={colors.gray500} />
                                </TouchableOpacity>
                            </View>
                            {payload.contact && (
                                <View style={styles.contactChip}>
                                    <Icon name="person-outline" size={14} color={colors.gray500} />
                                    <Text style={styles.contactChipText} numberOfLines={1}>
                                        {payload.contact.name}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Body ── */}
                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={styles.bodyContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                           
                            <DatePickerField
                                label="Date"
                                value={payload?.date as Date}
                                onChange={(date) => setPayload((prev) => {
                                    if (!prev) return prev;
                                    return { ...prev, date } as Inventory;
                                })}
                                placeholder="Select date"
                                inputBg={colors.backgroundLight}
                            />

                            <InputField
                                bg="white"
                                textAlign="left"
                                label="Remarks"
                                type="text"
                                value={payload?.remarks}
                                onChangeText={(v) => setPayload((prev) => {
                                    if (!prev) return prev;
                                    return { ...prev, remarks: v || '' } as Inventory;
                                })}
                                placeholder="Remarks"
                                icon="description"
                                multiline
                                numberOfLines={3}
                            />

                            {/* ── Summary ── */}
                            <TransactionSummary payload={payload} showBalanceOverview={showBalanceOverview} />
                        </ScrollView>

                        {/* ── Footer ── */}
                        <View style={styles.footer}>
                            {footerError ? (
                                <FooterError
                                    setFooterError={setFooterError}
                                    footerError={footerError}
                                />

                            ) : null}
                            <SwipeButton
                                title={loading ? 'Processing...' : 'Slide to checkout'}
                                thumbIconComponent={ThumbIcon}
                                railBackgroundColor={colors.warningLight}
                                railBorderColor={colors.warningLight}
                                railFillBackgroundColor={colors.warning2}
                                thumbIconBackgroundColor={loading ? colors.gray50 : colors.warning2}
                                thumbIconBorderColor={loading ? colors.gray50 : colors.warning2}
                                titleColor={colors.backgroundDark}
                                titleFontSize={14}
                                height={52}
                                swipeSuccessThreshold={70}
                                disabled={loading}
                                onSwipeSuccess={checkOut}
                                forceReset={(reset: () => void) => { resetSwipe = reset; }}
                            />
                        </View>

                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default PurchaseReturnCheckoutModal;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.backgroundOverlay,
        justifyContent: 'flex-end',
    },
    kavWrapper: {
        width: '100%',
        height: '92%',
    },
    container: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flex: 1,
        overflow: 'hidden',
    },

    header: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        backgroundColor: colors.white,
        zIndex: 10,
    },
    handleBar: {
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.gray300,
        marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.gray800 },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactChipText: { textTransform:'capitalize', fontSize: 15, fontWeight: '600', color: colors.gray600, maxWidth: 500 },

    body: { flex: 1, minHeight: 0 },
    bodyContent: { padding: 24, gap: 16, paddingBottom: 16 },

    toast: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.danger,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    toastText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: colors.white,
        lineHeight: 18,
    },

    footer: {
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
});