import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Inventory, Payment, Account, Bank, PaymentMethod } from '../../types/Inventory';
import { RECEIVE_PAYMENT } from '../../constants/paymentTypes';
import { colors } from '../../theme';
import InputField from '../../components/ui/InputField';
import AsyncDropdown from '../../components/AsyncDropdown';
import DatePickerField from '../../components/DatePickerField';
import useCurrency from '../../utils/currency';
import { Currency } from '../../types/Currency';
import ModalHeader from '../../components/ModalHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentModalProps {
  visible: boolean;
  payload: Inventory;
  setPayload: React.Dispatch<React.SetStateAction<Inventory | null>>;
  onDismiss: () => void;
  totalDue: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const blankDraft = (type: typeof RECEIVE_PAYMENT[0], currency: Currency | null): Payment => ({
  ...type,
  type: type.type as PaymentMethod,
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

interface EntryFormProps {
  draft: Payment;
  onChange: (fields: Partial<Payment>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

const EntryForm: React.FC<EntryFormProps> = ({ draft, onChange, onSave, onCancel, isEdit }) => (
  <View style={s.formCard}>
    <View style={[s.formHeader, { borderLeftColor: draft.color }]}>
      <View style={[s.typeBadge, { backgroundColor: draft.bg }]}>
        <Icon name={draft.icon} size={14} color={draft.color} />
        <Text style={[s.typeBadgeText, { color: draft.color }]}>{draft.lable}</Text>
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close" size={18} color={colors.gray400} />
      </TouchableOpacity>
    </View>

    <InputField
      bg="gray" textAlign="left" label="Amount" type="decimal"
      value={String(draft.amount || '')}
      onChangeText={(v) => onChange({ amount: parseFloat(v) || 0 })}
      placeholder="0.00" icon="attach-money"
    />

    {draft.lable === 'Online' && (
      <>
        <AsyncDropdown
          url="/accounts" searchParam="q" minSearchLength={3}
          creatable={false} label="Bank Account"
          leadingIconName="account-balance" inputBg={colors.white}
          onSelect={(v) => onChange({ account: v as unknown as Account })}
          value={draft.account ?? null}
        />
        <InputField
          bg="gray" textAlign="left" label="Transaction ID" type="text"
          value={draft.slip_number ?? ''}
          onChangeText={(v) => onChange({ slip_number: v })}
          placeholder="Enter reference #" icon="tag"
        />
      </>
    )}

    {draft.lable === 'Cheque' && (
      <>
        <InputField
          bg="gray" textAlign="left" label="Cheque Number" type="text"
          value={draft.cheque_number ?? ''}
          onChangeText={(v) => onChange({ cheque_number: v })}
          placeholder="e.g. 0012345" icon="description"
        />
        <View style={s.bankDropdownWrapper}>
          <AsyncDropdown
            url="/banks" searchParam="q" leadingIconName="account-balance"
            minSearchLength={4} creatable={false} inputBg={colors.white}
            label="Issuing Bank"
            onSelect={(v) => onChange({ bank: v as unknown as Bank })}
            value={draft.bank as any}
          />
        </View>
        <DatePickerField
          label="Clearing Date" value={draft.cheque_date}
          onChange={(date) => onChange({ cheque_date: date })}
          placeholder="Select date" inputBg={colors.white}
        />
      </>
    )}

    <InputField
      bg="gray" textAlign="left" label="Remarks" type="text"
      value={draft.remarks ?? ''}
      onChangeText={(v) => onChange({ remarks: v })}
      placeholder="Remarks" icon="description" multiline numberOfLines={3}
    />

    <TouchableOpacity
      style={[
        s.saveBtn,
        { backgroundColor: draft.color },
        (!draft.amount || draft.amount <= 0) && s.saveBtnDisabled,
      ]}
      onPress={onSave}
      activeOpacity={0.85}
      disabled={!draft.amount || draft.amount <= 0}
    >
      <Icon name="check" size={16} color="#fff" />
      <Text style={s.saveBtnText}>{isEdit ? 'Update Payment' : 'Add Payment'}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Payment Chip ─────────────────────────────────────────────────────────────

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
    <View style={[s.typeBadge, { backgroundColor: entry.bg }]}>
      <Icon name={entry.icon} size={13} color={entry.color} />
      <Text style={[s.typeBadgeText, { color: entry.color }]}>{entry.lable}</Text>
    </View>
    <Text style={s.chipAmount}>${parseFloat(String(entry.amount || 0)).toFixed(2)}</Text>
    <View style={s.chipEditHint}>
      <Icon name="edit" size={13} color={colors.gray400} />
    </View>
    <TouchableOpacity
      onPress={onRemove}
      style={s.chipRemoveBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="close" size={15} color={colors.gray400} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible, payload, setPayload, onDismiss, totalDue,
}) => {
  const currency = useCurrency();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft]               = useState<Payment | null>(null);

  useEffect(() => {
    if (!visible) { setEditingIndex(null); setDraft(null); }
  }, [visible]);

  const payments: Payment[] = Array.isArray(payload?.payments) ? payload.payments : [];
  const totalPaid = payments.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0);
  const due = Number(totalDue);

  const openAdd   = (type: typeof RECEIVE_PAYMENT[0]) => { setDraft(blankDraft(type, currency)); setEditingIndex(-1); };
  const openEdit  = (index: number) => { setDraft({ ...payments[index] }); setEditingIndex(index); };
  const closeForm = () => { setDraft(null); setEditingIndex(null); };

  const handleSave = () => {
    if (!draft) return;
    setPayload((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.payments) ? prev.payments : [];
      const updated = editingIndex === -1
        ? [...current, { ...draft, currency }]
        : current.map((e, i) => (i === editingIndex ? { ...draft, currency } : e));
      return { ...prev, payments: updated } as Inventory;
    });
    closeForm();
  };

  const handleRemove = (index: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: (Array.isArray(prev.payments) ? prev.payments : []).filter((_, i) => i !== index),
      } as Inventory;
    });
    if (editingIndex === index) closeForm();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      {/*
       * How height works — same pattern as CheckoutReturnModal:
       *
       * overlay    → flex:1  +  justifyContent:'flex-end'
       *                fills the screen, pushes sheet to the bottom
       *
       * sheet      → height:'92%'   ← change this ONE value to resize
       *                fixed height, NOT flex so it never fills the screen
       *
       * sheetInner → flex:1
       *                fills the sheet so KAV + ScrollView + footer layout correctly
       *
       * Tapping the dark area above the sheet closes the modal + dismisses keyboard.
       * Tapping inside the sheet (sheetInner Pressable) only dismisses the keyboard.
       */}
      <Pressable
        style={s.overlay}
        onPress={() => { Keyboard.dismiss(); onDismiss(); }}
      >
        <View style={s.sheet}>
          <Pressable style={s.sheetInner} onPress={Keyboard.dismiss}>

            <ModalHeader title="Payments" onClose={onDismiss} />

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.body}
                onScrollBeginDrag={Keyboard.dismiss}
              >
                {/* Payment type buttons */}
                {editingIndex === null && (
                  <>
                    <Text style={s.sectionLabel}>ADD PAYMENT</Text>
                    <View style={s.typeGrid}>
                      {RECEIVE_PAYMENT.map((pt) => (
                        <TouchableOpacity
                          key={pt.lable}
                          style={s.typeBtn}
                          onPress={() => openAdd(pt)}
                          activeOpacity={0.75}
                        >
                          <Icon name={pt.icon} size={24} color={colors.textPlaceholder} />
                          <Text style={s.typeBtnLabel}>{pt.lable}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Existing chips + balance */}
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

                    {(() => {
                      const remaining = due - totalPaid;
                      const changeDue = totalPaid - due;
                      const fullyPaid = totalPaid > 0 && totalPaid >= due;
                      return (
                        <View style={[
                          s.balanceRow,
                          fullyPaid && changeDue > 0 && s.balanceRowOver,
                          fullyPaid && changeDue === 0 && s.balanceRowExact,
                        ]}>
                          <View>
                            <Text style={s.balanceLabel}>
                              {fullyPaid ? (changeDue > 0 ? 'Change Due' : '✓ Fully Paid') : 'Remaining'}
                            </Text>
                            <Text style={s.balanceSub}>
                              Paid ${totalPaid.toFixed(2)} of ${due.toFixed(2)}
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

                {/* Add / Edit form */}
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

              {/* Done button — list view only */}
              {editingIndex === null && (
                <View style={s.footer}>
                  <TouchableOpacity style={s.doneBtn} onPress={onDismiss} activeOpacity={0.88}>
                    <Text style={s.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>

          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default PaymentModal;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // ── Layout ──
  overlay: {
    flex: 1,
    backgroundColor: colors.backgroundOverlay,
    justifyContent: 'flex-end',   // anchors sheet to the bottom
  },
  sheet: {
    height: '94%',                // ← change this ONE value to resize the sheet
  },
  sheetInner: {
    flex: 1,                      // fills sheet so children layout correctly
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
    color: colors.textPlaceholder,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Type grid ──
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.gray300,
    gap: 6,
    minWidth: 72,
  },
  typeBtnLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPlaceholder,
    textAlign: 'center',
  },

  // ── Entries ──
  entriesSection: { gap: 10 },
  chipsList: { gap: 8 },

  // ── Chip ──
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
  chipRemoveBtn: { padding: 4 },

  // ── Type badge ──
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  // ── Form ──
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
  bankDropdownWrapper: { zIndex: 3000 },

  // ── Save button ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

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
  balanceRowOver:  { backgroundColor: colors.errorBg },
  balanceRowExact: { backgroundColor: colors.primaryLight },
  balanceLabel: { fontSize: 13, fontWeight: '700', color: colors.gray700 },
  balanceSub:   { fontSize: 11, color: colors.gray500, marginTop: 2 },
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
  doneBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});