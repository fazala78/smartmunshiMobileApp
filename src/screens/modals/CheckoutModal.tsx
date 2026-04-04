import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { toDateString } from '../../utils/stringUtils';
import useConfiguration from '../../utils/configuration';
import FooterError from '../../components/common/FooterError';
import { useSuccessSound } from '../../utils/useSuccessSound';
//import Sound from 'react-native-sound';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutModalProps {
  visible: boolean;
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onConfirm: (invoice: any) => void;
  onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible, payload, setPayload, onConfirm, onDismiss,
}) => {

  const currency = useCurrency();
  const configuration = useConfiguration();
  const { play } = useSuccessSound();

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null); // replaces toast
  let resetSwipe: (() => void) | null = null;

  // ── Error helper ───────────────────────────────────────────────────────────
  const showError = (message: string) => {
    setFooterError(message);
    // Auto-clear after 4 s
    setTimeout(() => setFooterError(null), 4000);
  };

  const clearErrors = () => setFooterError(null);

  // ── Payment helpers ────────────────────────────────────────────────────────
  const addEntry = (payment: Payment) => {
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
        payments: prev.payments.map((e, i) => (i === index ? { ...e, ...fields } : e)),
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
    if (!payload.contact)
      errs.push('Please select a customer before checkout.');
    if (payload.payments?.some((e) => !e.amount || e.amount <= 0))
      errs.push('One or more payment entries has a missing or zero amount.');
    if (!Array.isArray(payload.cart) || payload.cart.length === 0)
      errs.push('Cart is empty. Please add items before checkout.');
    return errs;
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const checkOut = async () => {
    if (loading) return;

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      showError(validationErrors[0]);
      resetSwipe?.();
      return;
    }

    try {
      setLoading(true);
      const submitPayload = { ...payload, date: toDateString(payload.date as Date) };
      const invoice = await createInvoice(submitPayload as Inventory);
      play();
      onConfirm(invoice);
    } catch (error: any) {
      resetSwipe?.();

      const apiErrors: string[] = [];
      if (error?.response?.data?.errors) {
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

      showError(apiErrors[0] ?? 'Something went wrong.');
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
      : <Icon name="arrow-forward" size={20} color="#fff" />;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>

        {/*
         * FIX 1 — KeyboardAvoidingView wraps the entire bottom sheet.
         *
         * When the keyboard opens, KAV shrinks the sheet height so the
         * footer (SwipeButton) stays visible above the keyboard.
         *
         * behavior:
         *  - 'padding' on iOS  → adds paddingBottom equal to keyboard height
         *  - 'height'  on Android → shrinks the view height
         *
         * The container uses flex:1 inside KAV so the ScrollView absorbs
         * the size change and the footer stays pinned at the bottom.
         */}
        <KeyboardAvoidingView
          style={styles.kavSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.container}>

            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.handleBar} />
              <View style={styles.headerRow}>
                <Text style={styles.title}>Checkout Sale</Text>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
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

            {/* ── Body — flex:1 so it shrinks when keyboard pushes footer up ── */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <DatePickerField
                label="Date"
                value={payload?.date as Date}
                onChange={(date) =>
                  setPayload((prev) => prev ? { ...prev, date } as Inventory : prev)
                }
                placeholder="Select date"
                inputBg={colors.backgroundLight}
              />

              <DatePickerField
                label="Due Date"
                value={payload?.due_date}
                onChange={(date) =>
                  setPayload((prev) => prev ? { ...prev, due_date: date } as Inventory : prev)
                }
                placeholder="Select Due date"
                inputBg={colors.backgroundLight}
              />

              <InputField
                bg="white"
                textAlign="left"
                label="Discount"
                type="decimal"
                value={String(payload?.discount || '')}
                onChangeText={(value) => {
                  clearErrors();
                  setPayload((prev) =>
                    prev ? { ...prev, discount: parseFloat(value) || 0 } as Inventory : prev
                  );
                }}
                placeholder="e.g. 10.00"
                icon="discount"
              />

              {/* ── Payment Method ── */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.sectionHeader, paymentOpen && styles.sectionHeaderOpen]}
                  onPress={() => setPaymentOpen((p) => !p)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#eff6ff' }]}>
                    <Icon name="payments" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    {!paymentOpen && payload.payments.length > 0 && (
                      <Text style={styles.sectionSubtitle}>
                        {payload.payments.length}{' '}
                        {payload.payments.length === 1 ? 'entry' : 'entries'} · ${totalPaid.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <Icon
                    name={paymentOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={22}
                    color={colors.gray400}
                  />
                </TouchableOpacity>

                {paymentOpen && (
                  <View style={styles.sectionBody}>
                    <View>
                      <Text style={styles.addPaymentLabel}>Add Payment</Text>
                      <View style={styles.paymentTabs}>
                        {RECEIVE_PAYMENT.map((payment) => (
                          <TouchableOpacity
                            key={payment.lable}
                            style={[
                              styles.paymentTab,
                              { borderColor: payment.color + '40', backgroundColor: payment.bg },
                            ]}
                            onPress={() => addEntry(payment as Payment)}
                            activeOpacity={0.7}
                          >
                            <Icon name={payment.icon} size={20} color={payment.color} />
                            <Text style={[styles.paymentTabText, { color: payment.color }]}>
                              {payment.lable}
                            </Text>
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
                                <Text style={[styles.entryMethodText, { color: entry.color }]}>
                                  {entry.lable}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => removeEntry(index)}
                                style={styles.entryRemoveBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Icon name="close" size={16} color={colors.gray400} />
                              </TouchableOpacity>
                            </View>

                            <InputField bg="gray" textAlign="left" label="Amount" type="decimal"
                              value={String(entry.amount || '')}
                              onChangeText={(v) => updateEntry(index, { amount: parseFloat(v) || 0 })}
                              placeholder="0.00" icon="attach-money" />

                            {entry.lable === 'Online' && (
                              <>
                                <AsyncDropdown
                                  url="/accounts" searchParam="q" minSearchLength={3}
                                  creatable={false} label="Bank Account"
                                  leadingIconName="account-balance" inputBg={colors.white}
                                  onSelect={(v) => updateEntry(index, { account: v as unknown as Account })}
                                  value={null}
                                />
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
                                  <AsyncDropdown
                                    url="/banks" searchParam="q" leadingIconName="account-balance"
                                    minSearchLength={4} creatable={false} inputBg={colors.white}
                                    label="Issuing Bank"
                                    onSelect={(v) => updateEntry(index, { bank: v as unknown as Bank })}
                                    value={null}
                                  />
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
                          <Text style={styles.balanceSub}>
                            Paid ${totalPaid.toFixed(2)} of ${total.toFixed(2)}
                          </Text>
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
                  onPress={() => setReturnsOpen((p) => !p)}
                  activeOpacity={0.75}
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
                    ) : (!returnsOpen && (
                      <Text style={styles.sectionSubtitle}>Tap to add returns</Text>
                    ))}
                  </View>
                  <Icon
                    name={returnsOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={22}
                    color={colors.gray400}
                  />
                </TouchableOpacity>

                {returnsOpen && (
                  <View style={[styles.sectionBody, { zIndex: 10 }]}>
                    <Shopping
                      attribute="mixed_cart"
                      payload={payload}
                      setPayload={setPayload}
                      listingTitle={null}
                    />
                  </View>
                )}
              </View>

              {/* ── Shipping ── */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.sectionHeader, shippingOpen && styles.sectionHeaderOpen]}
                  onPress={() => setShippingOpen((p) => !p)}
                  activeOpacity={0.75}
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
                    ) : (!shippingOpen && (
                      <Text style={styles.sectionSubtitle}>Optional</Text>
                    ))}
                  </View>
                  <Icon
                    name={shippingOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={22}
                    color={colors.gray400}
                  />
                </TouchableOpacity>

                {shippingOpen && (
                  <View style={styles.sectionBody}>
                    <AsyncDropdown
                      url="/search-contact" searchParam="q" minSearchLength={4}
                      creatable={false} label="Shipper" inputBg={colors.backgroundLight}
                      leadingIconName="local-shipping"
                      value={null}
                      onSelect={(customer) =>
                        setPayload((prev) =>
                          prev
                            ? { ...prev, shipping: { ...prev.shipping, shipper: customer } } as Inventory
                            : prev
                        )
                      }
                    />
                    <InputField bg="white" label="Shipping Cost" type="decimal"
                      value={String(payload?.shipping?.shipping_amount ?? '')}
                      onChangeText={(v) =>
                        setPayload((prev) =>
                          prev
                            ? { ...prev, shipping: { ...prev.shipping, shipping_amount: parseFloat(v) } } as Inventory
                            : prev
                        )
                      }
                      placeholder="Enter Amount" icon="attach-money" />
                    <InputField bg="white" label="Tracking Number" type="text"
                      value={payload?.shipping?.shipping_ticket ?? ''}
                      onChangeText={(v) =>
                        setPayload((prev) =>
                          prev
                            ? { ...prev, shipping: { ...prev.shipping, shipping_ticket: v } } as Inventory
                            : prev
                        )
                      }
                      placeholder="Enter tracking #" icon="qr-code-scanner" autoCapitalize="characters" />
                    <InputField bg="white" label="Remarks" type="text"
                      value={payload?.shipping?.remarks ?? ''}
                      onChangeText={(v) =>
                        setPayload((prev) =>
                          prev
                            ? { ...prev, shipping: { ...prev.shipping, remarks: v } } as Inventory
                            : prev
                        )
                      }
                      placeholder="Additional notes..." icon="description" multiline numberOfLines={3} />
                    <SwitchField
                      labelFalse="Client Pays"
                      labelTrue="Owner Pays"
                      value={payload?.shipping?.owner_pay_shipping ?? false}
                      onChange={(v) =>
                        setPayload((prev) =>
                          prev
                            ? { ...prev, shipping: { ...prev.shipping, owner_pay_shipping: v } } as Inventory
                            : prev
                        )
                      }
                    />
                  </View>
                )}
              </View>

              <InputField bg="white" textAlign="left" label="Remarks" type="text"
                value={payload?.remarks}
                onChangeText={(v) =>
                  setPayload((prev) =>
                    prev ? { ...prev, remarks: v || '' } as Inventory : prev
                  )
                }
                placeholder="Remarks" icon="description" multiline numberOfLines={3} />

              <TransactionSummary payload={payload} />
            </ScrollView>

            {/*
             * ── Footer ──────────────────────────────────────────────────────
             *
             * FIX 2 — Error banner replaces the floating toast.
             * It sits directly above the SwipeButton inside the footer so
             * the user sees it without the keyboard obscuring it.
             *
             * FIX 3 — SwipeButton height reduced from 64 → 48 px.
             * Saves 16 px of footer height so more of the sheet stays
             * visible when the keyboard is open.
             */}
            <View style={styles.footer}>

              {/* Inline error — shown instead of a floating toast */}
              {footerError ? (
                <FooterError
                  setFooterError={setFooterError}
                  footerError={footerError}
                />

              ) : null}

              {/* Compact SwipeButton */}
              <SwipeButton
                title={loading ? 'Processing...' : 'Slide to checkout'}
                thumbIconComponent={ThumbIcon}
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
                forceReset={(reset: () => void) => { resetSwipe = reset; }}
              />
            </View>

          </View>
        </KeyboardAvoidingView>

        {/* Return item add/edit modal */}
        <AddItemModal
          visible={pendingReturn !== null}
          pendingProduct={pendingReturn}
          editingIndex={editingReturnIndex}
          onChange={setPendingReturn}
          onConfirm={handleReturnConfirm}
          onDismiss={() => { setPendingReturn(null); setEditingReturnIndex(null); }}
          configuration={configuration}
        />

      </View>
    </Modal>
  );
};

export default CheckoutModal;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.backgroundOverlay,
    justifyContent: 'flex-end',
  },

  /*
   * kavSheet sits at the bottom of the overlay and owns the sheet height.
   * When the keyboard opens, KAV shrinks this view — the ScrollView inside
   * absorbs the size change and the footer stays pinned above the keyboard.
   */
  kavSheet: {
    height: '92%',
  },

  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // ── Header ──────────────────────────────────────────────────────────────
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
  title: { fontSize: 20, fontWeight: '800', color: colors.gray800 },
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
  contactChipText: { textTransform: 'capitalize', fontSize: 15, fontWeight: '600', color: colors.gray600, maxWidth: 500 },

  // ── Body ────────────────────────────────────────────────────────────────
  body: { flex: 1, minHeight: 0 },
  bodyContent: { padding: 24, gap: 16, paddingBottom: 16 },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },

  /*
   * FIX 2 — Inline error banner replaces the floating toast.
   * Lives inside the footer so it is never obscured by the keyboard.
   */


  // ── Sections ─────────────────────────────────────────────────────────────
  section: { gap: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.gray50,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  sectionHeaderOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.gray200,
    backgroundColor: colors.gray100,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.gray800 },
  sectionSubtitle: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  sectionBody: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.gray200,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 14,
    gap: 14,
    backgroundColor: colors.white,
  },

  // ── Payment ───────────────────────────────────────────────────────────────
  addPaymentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray400,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  paymentTabs: { flexDirection: 'row', gap: 8 },
  paymentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  paymentTabText: { fontSize: 11, fontWeight: '800' },
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

  entriesList: { gap: 10 },
  entryCard: {
    borderLeftWidth: 3,
    gap: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 12,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryMethodText: { fontSize: 12, fontWeight: '700' },
  entryRemoveBtn: { padding: 4 },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  balanceRowOver: { backgroundColor: colors.errorBg },
  balanceRowExact: { backgroundColor: colors.primaryLight },
  balanceLabel: { fontSize: 13, fontWeight: '700', color: colors.gray700 },
  balanceSub: { fontSize: 11, color: colors.gray500, marginTop: 2 },
  balanceAmount: { fontSize: 20, fontWeight: '900', color: colors.gray900 },

  deductionBadge: {
    backgroundColor: colors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deductionBadgeText: { fontSize: 11, fontWeight: '700', color: colors.dangerDark },
  shippingBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shippingBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
});