import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';

import { Cart, Inventory, Payment, PaymentMethod } from '../../types/Inventory';
import { RECEIVE_PAYMENT } from '../../constants/paymentTypes';
import { colors } from '../../theme';
import { createInvoice } from '../../services/transactionService';
import { getContactBallance } from '../../services/contactService';
import { toDateString } from '../../utils/stringUtils';
import useCurrency from '../../utils/currency';
import useConfiguration from '../../utils/configuration';
import { useSuccessSound } from '../../utils/useSuccessSound';

import DatePickerField from '../../components/DatePickerField';
import InputField from '../../components/ui/InputField';
import TransactionSummary from '../../components/TransactionSummary';
import FooterError from '../../components/common/FooterError';
import AddItemModal from './AddItemModal';
import PaymentModal from './PaymentModal';
import { CheckoutReturnModal } from './CheckoutReturnModal';
import { CheckoutShippingModal } from './CheckoutShippingModal';
import ModalHeader from '../../components/ModalHeader';
import { Button } from '../../components/ui';
import { usePermission } from '../../utils/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutModalProps {
  visible: boolean;
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onConfirm: (invoice: any) => void;
  onDismiss: () => void;
}

// ─── Pure helper ──────────────────────────────────────────────────────────────

/** Compute the net invoice total directly from payload — no derived state needed. */
const computeTotal = (payload: Inventory): number => {
  const subtotal = Array.isArray(payload.cart)
    ? payload.cart.reduce((s, i) => s + parseFloat(String(i.subtotal || 0)), 0)
    : 0;
  const returnsTotal = Array.isArray(payload.mixed_cart)
    ? payload.mixed_cart.reduce((s, i) => s + parseFloat(String(i.subtotal || 0)), 0)
    : 0;
  const shippingAmt = !payload.shipping?.owner_pay_shipping
    ? parseFloat(String(payload.shipping?.shipping_amount || 0))
    : 0;
  return Math.max(0, subtotal - (payload.discount ?? 0) - returnsTotal + shippingAmt);
};

