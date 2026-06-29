// steps/Step2.tsx
import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { Contact } from '../../types/contact';
import LocalDropdown from '../LocallDropdown';
import { colors, spacing } from '../../theme';
import { LotFormData } from '../../types/assembly';
import Shopping from '../Shopping';

interface Step2Props {
  data: LotFormData;
  setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
}
export default function PurchaseStep({ data, setFormData }: Step2Props) {

  return (
    <ScrollView
      contentContainerStyle={{ gap: 14, padding: 20 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Purchase Product</Text>

      <LocalDropdown<Contact>
        label="Contact"
        inputBg={colors.backgroundLight}
        value={data.contact}
        creatable
        createLabel="Create contact"
        onSelect={(customer) => {
          setFormData((prev) => {
            if (!prev) return prev;
            return { ...prev, contact: customer } as any;
          });
        }}
        labelResolver={(c) => c.name}
        subLabelResolver={(c) => c.phone}
      />

      <Shopping<LotFormData>
        attribute="cart"
        creatable={true}
        payload={data}
        searchingType="none"
        setPayload={setFormData}
        listingTitle="CURRENT ORDER"
      />



    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { padding: spacing.lg, paddingBottom: 40 },

  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 38,
  },
});