// LotDefinitionStep.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import InputField from '../ui/InputField';
import { SectionLabel, SourceOption } from './StepShared';
import { colors, spacing } from '../../theme';
import { FormKey,LotFormData } from '../../types/assembly';

interface Step1Props {
  data: LotFormData;
  onChange: <K extends FormKey>(key: K, value: LotFormData[K]) => void;
  generateAutoLotNumber: () => string;
}

export default function LotDefinitionStep({ data, onChange, generateAutoLotNumber }: Step1Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepEyebrow}>Initiation Phase</Text>
      <Text style={styles.stepTitle}>Material Allocation</Text>
      <Text style={styles.stepSubtitle}>
        Assign a unique lot identifier and define the source of raw materials.
      </Text>

      <View style={styles.card}>
        <SectionLabel text="Lot Number Assignment" />
        <View style={styles.inputRow}>
          <InputField
            bg="gray"
            type="text"
            value={data.lot_number}
            onChangeText={(v: string) => onChange('lot_number', v)}
            placeholder="Enter Lot number"
            icon="badge"
          />
          <TouchableOpacity
            style={styles.autofillBadge}
            onPress={() => onChange('lot_number', generateAutoLotNumber())}
            activeOpacity={0.7}
          >
            <Text style={styles.autofillText}>✓ Auto</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.inputHint}>Sequential ID based on current facility calendar.</Text>
      </View>

      <View style={styles.sectionBlock}>
        <SectionLabel text="Source of Materials" />
        <SourceOption
          icon="inventory"
          title="From Stock"
          description="Allocate existing inventory from central warehouse."
          selected={data.source === 'stock'}
          onPress={() => onChange('source', 'stock')}
        />
        <SourceOption
          icon="shopping-cart"
          title="New Purchase"
          description="Initiate a procurement request for new materials."
          selected={data.source === 'purchase'}
          onPress={() => onChange('source', 'purchase')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { padding: spacing.lg, paddingBottom: 40 },
  stepEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
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
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: colors.dark,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionBlock: { marginBottom: spacing.lg },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autofillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  autofillText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  inputHint: { marginTop: spacing.sm, fontSize: 11, color: colors.textMuted },
});