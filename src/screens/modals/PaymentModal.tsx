import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Inventory, Payment, Account, Bank } from '../../types/Inventory';
import { RECEIVE_PAYMENT } from '../../constants/paymentTypes';
import { colors } from '../../theme';
import InputField from '../../components/ui/InputField';
import AsyncDropdown from '../../components/AsyncDropdown';
import DatePickerField from '../../components/DatePickerField';
import useCurrency from '../../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Full inventory payload — payments live in payload.payments */
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onDismiss: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** The "empty" draft for a freshly chosen payment type */
const blankDraft = (type: typeof RECEIVE_PAYMENT[0], currency: string): Payment => ({
  ...type,
  amount: 0,
  currency,
  remarks: '',
  slip_number: '',
  cheque_number: '',
  cheque_date: undefined,
  account: undefined,
  bank: undefined,
});

// ─── Entry Form ───────────────────────────────────────────────────────────────
// Renders the fields for one payment entry (new or being edited).

interface EntryFormProps {
  draft: Payment;
  onChange: (fields: Partial<Payment>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

const EntryForm: React.FC<EntryFormProps> = ({ draft, onChange, onSave, onCancel, isEdit }) => (
  <View style={s.formCard}>
    {/* Form header — coloured left border + type badge */}
    <View style={[s.formHeader, { borderLeftColor: draft.color }]}>
      <View style={[s.typeBadge, { backgroundColor: draft.bg }]}>
        <Icon name={draft.icon} size={14} color={draft.color} />
        <Text style={[s.typeBadgeText, { color: draft.color }]}>{draft.lable}</Text>
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close" size={18} color={colors.gray400} />
      </TouchableOpacity>
    </View>

    {/* Amount — always shown */}
    <InputField
      bg="gray"
      textAlign="left"
      label="Amount"
      type="decimal"
      value={String(draft.amount || '')}
      onChangeText={(v) => onChange({ amount: parseFloat(v) || 0 })}
      placeholder="0.00"
      icon="attach-money"
    />

    {/* Online-specific fields */}
    {draft.lable === 'Online' && (
      <>
        <AsyncDropdown
          url="/accounts"
          searchParam="q"
          minSearchLength={3}
          creatable={false}
          label="Bank Account"
          leadingIconName="account-balance"
          inputBg={colors.white}
          onSelect={(v) => onChange({ account: v as unknown as Account })}
          value={draft.account ?? null}
        />
        <InputField
          bg="gray"
          textAlign="left"
          label="Transaction ID"
          type="text"
          value={draft.slip_number ?? ''}
          onChangeText={(v) => onChange({ slip_number: v })}
          placeholder="Enter reference #"
          icon="tag"
        />
      </>
    )}

    {/* Cheque-specific fields */}
    {draft.lable === 'Cheque' && (
      <>
        <InputField
          bg="gray"
          textAlign="left"
          label="Cheque Number"
          type="text"
          value={draft.cheque_number ?? ''}
          onChangeText={(v) => onChange({ cheque_number: v })}
          placeholder="e.g. 0012345"
          icon="description"
        />
        <View style={{ zIndex: 3000 }}>
          <AsyncDropdown
            url="/banks"
            searchParam="q"
            leadingIconName="account-balance"
            minSearchLength={4}
            creatable={false}
            inputBg={colors.white}
            label="Issuing Bank"
            onSelect={(v) => onChange({ bank: v as unknown as Bank })}
            value={draft.bank ?? null}
          />
        </View>
        <DatePickerField
          label="Clearing Date"
          value={draft.cheque_date}
          onChange={(date) => onChange({ cheque_date: date })}
          placeholder="Select date"
          inputBg={colors.white}
        />
      </>
    )}

    {/* Remarks — always shown */}
    <InputField
      bg="gray"
      textAlign="left"
      label="Remarks"
      type="text"
      value={draft.remarks ?? ''}
      onChangeText={(v) => onChange({ remarks: v })}
      placeholder="Remarks"
      icon="description"
      multiline
      numberOfLines={3}
    />

    {/* Save button */}
    <TouchableOpacity
      style={[s.saveBtn, { backgroundColor: draft.color }]}
      onPress={onSave}
      activeOpacity={0.85}
      disabled={!draft.amount || draft.amount <= 0}
    >
      <Icon name="check" size={16} color="#fff" />
      <Text style={s.saveBtnText}>{isEdit ? 'Update Payment' : 'Add Payment'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Payment Chip (existing entry row) ───────────────────────────────────────

interface ChipProps {
  entry: Payment;
  onEdit: () => void;
  onRemove: () => void;
}

const PaymentChip: React.FC<ChipProps> = ({ entry, onEdit, onRemove }) => (
  <TouchableOpacity
    style={[s.chip, { borderLeftColor: entry.color }]}
    onPress={onEdit}
    activeOpacity={0.75}
  >
    {/* Type badge */}
    <View style={[s.typeBadge, { backgroundColor: entry.bg }]}>
      <Icon name={entry.icon} size={13} color={entry.color} />
      <Text style={[s.typeBadgeText, { color: entry.color }]}>{entry.lable}</Text>
    </View>

    {/* Amount */}
    <Text style={s.chipAmount}>${parseFloat(String(entry.amount || 0)).toFixed(2)}</Text>

    {/* Edit hint */}
    <View style={s.chipEditHint}>
      <Icon name="edit" size={13} color={colors.gray400} />
    </View>

    {/* Remove */}
    <TouchableOpacity
      onPress={onRemove}
      style={s.chipRemoveBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="close" size={15} color={colors.gray400} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Main PaymentModal ────────────────────────────────────────────────────────

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible, payload, setPayload, onDismiss,
}) => {
  const currency = useCurrency();

  // ── Local form state ──
  // null  → no form open (list view)
  // index → editing payload.payments[index]
  // -1    → adding a new entry
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Payment | null>(null);

  // Reset form whenever modal closes
  useEffect(() => {
    if (!visible) {
      setEditingIndex(null);
      setDraft(null);
    }
  }, [visible]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const payments: Payment[] = Array.isArray(payload?.payments) ? payload.payments : [];

  const totalPaid = payments.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0);

  /** Open "add" form for a chosen payment type */
  const openAdd = (type: typeof RECEIVE_PAYMENT[0]) => {
    setDraft(blankDraft(type, currency));
    setEditingIndex(-1);
  };

  /** Open "edit" form for an existing entry */
  const openEdit = (index: number) => {
    setDraft({ ...payments[index] });
    setEditingIndex(index);
  };

  /** Cancel / close the form — go back to list */
  const closeForm = () => {
    setDraft(null);
    setEditingIndex(null);
  };

  /** Save: either push new entry or replace existing one */
  const handleSave = () => {
    if (!draft) return;
    setPayload((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.payments) ? prev.payments : [];
      const updated =
        editingIndex === -1
          ? [...current, { ...draft, currency }]              // add
          : current.map((e, i) => (i === editingIndex ? { ...draft, currency } : e)); // edit
      return { ...prev, payments: updated } as Inventory;
    });
    closeForm();
  };

  /** Remove an entry from payload.payments */
  const handleRemove = (index: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: (Array.isArray(prev.payments) ? prev.payments : []).filter((_, i) => i !== index),
      } as Inventory;
    });
    // If the entry being removed was open in edit mode, close the form
    if (editingIndex === index) closeForm();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={s.overlay} onPress={onDismiss}>
          <Pressable style={s.sheet} onPress={() => {}}>

            {/* ── Handle + Header ── */}
            <View style={s.handleBar} />
            <View style={s.header}>
              <Text style={s.headerTitle}>Payment</Text>
              <TouchableOpacity
                onPress={onDismiss}
                style={s.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.body}
            >

              {/* ── Payment type selector (always visible unless form is open) ── */}
              {editingIndex === null && (
                <>
                  <Text style={s.sectionLabel}>ADD PAYMENT METHOD</Text>
                  <View style={s.typeGrid}>
                    {RECEIVE_PAYMENT.map((pt) => (
                      <TouchableOpacity
                        key={pt.lable}
                        style={[s.typeBtn, { borderColor: pt.color + '40', backgroundColor: pt.bg }]}
                        onPress={() => openAdd(pt)}
                        activeOpacity={0.75}
                      >
                        <Icon name={pt.icon} size={22} color={pt.color} />
                        <Text style={[s.typeBtnLabel, { color: pt.color }]}>{pt.lable}</Text>
                        {/* Add dot */}
                        <View style={[s.addDot, { backgroundColor: pt.color }]}>
                          <Icon name="add" size={10} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* ── Existing entries list (shown when NOT in add/edit mode) ── */}
              {editingIndex === null && payments.length > 0 && (
                <View style={s.entriesSection}>
                  <Text style={s.sectionLabel}>ADDED PAYMENTS</Text>
                  <View style={s.chipsList}>
                    {payments.map((entry, index) => (
                      <PaymentChip
                        key={index}
                        entry={entry}
                        onEdit={() => openEdit(index)}
                        onRemove={() => handleRemove(index)}
                      />
                    ))}
                  </View>

                  {/* Balance summary */}
                  {(() => {
                    // Derive the net total from payload to stay consistent with checkout logic
                    const subtotal = payload?.summary?.total ?? 0;
                    const discount = payload?.discount ?? 0;
                    const returnsTotal = Array.isArray(payload?.mixed_cart)
                      ? payload.mixed_cart.reduce(
                          (s: number, r: any) =>
                            s + parseFloat(String(r.price || 0)) * parseFloat(String(r.quantity || 1)),
                          0
                        )
                      : 0;
                    const shippingAmt = parseFloat(String(payload?.shipping?.shipping_amount || 0));
                    const netTotal = Math.max(0, subtotal - discount - returnsTotal + shippingAmt);
                    const remaining = netTotal - totalPaid;
                    const changeDue = totalPaid - netTotal;
                    const fullyPaid = totalPaid > 0 && totalPaid >= netTotal;

                    return (
                      <View style={[
                        s.balanceRow,
                        fullyPaid && changeDue > 0 && s.balanceRowOver,
                        fullyPaid && changeDue === 0 && s.balanceRowExact,
                      ]}>
                        <View>
                          <Text style={s.balanceLabel}>
                            {fullyPaid
                              ? changeDue > 0 ? 'Change Due' : '✓ Fully Paid'
                              : 'Remaining'}
                          </Text>
                          <Text style={s.balanceSub}>
                            Paid ${totalPaid.toFixed(2)} of ${netTotal.toFixed(2)}
                          </Text>
                        </View>
                        <Text style={s.balanceAmount}>
                          ${(fullyPaid ? changeDue : remaining).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* ── Add / Edit form (replaces list when a type is chosen) ── */}
              {draft !== null && editingIndex !== null && (
                <EntryForm
                  draft={draft}
                  onChange={(fields) => setDraft((prev) => prev ? { ...prev, ...fields } : prev)}
                  onSave={handleSave}
                  onCancel={closeForm}
                  isEdit={editingIndex >= 0}
                />
              )}

            </ScrollView>

            {/* ── Footer: Done button (only in list view) ── */}
            {editingIndex === null && (
              <View style={s.footer}>
                <TouchableOpacity style={s.doneBtn} onPress={onDismiss} activeOpacity={0.88}>
                  <Text style={s.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default PaymentModal;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // ── Sheet ──
  overlay: {
    flex: 1,
    backgroundColor: colors.backgroundOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTitle: {
    fontSize: 18,
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

  // ── Body ──
  body: {
    padding: 20,
    gap: 16,
    paddingBottom: 8,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.gray400,
    textTransform: 'uppercase',
    marginBottom: -4,
  },

  // ── Type grid (add buttons) ──
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 5,
    position: 'relative',
  },
  typeBtnLabel: {
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

  // ── Existing entries section ──
  entriesSection: {
    gap: 10,
  },
  chipsList: {
    gap: 8,
  },

  // ── Payment chip (existing entry row) ──
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  chipAmount: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '800',
    color: colors.gray800,
  },
  chipEditHint: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveBtn: {
    padding: 4,
  },

  // ── Type badge (shared between chip and form header) ──
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Entry form card ──
  formCard: {
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 14,
    backgroundColor: colors.white,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    paddingLeft: 10,
    borderRadius: 4,
  },

  // ── Save button ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Balance row ──
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

  // ── Footer ──
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});