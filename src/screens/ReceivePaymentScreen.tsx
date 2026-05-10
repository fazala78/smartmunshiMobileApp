import React, { useState } from 'react';
import {
    View, ScrollView, StyleSheet,
    KeyboardAvoidingView, ActivityIndicator, Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import { PaymentPayload } from '../types/payments';
import PaymentMethods from '../components/PaymentMethods';
import useCurrency from '../utils/currency';
import { toDateString } from '../utils/stringUtils';
import PaymentReceipt from './modals/PaymentReceipt';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { PaymentResource } from '../types/receipt';
import { createReceivePayment } from '../services/paymentService';
import { Contact } from '../types/contact';
import { useSuccessSound } from '../utils/useSuccessSound';
import LocalDropdown from '../components/LocallDropdown';

type PaymentMethod = 'cash' | 'online' | 'cheque';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ReceivePayment'>;
};


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

const ReceivePaymentScreen: React.FC<Props> = ({ navigation }) => {

    const [payload, setPayload] = useState<PaymentPayload>(INITIAL_PAYLOAD);
    const [loading, setLoading] = useState(false);
    const currency = useCurrency();
    const [createdSlip, setCreatedSlip] = useState<PaymentResource | null>(null);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);
    const { play } = useSuccessSound();
    let resetSwipe: (() => void) | null = null;

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

    const handleReceipt = (receipt: PaymentResource) => {
        setCreatedSlip(receipt);
        // Wait for CheckoutModal slide-down animation to finish
        setTimeout(() => {
            setReceiptModalVisible(true);
        }, 400);  // 400ms matches the modal dismiss animation
    };

    const handleModalClosing = () => {
        setCreatedSlip(null);
        setReceiptModalVisible(false);
        navigation.navigate('Home');

    }

    const handleAddNew = () => {
        setCreatedSlip(null);
        setReceiptModalVisible(false);
        setPayload(INITIAL_PAYLOAD);
    }



    // eslint-disable-next-line react/no-unstable-nested-components
    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Icon name="arrow-forward" size={26} color={colors.white} />;

    return (
        <SafeAreaView style={styles.container}>

            <Header title="Receive Payment" navigation={navigation} />



            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Contact */}
                    <LocalDropdown<Contact>
                        label="Contact"
                        inputBg={colors.backgroundLight}
                        value={payload.contact as unknown as Contact}  // ← shows chip if set
                        creatable
                        createLabel="Select Contact"
                        onSelect={(v) => update({ contact: v as unknown as Contact })}
                        labelResolver={(c) => c.name}
                        subLabelResolver={(c) => c.phone}
                    />

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
                        onClose={() => handleModalClosing()}
                        onAddNew={() => handleAddNew()}
                    />
                )}

            </Modal>

        </SafeAreaView>
    );
};

export default ReceivePaymentScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, letterSpacing: -0.3 },
    headerSpacer: { width: 40 },
    body: { flex: 1 },
    bodyContent: { padding: 20, gap: 20 },
    toast: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },
    footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});