// steps/Step3.tsx
import React from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';
import { LotFormData } from '../../types/assembly';
import { colors, spacing } from '../../theme';
import DatePickerField from '../DatePickerField';
import InputField from '../ui/InputField';
import LocalDropdown from '../LocallDropdown';
import { Contact } from '../../types/contact';

interface Step3Props {
  data: LotFormData;
  setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
}

export default function PurchaseDetailStep({ data, setFormData }: Step3Props) {
  return (
    <ScrollView
      contentContainerStyle={{ gap: 14, padding: 20 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Date & Shipping{'\n'} Detail</Text>
      <Text style={styles.stepSubtitle}>
        Select a date and the required invoice number.
      </Text>

      <View style={styles.row}>
        <View style={styles.flexOne}>
          <DatePickerField
            label="Date"
            value={data?.date as Date}
            onChange={(date) =>
              setFormData((prev) => {
                if (!prev) return prev;
                return { ...prev, date } as LotFormData;
              })
            }
            placeholder="Select date"
            inputBg={colors.backgroundLight}
          />
        </View>
        <View style={styles.flexOne}>
          <InputField
            bg="white"
            textAlign="left"
            label="GP / Invoice Number"
            type="text"
            value={String(data?.invoice_number || '')}
            onChangeText={(value) =>
              setFormData((prev) => {
                if (!prev) return prev;
                return { ...prev, invoice_number: value || '' } as LotFormData;
              })
            }
            placeholder="e.g. PU-01"
            icon="receipt"
          />
        </View>
      </View>

      {data?.source != 'stock' && (
        <InputField
          bg="white"
          textAlign="left"
          label="Deduction"
          type="decimal"
          value={String(data?.discount || '')}
          onChangeText={(value) =>
            setFormData((prev) => {
              if (!prev) return prev;
              return { ...prev, discount: parseFloat(value) || 0 } as LotFormData;
            })
          }
          placeholder="e.g. 10.00"
          icon="discount"
        />
      )}
       <LocalDropdown<Contact>
                  label="Shipper"
                  inputBg={colors.backgroundLight}
                  value={data.shipping.shipper}      // ← shows chip if set
                  creatable
                  createLabel="Create Shipper"
                  onSelect={(customer) =>
                    setFormData((prev: LotFormData) =>
                      prev
                        ? { ...prev, shipping: { ...prev.shipping, shipper: customer } } as LotFormData
                        : prev
                    )
                  }
                  labelResolver={(c) => c.name}
                  subLabelResolver={(c) => c.phone}
                />

      <View style={styles.row}>
        <View style={styles.flexOne}>
          <InputField
            bg="white"
            label="Shipping Cost"
            type="decimal"
            value={String(data?.shipping?.shipping_amount ?? '')}
            onChangeText={(v) =>
              setFormData((prev: LotFormData) =>
                prev
                  ? ({
                      ...prev,
                      shipping: { ...prev.shipping, shipping_amount: parseFloat(v) },
                    } as LotFormData)
                  : prev
              )
            }
            placeholder="Enter Amount"
            icon="attach-money"
          />
        </View>
        <View style={styles.flexOne}>
          <InputField
            bg="white"
            label="Tracking Number"
            type="text"
            value={data?.shipping?.shipping_ticket ?? ''}
            onChangeText={(v) =>
              setFormData((prev: LotFormData) =>
                prev
                  ? ({
                      ...prev,
                      shipping: { ...prev.shipping, shipping_ticket: v },
                    } as LotFormData)
                  : prev
              )
            }
            placeholder="Enter tracking #"
            icon="qr-code-scanner"
            autoCapitalize="characters"
          />
        </View>
      </View>

      <InputField
        bg="white"
        textAlign="left"
        label="Remarks"
        type="text"
        value={data?.remarks}
        onChangeText={(v) =>
          setFormData((prev) => {
            if (!prev) return prev;
            return { ...prev, remarks: v || '' } as LotFormData;
          })
        }
        placeholder="Remarks"
        icon="description"
        multiline
        numberOfLines={3}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  flexOne: { flex: 1 },
  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 38,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
});