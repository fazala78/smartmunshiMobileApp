// steps/Step3.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SectionLabel, ProcessCard } from './StepShared';
import { LotFormData, Process } from '../../types/assembly';
import { colors, spacing } from '../../theme';
import LocalDropdown from '../LocallDropdown';
import { Contact } from '../../types/contact';
import AsyncStorage from '@react-native-async-storage/async-storage';



interface HandOverStepProp {
    data: LotFormData;
    setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
}

export default function HandOverStep({ data, setFormData }: HandOverStepProp) {

    const [processes, setProcesses] = useState<Process[]>([]);

    useEffect(() => {
        const loadProcesses = async () => {
            try {
                const raw = await AsyncStorage.getItem('processes');
                setProcesses(raw ? JSON.parse(raw) : []);
            } catch {
                setProcesses([]);
            }
        };
        loadProcesses();
    }, []);



    const toggleProcess = (process: Process) => {
        const selectedProcess = processes.find((p) => p.id === process.id);

        if (!selectedProcess) return; // safety check

        setFormData((prev: any) => ({
            ...prev,
            process: selectedProcess,
        }));
    };



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
                <View style={styles.processGrid}>
                    {processes.map((item) => (
                        <ProcessCard
                            key={item.id}
                            item={item}
                            selected={data.process?.id === item.id}
                            onPress={() => toggleProcess(item)}
                        />
                    ))}
                </View>
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
    processGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});