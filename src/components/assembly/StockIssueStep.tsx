// steps/Step2.tsx
import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { LotFormData } from '../../types/assembly';
import Shopping from '../Shopping';

interface Step2Props {
  data: LotFormData;
  setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
  formDataAttribute:'cart' | 'mixed_cart';
}
export default function StockIssueStep({ data, setFormData,formDataAttribute }: Step2Props) {

  return (
    <ScrollView
      contentContainerStyle={{ gap: 14, padding: 20 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Issue Stock </Text>

      <Shopping
        attribute={formDataAttribute}
        creatable={false}
        payload={data as LotFormData}
        searchingType="live"
        showPrice='no'
        setPayload={setFormData}
        listingTitle="ISSUED STOCK"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 38,
  },
});