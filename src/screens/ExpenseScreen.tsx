import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import { PaymentPayload } from '../types/payments';
import PaymentMethods from '../components/PaymentMethods';
import ExpenseAccountPicker from '../components/ExpenseAccountPicker';
import useCurrency from '../utils/currency';
import { toDateString } from '../utils/stringUtils';
import ExpenseReceipt from './modals/ExpenseReceipt';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { ExpenseSlip } from '../types/receipt';
import { createExpense } from '../services/expensePaymentService';
import { useSuccessSound } from '../utils/useSuccessSound';

type PaymentMethod = 'cash' | 'online' | 'credit';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'PayExpense'>;
};


const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'cash', label: 'Cash', icon: 'payments' },
    { key: 'online', label: 'Online', icon: 'account-balance' },
    { key: 'credit', label: 'Credit', icon: 'person-search' },
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

const ExpenseScreen: React.FC<Props> = ({ navigation }) => {

    const [payload, setPayload] = useState<PaymentPayload>(INITIAL_PAYLOAD);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const currency = useCurrency();
    const [createdSlip, setCreatedSlip] = useState<ExpenseSlip | null>(null);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null); // replaces toast
    const scrollViewRef = useRef<ScrollView>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;
    const {play} = useSuccessSound();
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
        if (!payload.expense)
            errs.push('Please select a Expense Account.');
        if (!payload.amount || payload.amount <= 0)
            errs.push('Please enter a valid amount.');
        if (payload.type === 'online' && !payload.account)
            errs.push('Please select a bank account.');
        if (payload.type === 'credit' && !payload.contact)
            errs.push('Please select the contact.');
       
        return errs;
    };
    const handleReceipt = (receipt: ExpenseSlip) => {
        setCreatedSlip(receipt);
        // Wait for CheckoutModal slide-down animation to finish
        setTimeout(() => {
            setReceiptModalVisible(true);
        }, 400);  // 400ms matches the modal dismiss animation
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
            payload.currency = currency;
            const submitPayload = {
                ...payload,
                date: payload.date ? toDateString(payload.date as Date) : undefined,
                cheque_date: payload.cheque_date ? toDateString(payload.cheque_date as Date) : undefined,
                currency: currency,
            };
            const receipt = await createExpense(submitPayload);
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


    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Icon name="arrow-forward" size={26} color={colors.white} />;

    return (
        <SafeAreaView style={styles.container}>


            <Header title="Pay Expense" navigation={navigation} />

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets
                    showsVerticalScrollIndicator={false}>

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
                    <ExpenseAccountPicker
                        value={payload.expense}
                        onSelect={(v) => update({ expense: v })}
                    />
                    <PaymentMethods
                        update={update}
                        payload={payload}
                        methods={METHODS}
                        onRemarksFocus={() =>
                            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
                        }
                    />

                   
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
                        railBackgroundColor={colors.dangerLight}
                        railBorderColor={colors.dangerLight}
                        railFillBackgroundColor={colors.danger}
                        thumbIconBackgroundColor={loading ? colors.gray400 : colors.danger}
                        thumbIconBorderColor={loading ? colors.gray400 : colors.danger}
                        titleColor={colors.dangerDark}
                        titleFontSize={15}
                        height={52}
                        swipeSuccessThreshold={70}
                        disabled={loading}
                        onSwipeSuccess={checkOut}
                        forceReset={(reset: () => void) => { resetSwipe = reset; }}
                    />
                </View>
            <Modal
                visible={receiptModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setReceiptModalVisible(false)}
                statusBarTranslucent
            >
                {createdSlip && (
                    <ExpenseReceipt
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

export default ExpenseScreen;

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