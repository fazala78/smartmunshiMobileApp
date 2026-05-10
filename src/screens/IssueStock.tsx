// screens/NextProcessScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Animated,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import Header from '../components/ui/Header';
import { StepDots } from '../components/assembly/StepShared';
import { colors, spacing } from '../theme';
import { FormData } from '../types/assembly';
import FooterError from '../components/common/FooterError';
import { toDateString } from '../utils/stringUtils';
import { useSuccessSound } from '../utils/useSuccessSound';
import { issueStock } from '../services/assemblyService';
import useCurrency from '../utils/currency';
import StockIssueStep from '../components/assembly/StockIssueStep';

// ─── Navigation types ─────────────────────────────────────────────────────────

type RootStackParamList = {
    issueStock: { step: any };
    [key: string]: object | undefined;
};

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'issueStock'>;
};

// ─── This screen has a fixed 4-step flow (no source branching) ────────────────
//   Step 1 → ProductionBillingStep   (screenIndex 1)
//   Step 2 → Purchasing detail          (screenIndex 2)
//   Step 3 → HandOverStep            (screenIndex 3)
const TOTAL_STEPS = 1;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateScreen(screenIndex: number, data: FormData): string | null {
    switch (screenIndex) {
        case 1:
            // ProductionBillingStep — cart must have items
            if (!data.mixed_cart || data.mixed_cart.length === 0)
                return 'Please add at least one item before continuing.';
            return null;

        default:
            return null;
    }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IssueStock({ navigation }: Props) {
    // ── Read stepId from route params — correct way for stack screens ──────────
    const route = useRoute<RouteProp<RootStackParamList, 'issueStock'>>();
    const { step } = route.params;

    const currency = useCurrency();

    const [formData, setFormData] = useState<FormData>({
        lot_number: '',
        source: 'stock',
        discount: null,
        invoice_number: '',
        contact: null,
        cart: [],
        quantity: '',
        manufacturer: null,
        process: null,
        date: new Date(),
        remarks: '',
        mixed_cart: [],
        currency: null,
        shipping: {
            shipping_amount: null,
            shipper: null,
            shipping_ticket: '',
            remarks: '',
            asset_id: null,
            owner_pay_shipping: false,
        },
    });

    // Sync currency once the hook resolves
    useEffect(() => {
        if (currency) setFormData((prev) => ({ ...prev, currency }));
    }, [currency]);

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const slideAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
    const isSubmittingRef = useRef<boolean>(false);

    const { play } = useSuccessSound();



    // ── Slide transition ───────────────────────────────────────────────────────

    const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
        Animated.timing(slideAnim, {
            toValue: direction === 'forward' ? -30 : 30,
            duration: 120,
            useNativeDriver: true,
        }).start(() => {
            callback();
            slideAnim.setValue(direction === 'forward' ? 30 : -30);
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 300,
                friction: 20,
                useNativeDriver: true,
            }).start();
        });
    };

    const goNext = () => {
        const error = validateScreen(currentStep, formData);
        if (error) { setValidationError(error); return; }
        setValidationError(null);
        if (currentStep < TOTAL_STEPS) {
            animateTransition('forward', () => setCurrentStep((s) => s + 1));
        }
    };

    const goBack = () => {
        setValidationError(null);
        if (currentStep > 1) {
            animateTransition('back', () => setCurrentStep((s) => s - 1));
        }
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;

        const error = validateScreen(currentStep, formData);
        if (error) { setValidationError(error); return; }

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setValidationError(null);

        try {
            const payload: any = {
                ...formData,
                step_id: step.id,    
                lot_number:step.lot_number,
                lot_id:step.lot_id,
                contact:step.contact_id,                          // pass the originating step id
                date: toDateString(formData.date as Date),
            };

            // NextProcess always posts to the same endpoint

            const lot = await issueStock(payload);

            play();

            Alert.alert(
                'Stock issued',
                `stock issued to Lot ${lot?.lot_number ?? ''} successfully. ✅`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (error: any) {
            setValidationError(
                error?.message ?? 'Something went wrong. Please try again.',
            );
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    // ── Step renderer — straightforward 1-to-1, no source branching ───────────

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                // stepId from route params passed to ProductionBillingStep
                return (
                    
                    <StockIssueStep
                        data={formData}
                        setFormData={setFormData}
                        formDataAttribute="mixed_cart"
                    />
                );

            default:
                return null;
        }
    };

    const isLastStep = currentStep === TOTAL_STEPS;
    const nextButtonLabel = isLastStep
        ? 'Submit Order'
        : currentStep === 1
            ? 'Continue to Stock Issue'
            : 'Next Step';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Header title="Next Stage" navigation={navigation} />

                <View style={styles.dotsContainer}>
                    <StepDots total={TOTAL_STEPS} current={currentStep} />
                </View>

                <Animated.View
                    style={[styles.animatedStep, { transform: [{ translateX: slideAnim }] }]}
                >
                    {renderStep()}
                </Animated.View>

                <View style={styles.footer}>
                    {validationError && (
                        <FooterError
                            footerError={validationError}
                            setFooterError={setValidationError}
                        />
                    )}

                    <View style={styles.buttonRow}>
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={goBack}
                                style={[styles.btnBack, isSubmitting && styles.btnDisabled]}
                                activeOpacity={0.8}
                                disabled={isSubmitting}
                                accessibilityLabel="Go to previous step"
                            >
                                <Text style={styles.btnBackText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={isLastStep ? handleSubmit : goNext}
                            style={[
                                styles.btnNext,
                                currentStep === 1 && styles.btnNextFull,
                                isSubmitting && styles.btnSubmitting,
                            ]}
                            activeOpacity={0.85}
                            disabled={isSubmitting}
                            accessibilityLabel={isSubmitting ? 'Submitting…' : nextButtonLabel}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={colors.textInverse} />
                            ) : (
                                <>
                                    <Text style={styles.btnNextText}>{nextButtonLabel}</Text>
                                    {!isLastStep && <Text style={styles.btnArrow}> →</Text>}
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: colors.white },
    dotsContainer: {
        paddingTop: spacing.sm,
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    animatedStep: { flex: 1, backgroundColor: colors.white },
    footer: {
        flexDirection: 'column',
        paddingHorizontal: spacing.lg,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    btnBack: {
        flex: 1,
        height: 54,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
    },
    btnBackText: { fontWeight: '700', fontSize: 15, color: colors.textSecondary },
    btnNext: {
        flex: 2,
        height: 54,
        borderRadius: 16,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    btnNextFull: { flex: 1 },
    btnSubmitting: { opacity: 0.65, shadowOpacity: 0, elevation: 0 },
    btnDisabled: { opacity: 0.4 },
    btnNextText: { fontWeight: '700', fontSize: 15, color: colors.textInverse },
    btnArrow: { color: colors.textInverse, fontSize: 17, fontWeight: '700' },
});