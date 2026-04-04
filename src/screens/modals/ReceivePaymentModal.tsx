import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    KeyboardAvoidingView, ActivityIndicator, Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { colors } from '../../theme';
import { createReceivePayment } from '../../services/paymentService';
import { PaymentPayload } from '../../types/payments';
import PaymentMethods from '../../components/PaymentMethods';
import { Contact } from '../../types/contact';
import useCurrency, { formatBalance } from '../../utils/currency';
import ModalHeader from '../../components/ModalHeader';
import ContactProfile from '../../components/ui/ContactProfile';
import FooterError from '../../components/common/FooterError';
import { toDateString } from '../../utils/stringUtils';
import { PaymentResource } from '../../types/receipt';
import PaymentReceipt from './PaymentReceipt';
import { useSuccessSound } from '../../utils/useSuccessSound';

type PaymentMethod = 'cash' | 'online' | 'cheque';


export interface ReceivePaymentModalProps {
    contact: Contact;
    onDismiss: () => void;
}

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'cash', label: 'Cash', icon: 'payments' },
    { key: 'online', label: 'Online', icon: 'account-balance' },
    { key: 'cheque', label: 'Cheque', icon: 'description' },
];
const INITIAL_PAYLOAD: PaymentPayload = {
    contact: undefined,
    amount: undefined,
    type: 'cash',
    date: new Date(),
    remarks: undefined,
    account: undefined,
    slip_number: undefined,
    cheque_number: undefined,
    cheque_date: undefined,
    bank: undefined,
    cheque: undefined,
    currency: null,
    expense: undefined,
};

const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
    contact, onDismiss
}) => {

    const [payload, setPayload] = useState<PaymentPayload>({
        ...INITIAL_PAYLOAD,
        contact,
    });
    const [loading, setLoading] = useState(false);
    const currency = useCurrency();
    const [footerError, setFooterError] = useState<string | null>(null);
    const [createdSlip, setCreatedSlip] = useState<PaymentResource | null>(null);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    let resetSwipe: (() => void) | null = null;
    const { play } = useSuccessSound();

    const update = (fields: Partial<PaymentPayload>) =>
        setPayload((prev) => ({ ...prev, ...fields }));

    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

     const validate = (): string[] => {
        const errs: string[] = [];
        if (!payload.contact)
            errs.push('Please select a customer.');
        if (!payload.amount || payload.amount <= 0)
            errs.push('Please enter a valid amount.');
        if (!payload.date)
            errs.push('Please select the date.');
        if (payload.type === 'online' && !payload.account)
            errs.push('Please select a bank account.');
        if (payload.type === 'cheque' && !payload.cheque_number?.trim())
            errs.push('Please enter a cheque number.');
        if (payload.type === 'cheque_forward' && !payload.cheque)
            errs.push('Please select a cheque to forward.');
        return errs;
    };

    const handleReceipt = (receipt: PaymentResource) => {
        setCreatedSlip(receipt);
        // Wait for CheckoutModal slide-down animation to finish
        setTimeout(() => {
            setReceiptModalVisible(true);
        }, 400);  // 400ms matches the modal dismiss animation
    };

    const handleAddNew = () => {
        setCreatedSlip(null);
        setReceiptModalVisible(false);
        setPayload({
            ...INITIAL_PAYLOAD,
            contact
        });
    }

    const checkOut = async () => {
        if (loading) return;
        const errs = validate();
        if (errs.length > 0) {
            showError(errs[0]);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            const submitPayload = {
                ...payload,
                date: payload.date ? toDateString(payload.date as Date) : undefined,
                cheque_date: payload.cheque_date ? toDateString(payload.cheque_date as Date) : undefined,
                currency: currency,
            };
            const receipt = await createReceivePayment(submitPayload);
              play();
            handleReceipt(receipt);
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
            showError(apiErrors[0]);
        } finally {
            setLoading(false);
            resetSwipe?.();
        }
    };

    // eslint-disable-next-line react/no-unstable-nested-components
    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Icon name="arrow-forward" size={26} color={colors.white} />;
    const balanceColor = contact.balance < 0 ? colors.error : colors.primary;
 
    return (
        <SafeAreaView style={styles.container}>
            <ModalHeader
                title='Receive Payment'
                onClose={onDismiss}
            />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                   
                    {/* ── Contact strip ── */}
                    <View style={styles.contactStrip}>
                        <ContactProfile
                            avatar={contact.avatar}
                            name={contact.name}
                            type={contact.type}
                        />

                        <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            <Text style={styles.contactRole}>{contact.type}</Text>
                        </View>
                        <View style={styles.balanceDueBox}>
                            <Text style={styles.balanceDueLabel}>Balance</Text>
                            <Text style={[styles.balanceDueAmount, { color: balanceColor }]}>
                                {formatBalance(contact.balance, contact.currency)}
                            </Text>
                        </View>
                    </View>

                    <PaymentMethods update={update} payload={payload} methods={METHODS} />

                    <View style={{ height: 32 }} />
                </ScrollView>

                <View style={styles.footer}>
                    {footerError ? (
                        <FooterError
                            setFooterError={setFooterError}
                            footerError={footerError}
                        />

                    ) : null}
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
                        height={52}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={checkOut}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                </View>
            </KeyboardAvoidingView>
            <Modal
                visible={receiptModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setReceiptModalVisible(false)}
                statusBarTranslucent
            >
                {createdSlip && (
                    <PaymentReceipt
                        transaction={createdSlip}
                        visible={receiptModalVisible}
                        onClose={() => handleAddNew()}
                        onAddNew={() => handleAddNew()}
                    />
                )}

            </Modal>

        </SafeAreaView>
    );
};

export default ReceivePaymentModal;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    // Contact strip
    contactStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.backgroundLight },
    contactAvatarWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: colors.primaryMuted },
    contactAvatar: { width: '100%', height: '100%' },
    contactAvatarFallback: { backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 15, fontWeight: '800', color: colors.gray900, textTransform: 'capitalize' },
    contactRole: { fontSize: 12, fontWeight: '500', color: colors.textPlaceholder, marginTop: 1, textTransform: 'capitalize' },
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