// steps/Step3.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SectionLabel, ProcessSelector } from './StepShared';
import { LotFormData } from '../../types/assembly';
import { colors, spacing } from '../../theme';
import LocalDropdown from '../LocallDropdown';
import { Contact } from '../../types/contact';

interface HandOverStepProp {
    data: LotFormData;
    setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
}

export default function HandOverStep({ data, setFormData }: HandOverStepProp) {



    return (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent}>
            <Text style={styles.stepEyebrow}>Hand over Phase</Text>
            <Text style={styles.stepTitle}>Manufacturer{'\n'}& Process</Text>
            <Text style={styles.stepSubtitle}>
                Select a manufacturer and the required production processes.
            </Text>

            <View style={styles.sectionBlock}>
                <LocalDropdown<Contact>
                    label="Contact"
                    inputBg={colors.backgroundLight}
                    value={data.manufacturer}
                    creatable
                    createLabel="Create contact"
                    onSelect={(customer) => {
                        setFormData((prev) => {
                            if (!prev) return prev;
                            return { ...prev, manufacturer: customer } as LotFormData;
                        });
                    }}
                    labelResolver={(c) => c.name}
                    subLabelResolver={(c) => c.phone}
                />

            </View>

            <View style={styles.sectionBlock}>
                <View style={styles.processHeaderRow}>
                    <SectionLabel text="Select Process" />
                </View>
                <ProcessSelector
                    value={data.process}
                    onChange={(process) =>
                        setFormData((prev) => ({ ...prev, process }))
                    }
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
    sectionBlock: { marginBottom: spacing.lg },
    processHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
});