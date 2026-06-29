// screens/AddLotScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import Header from '../components/ui/Header';
import { StepDots } from '../components/assembly/StepShared';
import PurchaseStep from '../components/assembly/PurchaseStep';
import PurchaseDetailStep from '../components/assembly/PurchaseDetailStep';
import LotSummaryStep from '../components/assembly/LotSummaryStep';
import { colors, spacing } from '../theme';
import { LotFormData, SourceType } from '../types/assembly';
import LotDefinitionStep from '../components/assembly/LotDefinitionStep';
import HandOverStep from '../components/assembly/HandOverStep';
import StockIssueStep from '../components/assembly/StockIssueStep';
import FooterError from '../components/common/FooterError';
import { toDateString } from '../utils/stringUtils';
import { useSuccessSound } from '../utils/useSuccessSound';
import { createLot } from '../services/assemblyService';
import useCurrency from '../utils/currency';

type RootStackParamList = { addLot: undefined };
type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'addLot'> };

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateAutoLotNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `LOT-${year}${month}${day}-${random}`;
}

function resolveScreenIndex(step: number, source: SourceType): number {
  if (source === 'purchase') return step;
  const map: Record<number, number> = { 1: 1, 2: 5, 3: 4, 4: 3, 5: 6 };
  return map[step] ?? 1;
}

function resolveNextLabel(
  isLastStep: boolean,
  currentStep: number,
  source: SourceType
): string {
  if (isLastStep) return 'Submit Order';
  if (currentStep === 1) {
    return source === 'stock' ? 'Continue to Specification' : 'Continue to Purchase';
  }
  return 'Next Step';
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateScreen(screenIndex: number, data: LotFormData): string | null {
  switch (screenIndex) {
    case 1: {
      if (!data.lot_number || data.lot_number.trim() === '')
        return 'Please enter or generate a lot number before continuing.';
      if (!data.source)
        return 'Please select a material source before continuing.';
      return null;
    }
    case 2: {
      if (!data.contact)
        return 'Please select a supplier / contact before continuing.';
      if (!data.cart || data.cart.length === 0)
        return 'Please add at least one item to the cart before continuing.';
      return null;
    }
    case 3: {
      if (!data.invoice_number || data.invoice_number.trim() === '')
        return 'Please enter an invoice number before continuing.';
      return null;
    }
    case 4: {
      if (!data.manufacturer)
        return 'Please select a manufacturer before continuing.';
      if (!data.process)
        return 'Please select the process before continuing.';
      return null;
    }
    case 5: {
      const isPurchase = data.source === 'purchase';
      if (!isPurchase && (!data.cart || data.cart.length === 0))
        return 'Please add at least one item to the cart before continuing.';
      return null;
    }
    case 6:
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddLotScreen({ navigation }: Props) {
  const currency = useCurrency();

  const [formData, setFormData] = useState<LotFormData>({
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
    // currency may not be ready on first render (hook resolves async),
    // so we initialise to null and sync it in via useEffect below
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

  // ── Sync currency into formData whenever the hook resolves ───────────────
  useEffect(() => {
    if (currency) setFormData((prev) => ({ ...prev, currency }));
  }, [currency]);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const slideAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const isSubmittingRef = useRef<boolean>(false);

  const { play } = useSuccessSound();

  const totalSteps: number = formData.source === 'purchase' ? 6 : 5;
  const screenIndex: number = resolveScreenIndex(currentStep, formData.source);

  const handleChange = useCallback(
    <K extends keyof LotFormData>(key: K, value: LotFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setValidationError(null);
    },
    []
  );

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
    const error = validateScreen(screenIndex, formData);
    if (error) { setValidationError(error); return; }
    setValidationError(null);
    if (currentStep < totalSteps) {
      animateTransition('forward', () => setCurrentStep((s) => s + 1));
    }
  };

  const goBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      animateTransition('back', () => setCurrentStep((s) => s - 1));
    }
  };

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const error = validateScreen(screenIndex, formData);
    if (error) { setValidationError(error); return; }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setValidationError(null);

    try {
      const url = formData.source === 'purchase'
        ? '/purchase-lot'
        : '/stock-lot';

      const payload: any = {
        ...formData,
        date: toDateString(formData.date as Date),
        stock_source:formData.source,
      };

      const lot = await createLot(url, payload);
     

      play();

      Alert.alert(
        'Lot Created',
        `Lot ${lot.data.lot_number ?? ''} created successfully. ✅`,
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

  // ── Step renderer ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (screenIndex) {
      case 1:
        return (
          <LotDefinitionStep
            data={formData}
            onChange={handleChange}
            generateAutoLotNumber={generateAutoLotNumber}
          />
        );
      case 2:
        return <PurchaseStep data={formData} setFormData={setFormData} />;
      case 3:
        return <PurchaseDetailStep data={formData} setFormData={setFormData} />;
      case 4:
        return <HandOverStep data={formData} setFormData={setFormData} />;
      case 5:
        return (
          <StockIssueStep
            data={formData}
            setFormData={setFormData}
            formDataAttribute={formData.source === 'purchase' ? 'mixed_cart' : 'cart'}
            itemSearchUrl='search-lot-products'
            creatable={false}
          />
        );
      case 6:
        return <LotSummaryStep formData={formData} totalSteps={totalSteps} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === totalSteps;
  const nextButtonLabel = resolveNextLabel(isLastStep, currentStep, formData.source);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.flex}>
        <Header title="Manufacturing Workflow" navigation={navigation} />

        <View style={styles.dotsContainer}>
          <StepDots total={totalSteps} current={currentStep} />
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
  btnBackText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.textSecondary,
  },
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
  btnSubmitting: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnNextText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.textInverse,
  },
  btnArrow: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
});