// ─── Component ────────────────────────────────────────────────────────────────

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible, payload, setPayload, onConfirm, onDismiss,
}) => {
  const currency = useCurrency();
  const configuration = useConfiguration();
  const { play } = useSuccessSound();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [pendingReturn, setPendingReturn] = useState<Cart | null>(null);
  const [editingReturnIndex, setEditingReturnIndex] = useState<number | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const canCreateReceipt = usePermission('create_receive_payment');

  const resetSwipe = useRef<(() => void) | null>(null);

  // ── Error helpers ───────────────────────────────────────────────────────────
  const showError = useCallback((msg: string) => {
    setFooterError(msg);
    setTimeout(() => setFooterError(null), 4000);
  }, []);

  const clearErrors = useCallback(() => setFooterError(null), []);

  // ── Effect: initialise mark_paid when modal opens ───────────────────────────
  // Walk-in contacts are always marked as paid; registered contacts default to unpaid.
  useEffect(() => {
    if (!visible) return;
    setPayload((prev) =>
      prev
        ? { ...prev, mark_paid: prev.contact?.type === 'walk-in' || !prev.contact?.id } as Inventory
        : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Effect: clear payments when mark_paid is turned  OFF ─────────────────────
  useEffect(() => {
    if (payload.mark_paid) return;
    setPayload((prev) => prev ? { ...prev, payments: [] } as Inventory : prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.mark_paid]);

  // ── Effect: keep the auto-cash payment in sync while mark_paid is ON ────────
  // Recalculates whenever anything that affects the total changes.
  useEffect(() => {
    if (!payload.mark_paid) return;

    const cashType = RECEIVE_PAYMENT.find((p) => p.lable === 'Cash');
    if (!cashType) return;

    const cashPayment: Payment = {
      ...cashType,                    // icon, color, bg, lable etc.
      type: cashType.type as PaymentMethod,  // Ensure type matches PaymentMethod
      amount: computeTotal(payload),  // always fresh, never mutates the constant
      currency: currency
    };
    if (cashPayment.amount && cashPayment.amount > 0) {
      setPayload((prev) => prev ? { ...prev, payments: [cashPayment] } as Inventory : prev);
    } else if (cashPayment.amount === 0) {
      setPayload((prev) => prev ? { ...prev, payments: [] } as Inventory : prev);
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    payload.mark_paid,
    payload.cart,
    payload.discount,
    payload.mixed_cart,
    payload.shipping?.shipping_amount,
    payload.shipping?.owner_pay_shipping,
    currency
  ]);

  // ── Effect: fetch contact balance when contact with ID is loaded ────────────
  useEffect(() => {
    if (!visible || !payload.contact?.id) return;

    const fetchBalance = async () => {
      try {
        const balance = await getContactBallance(payload.contact!.id);
        setPayload((prev) =>
          prev && prev.contact
            ? { ...prev, contact: { ...prev.contact, balance: parseFloat(String(balance)) } } as Inventory
            : prev
        );
      } catch (error) {
        console.error('Failed to fetch contact balance:', error);
      }
    };

    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, payload.contact?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMarkPaid = useCallback((value: boolean) => {
    setPayload((prev) => prev ? { ...prev, mark_paid: value } as Inventory : prev);
  }, [setPayload]);

  const handleReturnConfirm = useCallback(() => {
    if (!pendingReturn) return;
    setPayload((prev) => {
      if (!prev) return prev;
      if (editingReturnIndex !== null) {
        const updated = [...prev.mixed_cart];
        updated[editingReturnIndex] = pendingReturn;
        return { ...prev, mixed_cart: updated } as Inventory;
      }
      const exists = prev.mixed_cart.some((r) => String(r.id) === String(pendingReturn.id));
      return exists ? prev : { ...prev, mixed_cart: [...prev.mixed_cart, pendingReturn] } as Inventory;
    });
    setPendingReturn(null);
    setEditingReturnIndex(null);
  }, [pendingReturn, editingReturnIndex, setPayload]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!payload.contact)
      return 'Please select a customer before checkout.';
    if (!Array.isArray(payload.cart) || payload.cart.length === 0)
      return 'Cart is empty. Please add items before checkout.';
    if (payload.payments?.some((e) => !e.amount || e.amount <= 0))
      return 'One or more payment entries has a missing or zero amount.';
    return null;
  }, [payload]);

  // ── Enter review mode (show full-screen summary) ──────────────────────────────
  const handleReview = useCallback(() => {
    const err = validate();
    if (err) {
      showError(err);
      return;
    }
    setIsReviewMode(true);
  }, [validate, showError]);

  // ── Checkout ────────────────────────────────────────────────────────────────
  const checkOut = async () => {
    if (loading) return;

    const err = validate();
    if (err) {
      showError(err);
      resetSwipe.current?.();
      return;
    }

    try {
      setLoading(true);
      const invoice = await createInvoice({
        ...payload,
        date: toDateString(payload.date as Date),
      } as Inventory);
      play();
      setIsReviewMode(false);
      onConfirm(invoice);
    } catch (error: any) {
      resetSwipe.current?.();
      const msgs: string[] = [];
      if (error?.response?.data?.errors) {
        Object.values(error.response.data.errors).forEach((v: any) => {
          if (Array.isArray(v)) v.forEach((m: string) => msgs.push(m));
          else if (typeof v === 'string') msgs.push(v);
        });
      } else if (error?.response?.data?.message) {
        msgs.push(error.response.data.message);
      }
      showError(msgs[0] ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>

      {/* Backdrop: tap to dismiss keyboard; does NOT close the modal */}
      <Pressable style={s.overlay} onPress={Keyboard.dismiss}>

        <KeyboardAvoidingView
          style={s.kavSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={s.container}>

            {/* ── NORMAL CHECKOUT VIEW ── */}
            {!isReviewMode ? (
              <>
                {/* Header */}
                <ModalHeader onClose={onDismiss} title='Checkout Sale' />

                {/* Scrollable body */}
                <ScrollView
                  style={s.body}
                  contentContainerStyle={s.bodyContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={Keyboard.dismiss}
                >
                  {/* Dates */}
                  <View style={s.row}>
                    <View style={s.flexOne}>
                      <DatePickerField
                        label="Date"
                        value={payload.date as Date}
                        onChange={(date) =>
                          setPayload((prev) => prev ? { ...prev, date } as Inventory : prev)
                        }
                        placeholder="Select date"
                        inputBg={colors.backgroundLight}
                      />
                    </View>
                    <View style={s.flexOne}>
                      <DatePickerField
                        label="Due Date"
                        value={payload.due_date}
                        onChange={(date) =>
                          setPayload((prev) => prev ? { ...prev, due_date: date } as Inventory : prev)
                        }
                        placeholder="Select due date"
                        inputBg={colors.backgroundLight}
                      />
                    </View>
                  </View>

                  {/* Phone number — only for walk-in / unregistered contacts */}
                  {!payload.contact?.id && (
                    <InputField
                      bg="white"
                      textAlign="left"
                      label="Phone Number"
                      type="phone"
                      value={payload.contact?.phone ?? ''}
                      onChangeText={(v) =>
                        setPayload((prev) =>
                          prev && prev.contact
                            ? { ...prev, contact: { ...prev.contact, phone: v } } as Inventory
                            : prev
                        )
                      }
                      placeholder="e.g. 03001234567"
                      icon="phone"
                    />
                  )}

                  {/* Mark as Paid */}
                  <View style={s.markPaidCard}>
                    <View style={s.flexOne}>
                      <Text style={s.markPaidTitle}>Cash Sale</Text>
                      <Text style={s.markPaidSub}>
                        {payload.mark_paid
                          ? `Cash · $${computeTotal(payload).toFixed(2)}`
                          : 'Auto-fill full amount as cash'}
                      </Text>
                    </View>
                    <Switch
                      disabled={!canCreateReceipt}
                      value={payload.mark_paid ?? false}
                      onValueChange={handleMarkPaid}
                      trackColor={{ false: colors.gray700, true: colors.primary }}
                      thumbColor={payload.mark_paid ? colors.primary : colors.warning}
                    />
                  </View>

                  {/* Discount */}
                  <InputField
                    bg="white"
                    textAlign="left"
                    label="Discount"
                    type="decimal"
                    value={String(payload.discount || '')}
                    onChangeText={(v) => {
                      clearErrors();
                      setPayload((prev) =>
                        prev ? { ...prev, discount: parseFloat(v) || 0 } as Inventory : prev
                      );
                    }}
                    placeholder="e.g. 10.00"
                    icon="discount"
                  />

                  {/* Action tabs */}
                  <View style={s.row}>
                    {!payload.mark_paid && canCreateReceipt && (
                      <ActionTab
                        icon="payment"
                        label="Payment"
                        color={colors.primary}
                        onPress={() => setPaymentModalOpen(true)}
                      />
                    )}
                    
                    <ActionTab
                      icon="inventory"
                      label="Return"
                      color={colors.danger}
                      onPress={() => setReturnsOpen(true)}
                    />
                    <ActionTab
                      icon="local-shipping"
                      label="Shipping"
                      color={colors.warning}
                      onPress={() => setShippingOpen(true)}
                    />
                  </View>

                  {/* Remarks */}
                  <InputField
                    bg="white"
                    textAlign="left"
                    label="Remarks"
                    type="text"
                    value={payload.remarks}
                    onChangeText={(v) =>
                      setPayload((prev) =>
                        prev ? { ...prev, remarks: v || '' } as Inventory : prev
                      )
                    }
                    placeholder="Remarks"
                    icon="description"
                    multiline
                    numberOfLines={3}
                  />

                  <TransactionSummary payload={payload} />
                </ScrollView>

                {/* Footer with Checkout Button */}
                <View style={s.footer}>
                  {footerError && (
                    <FooterError
                      setFooterError={setFooterError}
                      footerError={footerError}
                    />
                  )}
                  <Button
                    title='Checkout'
                    size='medium'
                    onPress={handleReview}
                  />
                </View>
              </>
            ) : (
              <>
                {/* ── REVIEW MODE (FULL SCREEN SUMMARY) ── */}
                <View style={s.reviewHeader}>
                  <TouchableOpacity
                    onPress={() => setIsReviewMode(false)}
                    style={s.reviewBackBtn}
                  >
                    <Icon name="arrow-back" size={24} color={colors.gray800} />
                  </TouchableOpacity>
                  <Text style={s.reviewTitle}>Confirm Checkout</Text>
                  <View style={s.spacer24} />
                </View>

                {/* Full screen transaction summary */}
                <ScrollView
                  style={s.reviewBody}
                  contentContainerStyle={s.reviewBodyContent}
                  showsVerticalScrollIndicator={false}
                >
                  <TransactionSummary payload={payload} showBalanceOverview={true} />
                </ScrollView>

                {/* Swipe to confirm footer */}
                <View style={s.reviewFooter}>
                  {footerError && (
                    <FooterError
                      setFooterError={setFooterError}
                      footerError={footerError}
                    />
                  )}
                  <SwipeButton
                    title={loading ? 'Processing...' : 'Slide to confirm'}
                    // eslint-disable-next-line react/no-unstable-nested-components
                    thumbIconComponent={() => loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="arrow-forward" size={20} color="#fff" />}
                    railBackgroundColor={colors.primaryLight}
                    railBorderColor={colors.primaryLight}
                    railFillBackgroundColor={colors.primary}
                    thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                    thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                    titleColor={colors.backgroundDark}
                    titleFontSize={13}
                    height={52}
                    swipeSuccessThreshold={70}
                    disabled={loading}
                    onSwipeSuccess={checkOut}
                    forceReset={(reset: () => void) => { resetSwipe.current = reset; }}
                  />
                </View>
              </>
            )}

          </View>
        </KeyboardAvoidingView>

        {/* Sub-modals — outside KAV to avoid layout conflicts */}
        <AddItemModal
          visible={pendingReturn !== null}
          pendingProduct={pendingReturn}
          editingIndex={editingReturnIndex}
          onChange={setPendingReturn}
          onConfirm={handleReturnConfirm}
          onDismiss={() => { setPendingReturn(null); setEditingReturnIndex(null); }}
          configuration={configuration}
        />
        <PaymentModal
          visible={paymentModalOpen}
          payload={payload}
          setPayload={setPayload}
          onDismiss={() => setPaymentModalOpen(false)}
          totalDue={computeTotal(payload).toFixed(2)}
        />
        <CheckoutReturnModal
          visible={returnsOpen}
          payload={payload}
          setPayload={setPayload}
          onClose={() => setReturnsOpen(false)}
        />
        <CheckoutShippingModal
          visible={shippingOpen}
          payload={payload}
          setPayload={setPayload}
          onClose={() => setShippingOpen(false)}
        />

      </Pressable>
    </Modal>
  );
};

export default CheckoutModal;

// ─── ActionTab ────────────────────────────────────────────────────────────────

interface ActionTabProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

const ActionTab: React.FC<ActionTabProps> = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    style={[s.actionTab, { borderColor: color + '40', backgroundColor: color + '20' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={20} color={color} />
    <Text style={[s.actionTabText, { color }]}>{label}</Text>
    <View style={[s.addDot, { backgroundColor: color }]}>
      <Icon name="add" size={10} color={colors.white} />
    </View>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // ── Layout ──
  overlay: {
    flex: 1,
    backgroundColor: colors.backgroundOverlay,
    justifyContent: 'flex-end',
  },
  kavSheet: {
    height: '94%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // ── Header ──
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gray800,
  },
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
  contactChipText: {
    textTransform: 'capitalize',
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray600,
    maxWidth: 500,
  },

  // ── Body ──
  body: { flex: 1, minHeight: 0 },
  bodyContent: { padding: 20, gap: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', gap: 8 },
  flexOne: { flex: 1 },
  spacer24: { width: 24 },

  // ── Mark as Paid ──
  markPaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  markPaidTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gray500,
  },
  markPaidSub: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Action tabs ──
  actionTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  actionTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },

  // ── Review Mode ──
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    backgroundColor: colors.white,
  },
  reviewBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gray800,
  },
  reviewBody: {
    flex: 1,
    minHeight: 0
  },
  reviewBodyContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 20
  },
  reviewFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },
});