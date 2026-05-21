import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import Shopping from '../components/Shopping';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import useCurrency from '../utils/currency';
import { stockTransfer } from '../utils/inventoryFactory';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Header from '../components/ui/Header';
import AsyncDropdown from '../components/AsyncDropdown';
import FooterError from '../components/common/FooterError';
import { transferStock } from '../services/stockTransfer';
import { useSuccessSound } from '../utils/useSuccessSound';
import { toDateString } from '../utils/stringUtils';
import { StockTransferPayload } from '../types/stockTransfer';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'StockTransfer'>;
};

const StockTransfer: React.FC<Props> = ({ navigation }) => {
    const currency = useCurrency();
    const insets = useSafeAreaInsets();
    const { play } = useSuccessSound();

    const [payload, setPayload] = useState<StockTransferPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [footerError, setFooterError] = useState<string | null>(null);

    let resetSwipe: (() => void) | null = null;

    useEffect(() => {
        if (currency) setPayload(stockTransfer(currency));
    }, [currency]);

    const showError = (message: string) => {
        setFooterError(message);
        setTimeout(() => setFooterError(null), 4000);
    };

    const validate = (): string | null => {
        if (!payload?.destination) return 'Please select a destination branch.';
        if (!payload?.cart?.length) return 'Please add at least one item.';
        return null;
    };

    const updatePayload: React.Dispatch<React.SetStateAction<StockTransferPayload>> = (next) => {
        setPayload((prev) => {
            if (!prev) return prev;
            if (typeof next === 'function') {
                const updater = next as (prevState: StockTransferPayload) => StockTransferPayload;
                return updater(prev);
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        if (loading) return;
        const error = validate();
        if (error) {
            showError(error);
            resetSwipe?.();
            return;
        }
        try {
            setLoading(true);
            const submitPayload = {
                ...payload,
                date: toDateString(payload?.date as Date),
                cart: payload?.cart.map((item: any) => ({ ...item, adjustment: '-' })),
            };
            await transferStock(submitPayload);
            play();
            if (currency) setPayload(stockTransfer(currency));
            Alert.alert(
                'Transfer Successful',
                'Stock has been transferred to the selected branch successfully.',
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
            );
        } catch (err: any) {
            const apiErrors: string[] = [];
            if (err?.response?.data?.errors) {
                Object.values(err.response.data.errors).forEach((msgs: any) => {
                    if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m));
                    else if (typeof msgs === 'string') apiErrors.push(msgs);
                });
            } else {
                apiErrors.push(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
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
        <>
            <KeyboardAvoidingView
                style={styles.kavRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

                    <Header title="Transfer Stock" navigation={navigation} />

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                    >
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

                        {payload && (
                            <Shopping
                                attribute="cart"
                                payload={payload}
                                setPayload={updatePayload}
                                showPrice="no"
                                listingTitle="ITEMS TO TRANSFER"
                            />
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: insets.bottom || 8 }]}>
                        {footerError ? (
                            <FooterError
                                setFooterError={setFooterError}
                                footerError={footerError}
                            />
                        ) : null}
                        <SwipeButton
                            title={loading ? 'Processing...' : 'Slide to Transfer'}
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
                            onSwipeSuccess={handleSubmit}
                            forceReset={(reset: () => void) => { resetSwipe = reset; }}
                        />
                    </View>

                </SafeAreaView>
            </KeyboardAvoidingView>

           
        </>
    );
};

export default StockTransfer;

const styles = StyleSheet.create({
    kavRoot: {
        flex: 1,
        backgroundColor: colors.white,
    },
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, gap: 20, paddingBottom: 16 },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
});
