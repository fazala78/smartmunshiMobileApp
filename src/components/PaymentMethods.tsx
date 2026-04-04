import React, { useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';
import { PaymentPayload, Account, Cheque } from '../types/payments';
import { Bank } from '../types/contact';
import AsyncDropdown from './AsyncDropdown';
import SelectionButton from './ui/SelectionButton';
import InputField from './ui/InputField';
import DatePickerField from './DatePickerField';
import useCurrency from '../utils/currency';
import { Contact } from '../types/contact';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethodsProps {
  payload: PaymentPayload;
  update: (fields: Partial<PaymentPayload>) => void;
  methods: { key: string; label: string; icon: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────

const PaymentMethods: React.FC<PaymentMethodsProps> = ({ payload, update, methods }) => {

  const currency = useCurrency();
  const amountInputRef = useRef<TextInput>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isAmountLocked = payload.type === 'received_cheques' && payload.cheque != null;
  const displayAmount = isAmountLocked
    ? String(payload.cheque?.amount ?? '')
    : String(payload.amount ?? '');

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChequeSelect = (v: Cheque | null) => {
    update({
      cheque: v ?? undefined,
      amount: v?.amount != null ? Number(v.amount) : payload.amount,
    });
  };

  const handleMethodChange = (key: string) => {
    update({
      type: key,
      ...(key !== 'received_cheques' && { cheque: undefined }),
    });
  };

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isBankMethod = payload.type === 'online' || payload.type === 'account_cheque';
  const isChequeMethod = payload.type === 'cheque' || payload.type === 'account_cheque';
  const isForwardCheque = payload.type === 'received_cheques' || payload.type === 'client_received_cheques';
  const isShowSlip = payload.type === 'online' || payload.type === 'bank_deposit' || payload.type === 'bank_withdraw' || payload.type === 'client_received_cheques';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Amount */}
      <TouchableWithoutFeedback
        onPress={() => !isAmountLocked && amountInputRef.current?.focus()}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={[styles.amountInputWrap, isAmountLocked && styles.amountInputLocked]}>
            <Text style={styles.amountPrefix}>{currency?.symbol}</Text>
            <TextInput
              ref={amountInputRef}
              style={[styles.amountInput, isAmountLocked && styles.amountInputTextLocked]}
              value={displayAmount}
              onChangeText={(v) => update({ amount: parseFloat(v) || 0 })}
              placeholder="0.00"
              placeholderTextColor={colors.textPlaceholder + '66'}
              keyboardType="decimal-pad"
              editable={!isAmountLocked}
            />
            {isAmountLocked && (
              <Icon name="lock" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
            )}
          </View>
          {isAmountLocked && (
            <Text style={styles.amountLockedHint}>Amount is set from the selected cheque</Text>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Payment method */}
      <SelectionButton
        label="Payment Method"
        options={methods}
        value={payload.type}
        onSelect={handleMethodChange}
      />

      {/* Bank / Online fields */}
      <View style={styles.conditionalFields}>
        {isBankMethod && (
          <AsyncDropdown
            url="/accounts"
            searchParam="q"
            minSearchLength={3}
            creatable={false}
            label="Select Bank Account"
            leadingIconName="account-balance-wallet"
            inputBg={colors.backgroundLight}
            onSelect={(v) => update({ account: v as unknown as Account })} 
            value={payload?.account as Account}          />
        )}
        {isShowSlip && (
          <InputField
            bg="white"
            label="Transaction #"
            type="text"
            value={payload.slip_number ?? ''}
            onChangeText={(v) => update({ slip_number: v })}
            placeholder="TXN-9988-221"
            icon="tag"
          />
        )}
      </View>

      {/* Credit fields */}
      {payload.type === 'credit' && (
        <View style={styles.conditionalFields}>
          <AsyncDropdown
            url="/search-contact"
            searchParam="q"
            minSearchLength={2}
            creatable={false}
            label="Select Customer"
            leadingIconName="person-search"
            inputBg={colors.backgroundLight}
            onSelect={(v) => update({ contact: v as unknown  as Contact })}
            value={payload.contact as Contact}
          />
        </View>
      )}

      {/* Cheque fields */}
      {isChequeMethod && (
        <View style={styles.conditionalFields}>
          <InputField
            bg="white"
            textAlign="left"
            label="Cheque No#"
            type="text"
            value={payload.cheque_number ?? ''}
            onChangeText={(v) => update({ cheque_number: v })}
            placeholder="Cheque Number"
            icon="pin"
          />
          {payload.type === 'cheque' && (
            <AsyncDropdown
              url="/banks"
              searchParam="q"
              minSearchLength={4}
              creatable={false}
              label="Issuing Bank"
              leadingIconName="account-balance"
              inputBg={colors.backgroundLight}
              onSelect={(v) => update({ bank: v as unknown as Bank })}
              value={payload.bank as Account}
            />
          )}
          <DatePickerField
            label="Cheque Date"
            value={payload.cheque_date as Date ?? null}
            onChange={(d) => update({ cheque_date: d ?? undefined })}
            placeholder="Select date"
            inputBg={colors.backgroundLight}
          />
        </View>
      )}

      {/* Forward cheque fields */}
      {isForwardCheque && (
        <View style={styles.conditionalFields}>
          <AsyncDropdown
            url="/cheques"
            searchParam="q"
            minSearchLength={2}
            creatable={false}
            label="Select Cheque"
            leadingIconName="description"
            inputBg={colors.backgroundLight}
            onSelect={(v) => handleChequeSelect(v as unknown as Cheque)}
            value={payload.cheque as Cheque}
          />
          {payload.cheque && (
            <View style={styles.chequeInfoCard}>
              <View style={styles.chequeInfoRow}>
                <Text style={styles.chequeInfoLabel}>Cheque No.</Text>
                <Text style={styles.chequeInfoValue}>{payload.cheque.cheque_number}</Text>
              </View>
              <View style={styles.chequeInfoRow}>
                <Text style={styles.chequeInfoLabel}>Cheque Owner</Text>
                <Text style={styles.chequeInfoValue}>{payload.cheque.source_name}</Text>
              </View>
              <View style={styles.chequeInfoRow}>
                <Text style={styles.chequeInfoLabel}>Bank</Text>
                <Text style={styles.chequeInfoValue}>{payload.cheque.bank}</Text>
              </View>
              <View style={styles.chequeInfoRow}>
                <Text style={styles.chequeInfoLabel}>Amount</Text>
                <Text style={[styles.chequeInfoValue, { color: colors.primary }]}>
                  {currency?.symbol}{Number(payload.cheque.amount).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Transaction date */}
      <DatePickerField
        label="Transaction Date"
        value={payload.date as Date ?? null}
        onChange={(d) => update({ date: d ?? undefined })}
        placeholder="Select date"
        inputBg={colors.backgroundLight}
      />

      {/* Remarks */}
      <InputField
        bg="white"
        textAlign="left"
        label="Remarks"
        type="text"
        value={payload.remarks ?? ''}
        onChangeText={(v) => update({ remarks: v })}
        placeholder="Remarks"
        icon="description"
        multiline
        numberOfLines={3}
      />
    </>
  );
};

export default PaymentMethods;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textPlaceholder, letterSpacing: 1.2, textTransform: 'uppercase' },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: 16, height: 68, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.gray200 },
  amountInputLocked: { backgroundColor: colors.gray100, borderColor: colors.gray300, opacity: 0.75 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.gray900 },
  amountInputTextLocked: { color: colors.textSecondary },
  amountPrefix: { fontSize: 24, fontWeight: '800', color: colors.textPlaceholder, marginRight: 4 },
  amountLockedHint: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  conditionalFields: { gap: 16 },
  chequeInfoCard: { backgroundColor: colors.primaryMuted, borderRadius: 12, padding: 14, gap: 8 },
  chequeInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chequeInfoLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chequeInfoValue: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
});