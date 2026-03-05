import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SwipeButton from 'rn-swipe-button';
import AddItemModal from './AddItemModal';
import { Account, Bank, Cart, Inventory, Payment } from '../../types/Inventory';
import { RECEIVE_PAYMENT } from '../../constants/paymentTypes';
import useCurrency from '../../utils/currency';
import { colors } from '../../theme';
import AsyncDropdown from '../../components/AsyncDropdown';
import DatePickerField from '../../components/DatePickerField';
import InputField from '../../components/ui/InputField';
import Shopping from '../../components/Shopping';
import SwitchField from '../../components/ui/SwitchField';
import { createInvoice } from '../../services/transactionService';
import TransactionSummary from '../../components/TransactionSummary';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutModalProps {
  visible: boolean;
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onConfirm: (invoice: any) => void;
  onDismiss: () => void;
  /** Open your receipt modal with the API response */
  // onReceipt:  (invoice: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible, payload, setPayload, onConfirm, onDismiss,
}) => {

  const currency = useCurrency();

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  let resetSwipe: (() => void) | null = null;

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message: string) => {
    setToast(message);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.delay(3500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const clearErrors = () => { };

  // ── Payment helpers ────────────────────────────────────────────────────────
  const addEntry = (payment: any) => {
    clearErrors();
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: [...(Array.isArray(prev.payments) ? prev.payments : []), { ...payment, currency }],
      } as Inventory;
    });
  };

  const removeEntry = (index: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return { ...prev, payments: prev.payments.filter((_, i) => i !== index) } as Inventory;
    });
  };

  const updateEntry = (index: number, fields: Partial<Payment>) => {
    clearErrors();
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: prev.payments.map((e, i) => i === index ? { ...e, ...fields } : e),
      } as Inventory;
    });
  };

  const totalPaid = Array.isArray(payload?.payments)
    ? payload.payments.reduce((sum, e) => sum + parseFloat(String(e.amount || 0)), 0)
    : 0;

  // ── Returns ────────────────────────────────────────────────────────────────
  const [pendingReturn, setPendingReturn] = useState<Cart | null>(null);
  const [editingReturnIndex, setEditingReturnIndex] = useState<number | null>(null);

  const handleReturnConfirm = () => {
    if (!pendingReturn) return;
    if (editingReturnIndex !== null) {
      setPayload((prev) => {
        if (!prev) return prev;
        const updated = [...prev.mixed_cart];
        updated[editingReturnIndex] = pendingReturn;
        return { ...prev, mixed_cart: updated } as Inventory;
      });
    } else {
      setPayload((prev) => {
        if (!prev) return prev;
        const exists = prev.mixed_cart.some((r) => String(r.id) === String(pendingReturn.id));
        return exists ? prev : { ...prev, mixed_cart: [...prev.mixed_cart, pendingReturn] } as Inventory;
      });
    }
    setPendingReturn(null);
    setEditingReturnIndex(null);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const returnsTotal = Array.isArray(payload?.mixed_cart)
    ? payload.mixed_cart.reduce((s, r) => s + parseFloat(String(r.price || 0)) * parseFloat(String(r.quantity || 1)), 0)
    : 0;
  const shippingCostAmt = parseFloat(String(payload?.shipping?.shipping_amount || 0));
  const total = Math.max(0, (payload?.summary?.total ?? 0) - (payload?.discount ?? 0) - returnsTotal + shippingCostAmt);
  const remaining = total - totalPaid;
  const changeDue = totalPaid - total;
  const fullyPaid = totalPaid > 0 && totalPaid >= total;

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

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      showToast(validationErrors[0]);
      resetSwipe?.();
      return;
    }

    try {
      setLoading(true);

      const invoice = await createInvoice(payload);

      // Success — hand off to receipt modal
      onConfirm(invoice);
      // onReceipt(invoice);

    } catch (error: any) {
      resetSwipe?.();

      // ── Parse API validation errors ──
      const apiErrors: string[] = [];

      if (error?.response?.data?.errors) {
        // Laravel-style: { errors: { field: ['msg'] } }
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

      showToast(apiErrors[0] ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Accordion state ────────────────────────────────────────────────────────
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);

  const ThumbIcon = () =>
    loading
      ? <ActivityIndicator size="small" color="#fff" />
      : <Icon name="arrow-forward" size={26} color="#fff" />;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Checkout Sale</Text>
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
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Toast ── */}
            {toast && (
              <Animated.View style={[
                styles.toast,
                {
                  opacity: toastAnim,
                  transform: [{
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1], outputRange: [-12, 0],
                    }),
                  }],
                },
              ]}>
                <Icon name="error-outline" size={16} color={colors.white} />
                <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
                <TouchableOpacity onPress={() => setToast(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={15} color={colors.errorBg} />
                </TouchableOpacity>
              </Animated.View>
            )}


            <DatePickerField label="Date" value={payload?.date}
              onChange={(date) => setPayload((prev) => {
                if (!prev) return prev;
                return { ...prev, date: date } as Inventory;
              })}
              placeholder="Select date" inputBg={colors.backgroundLight} />

            <DatePickerField label="Due Date" value={payload?.due_date}
              onChange={(date) => setPayload((prev) => {
                if (!prev) return prev;
                return { ...prev, due_date: date } as Inventory;
              })}
              placeholder="Select Due date" inputBg={colors.backgroundLight} />

            {/* Discount */}
            <InputField
              bg="white"
              textAlign="left"
              label="Discount"
              type="decimal"
              value={String(payload?.discount || '')}
              onChangeText={(value) => {
                clearErrors();
                setPayload((prev) => {
                  if (!prev) return prev;
                  return { ...prev, discount: parseFloat(value) || 0 } as Inventory;
                });
              }}
              placeholder="e.g. 10.00"
              icon="discount"
            />

            {/* ── Payment Method ── */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.sectionHeader, paymentOpen && styles.sectionHeaderOpen]}
                onPress={() => setPaymentOpen((p) => !p)} activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBadge, { backgroundColor: '#eff6ff' }]}>
                  <Icon name="payments" size={18} color={colors.primary} />
                </View>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  {!paymentOpen && payload.payments.length > 0 && (
                    <Text style={styles.sectionSubtitle}>
                      {payload.payments.length} {payload.payments.length === 1 ? 'entry' : 'entries'} · ${totalPaid.toFixed(2)}
                    </Text>
                  )}
                </View>
                <Icon name={paymentOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={colors.gray400} />
              </TouchableOpacity>

              {paymentOpen && (
                <View style={styles.sectionBody}>
                  <View>
                    <Text style={styles.addPaymentLabel}>Add Payment</Text>
                    <View style={styles.paymentTabs}>
                      {RECEIVE_PAYMENT.map((payment) => (
                        <TouchableOpacity
                          key={payment.lable}
                          style={[styles.paymentTab, { borderColor: payment.color + '40', backgroundColor: payment.bg }]}
                          onPress={() => addEntry(payment)}
                          activeOpacity={0.7}
                        >
                          <Icon name={payment.icon} size={20} color={payment.color} />
                          <Text style={[styles.paymentTabText, { color: payment.color }]}>{payment.lable}</Text>
                          <View style={[styles.addDot, { backgroundColor: payment.color }]}>
                            <Icon name="add" size={10} color={colors.white} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {payload.payments.length > 0 && (
                    <View style={styles.entriesList}>
                      {payload.payments.map((entry, index) => (
                        <View key={index} style={[styles.entryCard, { borderLeftColor: entry.color }]}>
                          <View style={styles.entryHeader}>
                            <View style={[styles.entryMethodBadge, { backgroundColor: entry.bg }]}>
                              <Icon name={entry.icon} size={14} color={entry.color} />
                              <Text style={[styles.entryMethodText, { color: entry.color }]}>{entry.lable}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeEntry(index)} style={styles.entryRemoveBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Icon name="close" size={16} color={colors.gray400} />
                            </TouchableOpacity>
                          </View>

                          <InputField bg="gray" textAlign="left" label="Amount" type="decimal"
                            value={String(entry.amount || '')}
                            onChangeText={(v) => updateEntry(index, { amount: parseFloat(v) || 0 })}
                            placeholder="0.00" icon="attach-money" />

                          {entry.lable === 'Online' && (
                            <>
                              <AsyncDropdown url="/accounts" searchParam="q" minSearchLength={3}
                                creatable={false} label="Bank Account" leadingIconName="account-balance"
                                inputBg={colors.white}
                                onSelect={(v) => updateEntry(index, { account: v as unknown as Account })} />
                              <InputField bg="gray" textAlign="left" label="Transaction ID" type="text"
                                value={entry.slip_number}
                                onChangeText={(v) => updateEntry(index, { slip_number: v })}
                                placeholder="Enter reference #" icon="tag" />
                            </>
                          )}

                          {entry.lable === 'Cheque' && (
                            <>
                              <InputField bg="gray" textAlign="left" label="Cheque Number" type="text"
                                value={entry.cheque_number}
                                onChangeText={(v) => updateEntry(index, { cheque_number: v })}
                                placeholder="e.g. 0012345" icon="description" />
                              <View style={{ zIndex: 3000 }}>
                                <AsyncDropdown url="/banks" searchParam="q" leadingIconName="account-balance"
                                  minSearchLength={4} creatable={false} inputBg={colors.white} label="Issuing Bank"
                                  onSelect={(v) => updateEntry(index, { bank: v as unknown as Bank })} />
                              </View>
                              <DatePickerField label="Clearing Date" value={entry.cheque_date}
                                onChange={(date) => updateEntry(index, { cheque_date: date })}
                                placeholder="Select date" inputBg={colors.white} />
                            </>
                          )}

                          <InputField bg="gray" textAlign="left" label="Remarks" type="text"
                            value={entry.remarks}
                            onChangeText={(v) => updateEntry(index, { remarks: v })}
                            placeholder="Remarks" icon="description" multiline numberOfLines={3} />
                        </View>
                      ))}
                    </View>
                  )}

                  {payload.payments.length > 0 && (
                    <View style={[
                      styles.balanceRow,
                      fullyPaid && changeDue > 0 && styles.balanceRowOver,
                      fullyPaid && changeDue === 0 && styles.balanceRowExact,
                    ]}>
                      <View>
                        <Text style={styles.balanceLabel}>
                          {fullyPaid ? (changeDue > 0 ? 'Change Due' : '✓ Fully Paid') : 'Remaining'}
                        </Text>
                        <Text style={styles.balanceSub}>Paid ${totalPaid.toFixed(2)} of ${total.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.balanceAmount}>
                        ${fullyPaid ? changeDue.toFixed(2) : remaining.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ── Product Returns ── */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.sectionHeader, returnsOpen && styles.sectionHeaderOpen]}
                onPress={() => setReturnsOpen((p) => !p)} activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBadge, { backgroundColor: '#fff1f2' }]}>
                  <Icon name="assignment-return" size={18} color={colors.error} />
                </View>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Product Returns</Text>
                  {returnsTotal > 0 ? (
                    <View style={styles.deductionBadge}>
                      <Text style={styles.deductionBadgeText}>-${returnsTotal.toFixed(2)}</Text>
                    </View>
                  ) : (!returnsOpen && <Text style={styles.sectionSubtitle}>Tap to add returns</Text>)}
                </View>
                <Icon name={returnsOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={colors.gray400} />
              </TouchableOpacity>

              {returnsOpen && (
                <View style={[styles.sectionBody, { zIndex: 10 }]}>
                  <Shopping attribute="mixed_cart" payload={payload} setPayload={setPayload} listingTitle={null} />
                </View>
              )}
            </View>

            {/* ── Shipping ── */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.sectionHeader, shippingOpen && styles.sectionHeaderOpen]}
                onPress={() => setShippingOpen((p) => !p)} activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBadge, { backgroundColor: '#f0fdf4' }]}>
                  <Icon name="local-shipping" size={18} color={colors.warning} />
                </View>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Shipping</Text>
                  {shippingCostAmt > 0 ? (
                    <View style={styles.shippingBadge}>
                      <Text style={styles.shippingBadgeText}>+${shippingCostAmt.toFixed(2)}</Text>
                    </View>
                  ) : (!shippingOpen && <Text style={styles.sectionSubtitle}>Optional</Text>)}
                </View>
                <Icon name={shippingOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={colors.gray400} />
              </TouchableOpacity>

              {shippingOpen && (
                <View style={styles.sectionBody}>
                  <AsyncDropdown url="/search-contact" searchParam="q" minSearchLength={4}
                    creatable={false} label="Shipper" inputBg={colors.backgroundLight}
                    leadingIconName="local-shipping"
                    onSelect={(customer) =>
                      setPayload((prev) => {
                        if (!prev) return prev;
                        return { ...prev, shipping: { ...prev.shipping, shipper: customer } } as Inventory;
                      })
                    } />
                  <InputField bg="white" label="Shipping Cost" type="decimal"
                    value={String(payload?.shipping?.shipping_amount ?? '')}
                    onChangeText={(v) =>
                      setPayload((prev) => {
                        if (!prev) return prev;
                        return { ...prev, shipping: { ...prev.shipping, shipping_amount: parseFloat(v) } } as Inventory;
                      })
                    }
                    placeholder="Enter Amount" icon="attach-money" />
                  <InputField bg="white" label="Tracking Number" type="text"
                    value={payload?.shipping?.shipping_ticket ?? ''}
                    onChangeText={(v) =>
                      setPayload((prev) => {
                        if (!prev) return prev;
                        return { ...prev, shipping: { ...prev.shipping, tracking_number: v } } as Inventory;
                      })
                    }
                    placeholder="Enter tracking #" icon="qr-code-scanner" autoCapitalize="characters" />
                  <InputField bg="white" label="Remarks" type="text"
                    value={payload?.shipping?.remarks ?? ''}
                    onChangeText={(v) =>
                      setPayload((prev) => {
                        if (!prev) return prev;
                        return { ...prev, shipping: { ...prev.shipping, remarks: v } } as Inventory;
                      })
                    }
                    placeholder="Additional notes..." icon="description" multiline numberOfLines={3} />
                  <SwitchField
                    labelFalse="Client Pays"
                    labelTrue="Owner Pays"
                    value={payload?.shipping?.owner_pay_shipping ?? false}
                    onChange={(v) =>
                      setPayload((prev) => {
                        if (!prev) return prev;
                        return { ...prev, shipping: { ...prev.shipping, owner_pay_shipping: v } } as Inventory;
                      })
                    }
                  />
                </View>
              )}
            </View>



            <InputField bg="white" textAlign="left" label="Remarks" type="text"
              value={payload?.remarks}
              onChangeText={(v) => setPayload((prev) => {
                if (!prev) return prev;
                return { ...prev, remarks: v || '' } as Inventory;
              })}
              placeholder="Remarks" icon="description" multiline numberOfLines={3} />

            {/* ── Summary ── */}
            <TransactionSummary payload={payload} />

          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <SwipeButton
              title={loading ? 'Processing...' : 'Slide to checkout'}
              thumbIconComponent={ThumbIcon}
              railBackgroundColor={colors.primaryLight}
              railBorderColor={colors.primaryLight}
              railFillBackgroundColor={colors.primary}
              thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
              thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
              titleColor={colors.backgroundDark}
              titleFontSize={15}
              height={64}
              swipeSuccessThreshold={70}
              disabled={loading}
              onSwipeSuccess={checkOut}
              forceReset={(reset: () => void) => { resetSwipe = reset; }}
            />
          </View>

        </View>

        {/* Return item add/edit modal */}
        <AddItemModal
          visible={pendingReturn !== null}
          pendingProduct={pendingReturn}
          editingIndex={editingReturnIndex}
          onChange={setPendingReturn}
          onConfirm={handleReturnConfirm}
          onDismiss={() => { setPendingReturn(null); setEditingReturnIndex(null); }}
        />

      </View>
    </Modal>
  );
};

export default CheckoutModal;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: colors.backgroundOverlay, justifyContent: 'flex-end' },
  container: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%', overflow: 'hidden' },

  header:          { alignItems: 'center', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.gray100, backgroundColor: colors.white, zIndex: 10 },
  handleBar:       { width: 48, height: 6, borderRadius: 3, backgroundColor: colors.gray300, marginBottom: 14 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  title:           { fontSize: 20, fontWeight: '800', color: colors.gray800 },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  contactChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: colors.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  contactChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600, maxWidth: 200 },

  body:        { flex: 1, minHeight: 0 },
  bodyContent: { padding: 24, gap: 16, paddingBottom: 16 },

  toast:     { position: 'absolute', top: 16, left: 16, right: 16, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.white, lineHeight: 18 },

  section:           { gap: 0 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gray50, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.gray200 },
  sectionHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: colors.gray200, backgroundColor: colors.gray100 },
  sectionIconBadge:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sectionTitle:      { fontSize: 14, fontWeight: '700', color: colors.gray800 },
  sectionSubtitle:   { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  sectionBody:       { borderWidth: 1.5, borderTopWidth: 0, borderColor: colors.gray200, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 14, gap: 14, backgroundColor: colors.white },

  addPaymentLabel: { fontSize: 11, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  paymentTabs:     { flexDirection: 'row', gap: 8 },
  paymentTab:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, gap: 4, position: 'relative' },
  paymentTabText:  { fontSize: 11, fontWeight: '800' },
  addDot:          { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  entriesList:      { gap: 10 },
  entryCard:        { borderLeftWidth: 3, gap: 12, backgroundColor: colors.gray50, borderRadius: 12, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 12 },
  entryHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  entryMethodText:  { fontSize: 12, fontWeight: '700' },
  entryRemoveBtn:   { padding: 4 },

  balanceRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.warningLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  balanceRowOver:  { backgroundColor: colors.errorBg },
  balanceRowExact: { backgroundColor: colors.primaryLight },
  balanceLabel:    { fontSize: 13, fontWeight: '700', color: colors.gray700 },
  balanceSub:      { fontSize: 11, color: colors.gray500, marginTop: 2 },
  balanceAmount:   { fontSize: 20, fontWeight: '900', color: colors.gray900 },

  deductionBadge:     { backgroundColor: colors.errorBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  deductionBadgeText: { fontSize: 11, fontWeight: '700', color: colors.dangerDark },
  shippingBadge:      { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  shippingBadgeText:  { fontSize: 11, fontWeight: '700', color: colors.primary },

  footer: { padding: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100 },
});