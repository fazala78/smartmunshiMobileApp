// steps/ProductionBillingStep.tsx
import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { LotFormData } from '../../types/assembly';
import Shopping from '../Shopping';
import { getStep } from '../../services/assemblyService';

interface Step2Props {
    data: LotFormData;
    step: number;
    setFormData: React.Dispatch<React.SetStateAction<LotFormData>>;
}

export default function ProductionBillingStep({ data, step, setFormData }: Step2Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Fetch step data and seed fields into formData ─────────────────────────
    useEffect(() => {
        if (!step) {
            setIsLoading(false);
            return;
        }

        let cancelled = false; // prevent state update if component unmounts mid-fetch

        const fetchStep = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                const result = await getStep(step);
                

                if (cancelled) return;

                if (result) {
                    setFormData((prev) => ({
                        ...prev,
                        // Seed all fields the Shopping component and downstream steps need
                        consum_products: result.consum_products,
                        lot_number: result.lot_number,
                        contact: result.contact,
                        lot_id: result.lot_id,
                        step_id: result.step_id,
                        parent_step_id: result.parent_step_id,
                    }));
                }
            } catch (error: any) {
                if (!cancelled) {
                    setFetchError(error?.message ?? 'Failed to load step data.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchStep();

        return () => { cancelled = true; }; // cleanup on unmount / step change
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Loading state — Shopping must NOT mount before data is ready ──────────
    // If Shopping mounts with empty consum_products it initialises its own
    // internal state from those empty values and ignores later prop changes.
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading step data…</Text>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{fetchError}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={{ gap: 14, padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.stepTitle}>Production Bill</Text>

            {/*
        Pass `data` AFTER the fetch has completed and setFormData has been
        called — at this point data.consum_products, data.contact, etc. are
        all populated, so Shopping receives the correct initial values.
      */}
            <Shopping
                attribute="cart"
                creatable={true}
                payload={data}
                searchingType="live"
                setPayload={setFormData}
                listingTitle="MANUFACTURED ITEMS"
            />
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    stepContent: { padding: spacing.lg, paddingBottom: 40 },
    stepTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        lineHeight: 38,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
        color: colors.danger,
        textAlign: 'center',
        lineHeight: 22,
    },
});