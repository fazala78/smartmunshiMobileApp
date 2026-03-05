import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    KeyboardAvoidingView, ActivityIndicator, Animated, Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { colors } from '../../theme';
import { createReceivePayment } from '../../services/transactionService';
import { PaymentPayload } from '../../types/payments';
import PaymentMethods from '../../components/PaymentMethods';
import { Contact } from '../../types/contact';
import useCurrency from '../../utils/currency';


type PaymentMethod = 'cash' | 'bank' | 'cheque' | 'cheque_forward';


export interface PayPaymentModalProps {
    contact: Contact;
    onDismiss: () => void;
}

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'cash', label: 'Cash', icon: 'payments' },
    { key: 'bank', label: 'Online', icon: 'account-balance' },
    { key: 'cheque', label: 'Cheque', icon: 'description' },
];
const INITIAL_PAYLOAD: PaymentPayload = {
    contact: undefined,
    amount: undefined,
    method: 'cash',
    date: undefined,
    remarks: undefined,
    account: undefined,
    transaction_id: undefined,
    cheque_number: undefined,
    cheque_date: undefined,
    bank: undefined,
    cheque: undefined,
    currency:null,
};

const PayPaymentModal: React.FC<PayPaymentModalProps> = ({
    contact, onDismiss
}) => {

    const [payload, setPayload] = useState<PaymentPayload>(INITIAL_PAYLOAD);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
     const currency = useCurrency();

    const toastAnim = useRef(new Animated.Value(0)).current;
    let resetSwipe: (() => void) | null = null;

    const update = (fields: Partial<PaymentPayload>) =>
        setPayload((prev) => ({ ...prev, ...fields }));

    const showToast = (message: string) => {
        setToast(message);
        toastAnim.setValue(0);
        Animated.sequence([
            Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
            Animated.delay(3500),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setToast(null));
    };

    const validate = (): string[] => {
        const errs: string[] = [];
        if (!payload.contact)
            errs.push('Please select a customer.');
        if (!payload.amount || payload.amount <= 0)
            errs.push('Please enter a valid amount.');
        if (payload.method === 'bank' && !payload.account)
            errs.push('Please select a bank account.');
        if (payload.method === 'cheque' && !payload.cheque_number?.trim())
            errs.push('Please enter a cheque number.');
        if (payload.method === 'cheque_forward' && !payload.cheque)
            errs.push('Please select a cheque to forward.');
        return errs;
    };

    const checkOut = async () => {
        if (loading) return;
        const errs = validate();
        if (errs.length > 0) {
            showToast(errs[0]);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            payload.currency = currency;
            await createReceivePayment(payload);

        } catch (error: any) {
            resetSwipe?.();
            const apiErrors: string[] = [];
            if (error?.response?.data?.errors) {
                Object.values(error.response.data.errors).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else {
                apiErrors.push(error?.response?.data?.message ?? 'Something went wrong. Please try again.');
            }
            showToast(apiErrors[0]);
        } finally {
            setLoading(false);
        }
    };

    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Icon name="arrow-forward" size={26} color={colors.white} />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pay Payment</Text>
                <View style={styles.headerSpacer} />
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={22} color={colors.gray500} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Toast */}
                    {toast && (
                        <Animated.View style={[styles.toast, {
                            opacity: toastAnim,
                            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
                        }]}>
                            <Icon name="error-outline" size={16} color={colors.white} />
                            <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
                            <TouchableOpacity onPress={() => setToast(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="close" size={15} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    {/* ── Contact strip ── */}
                    <View style={styles.contactStrip}>
                        <View style={styles.contactAvatarWrap}>
                            {contact.avatar ? (
                                <Image source={{ uri: contact.avatar }} style={styles.contactAvatar} />
                            ) : (
                                <View style={[styles.contactAvatar, styles.contactAvatarFallback]}>
                                    <Icon name="person" size={22} color={colors.gray500} />
                                </View>
                            )}
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            <Text style={styles.contactRole}>Customer</Text>
                        </View>
                        <View style={styles.balanceDueBox}>
                            <Text style={styles.balanceDueLabel}>Balance Due</Text>
                            <Text style={styles.balanceDueAmount}>${contact.balance.toFixed(2)}</Text>
                        </View>
                    </View>

                    <PaymentMethods update={update} payload={payload} methods={METHODS} />

                    <View style={{ height: 32 }} />
                </ScrollView>

                <View style={styles.footer}>
                    <SwipeButton
                        title={loading ? 'Processing...' : 'Slide to confirm'}
                        thumbIconComponent={ThumbIcon}
                        railBackgroundColor={colors.primaryLight}
                        railBorderColor={colors.primaryLight}
                        railFillBackgroundColor={colors.primary}
                        thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                        thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                        titleColor={colors.primaryDark}
                        titleFontSize={15}
                        height={64}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={checkOut}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

export default PayPaymentModal;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    // Contact strip
    contactStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.backgroundLight },
    contactAvatarWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: colors.primaryMuted },
    contactAvatar: { width: '100%', height: '100%' },
    contactAvatarFallback: { backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
    contactRole: { fontSize: 12, fontWeight: '500', color: colors.textPlaceholder, marginTop: 1 },
    balanceDueBox: { alignItems: 'flex-end' },
    balanceDueLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
    balanceDueAmount: { fontSize: 17, fontWeight: '800', color: colors.danger, marginTop: 2 },

    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 40 },
    body: { flex: 1 },
    bodyContent: { padding: 20, gap: 20 },
    toast: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },
    footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});