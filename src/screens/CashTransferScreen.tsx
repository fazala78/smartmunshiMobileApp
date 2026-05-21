import React, { useRef, useState } from 'react';
import {
    View, ScrollView, StyleSheet,
    KeyboardAvoidingView, ActivityIndicator, Platform,
    TouchableWithoutFeedback,
    TextInput,
    Text,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import useCurrency from '../utils/currency';
import { toDateString } from '../utils/stringUtils';
import Header from '../components/ui/Header';
import FooterError from '../components/common/FooterError';
import { useSuccessSound } from '../utils/useSuccessSound';
import DatePickerField from '../components/DatePickerField';
import { CashTransferPayload } from '../types/cashTransfer';
import { cashTransfer } from '../services/cashTransferService';
import AsyncDropdown from '../components/AsyncDropdown';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ReceivePayment'>;
};

const INITIAL_PAYLOAD: CashTransferPayload = {
    destination: null,
    amount: null,
    date: new Date(),
    currency: null,
};

const CashTransferScreen: React.FC<Props> = ({ navigation }) => {
    const amountInputRef = useRef<TextInput>(null);

    const [payload, setPayload] = useState<CashTransferPayload>(INITIAL_PAYLOAD);
    const [loading, setLoading] = useState(false);
    const currency = useCurrency();
    const [footerError, setFooterError] = useState<string | null>(null);
    const { play } = useSuccessSound();
    let resetSwipe: (() => void) | null = null;

    const update = (fields: Partial<CashTransferPayload>) =>
        setPayload((prev) => ({ ...prev, ...fields }));

    const showError = (message: string) => {
        setFooterError(message);
        // Auto-clear after 4 s
        setTimeout(() => setFooterError(null), 4000);
    };

    const validate = (): string[] => {
        const errs: string[] = [];
        if (!payload.destination)
            errs.push('Please select a customer.');
        if (!payload.amount || payload.amount <= 0)
            errs.push('Please enter a valid amount.');
        if (!payload.date)
            errs.push('Please select the date.');
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
                currency: currency,
            };
            await cashTransfer(submitPayload);
            play();
            Alert.alert(
                'Cash Transfer Successful',
                'Cash has been transferred to the selected branch successfully.',
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
            );

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
    // eslint-disable-next-line react/no-unstable-nested-components
    const ThumbIcon = () =>
        loading
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Icon name="arrow-forward" size={26} color={colors.white} />;

    return (
        <SafeAreaView style={styles.container}>

            <Header title="Transfer Cash" navigation={navigation} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    <TouchableWithoutFeedback
                        onPress={() => amountInputRef.current?.focus()}
                    >
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Amount</Text>
                            <View style={[styles.amountInputWrap]}>
                                <Text style={styles.amountPrefix}>{currency?.symbol}</Text>
                                <TextInput
                                    ref={amountInputRef}
                                    style={[styles.amountInput]}
                                    value={payload.amount ? payload.amount.toString() : ''}
                                    onChangeText={(v) => update({ amount: parseFloat(v) || 0 })}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textPlaceholder + '66'}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>


                    {/* Contact */}
                    <View style={{ zIndex: 3000 }}>
                            {payload != null && (
                                <AsyncDropdown
                                    url="/search-branch"
                                    searchParam="q"
                                    minSearchLength={3}
                                    creatable={false}
                                    value={payload?.destination as any}
                                    label="Select Branch to Transfer"
                                    leadingIconName="category"
                                    inputBg={colors.backgroundLight}
                                    onSelect={(branch) => {
                                        setPayload((prev: any) => {
                                            if (!prev) return prev;
                                            return { ...prev, destination: branch };
                                        });
                                    }}
                                />
                            )}
                        </View>

                    <DatePickerField
                        label="Cheque Date"
                        value={payload.date as Date ?? null}
                        onChange={(d) => update({ date: d ?? undefined })}
                        placeholder="Select date"
                        inputBg={colors.backgroundLight}
                    />

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
        </SafeAreaView>
    );
};

export default CashTransferScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    body: { flex: 1 },
    bodyContent: { padding: 20, gap: 20 },
    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
    amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 16, height: 68, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.gray200 },
    amountInput: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.gray900 },
    amountPrefix: { fontSize: 24, fontWeight: '800', color: colors.textPlaceholder, marginRight: 4 },
    footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});