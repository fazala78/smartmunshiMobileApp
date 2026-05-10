// steps/ClaimStep.tsx
import React, { useEffect, useState } from 'react';
import {
    Text, ScrollView, StyleSheet, View,
    ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing } from '../../theme';
import { FormData } from '../../types/assembly';
import { getStep } from '../../services/assemblyService';

interface Step2Props {
    data: FormData;
    step: number;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsumProduct {
    id: number;
    name: string;
    supplied_qty: number;
    quantity: number | null;
    cost: number;
    price: number;
    unit: string;
    used_qty: number;
    issue_id: number;
}

// ─── Single row component ─────────────────────────────────────────────────────

interface ConsumRowProps {
    item: ConsumProduct;
    onUpdate: (id: number, field: 'quantity' | 'cost', value: number | null) => void;
}

const ConsumRow: React.FC<ConsumRowProps> = ({ item, onUpdate }) => {
    const [qtyInput, setQtyInput]   = useState(item.quantity != null ? String(item.quantity) : '');
    const [costInput, setCostInput] = useState(item.cost != null ? String(item.cost) : '');

    // balance = supplied - used - quantity (floor at 0 for display colouring)
    const qty      = parseFloat(qtyInput)  || 0;
    const balance  = item.supplied_qty - item.used_qty - qty;
    const isOver   = balance < 0;

    const handleQtyChange = (raw: string) => {
        setQtyInput(raw);
        if (raw === '' || raw === null) {
            onUpdate(item.id, 'quantity', null);
            return;
        }
        const parsed = parseFloat(raw);
        onUpdate(item.id, 'quantity', isNaN(parsed) ? null : parsed);
    };

    const handleCostChange = (raw: string) => {
        setCostInput(raw);
        const parsed = parseFloat(raw);
        onUpdate(item.id, 'cost', isNaN(parsed) ? null : parsed);
    };

    return (
        <View style={rowStyles.card}>
            {/* ── Header: name + unit badge ── */}
            <View style={rowStyles.headerRow}>
                <View style={rowStyles.nameWrap}>
                    <View style={rowStyles.iconWrap}>
                        <Icon name="texture" size={14} color="#B45309" />
                    </View>
                    <Text style={rowStyles.name} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={rowStyles.unitBadge}>
                    <Text style={rowStyles.unitText}>{item.unit}</Text>
                </View>
            </View>

            {/* ── Supplied / Used / Balance stat strip ── */}
            <View style={rowStyles.statsRow}>
                {/* Supplied */}
                <View style={rowStyles.statCell}>
                    <Text style={rowStyles.statLabel}>Supplied</Text>
                    <Text style={rowStyles.statValue}>{item.supplied_qty}</Text>
                </View>

                <View style={rowStyles.statSep} />

                {/* Used */}
                <View style={rowStyles.statCell}>
                    <Text style={rowStyles.statLabel}>Used</Text>
                    <Text style={[rowStyles.statValue, item.used_qty > 0 && rowStyles.statUsed]}>
                        {item.used_qty}
                    </Text>
                </View>

                <View style={rowStyles.statSep} />

                {/* Live balance */}
                <View style={rowStyles.statCell}>
                    <Text style={rowStyles.statLabel}>Balance</Text>
                    <Text style={[rowStyles.statValue, isOver ? rowStyles.statOver : rowStyles.statOk]}>
                        {balance}
                    </Text>
                </View>
            </View>

            {/* ── Progress bar: used / supplied ── */}
            {item.supplied_qty > 0 && (
                <View style={rowStyles.trackWrap}>
                    <View style={rowStyles.track}>
                        <View
                            style={[
                                rowStyles.trackFill,
                                {
                                    width: `${Math.min(
                                        ((item.used_qty + qty) / item.supplied_qty) * 100,
                                        100,
                                    )}%` as any,
                                    backgroundColor: isOver ? '#EF4444' : '#F59E0B',
                                },
                            ]}
                        />
                    </View>
                    <Text style={rowStyles.trackPct}>
                        {Math.round(
                            Math.min(((item.used_qty + qty) / item.supplied_qty) * 100, 100),
                        )}%
                    </Text>
                </View>
            )}

            {/* ── Editable fields: Quantity + Cost ── */}
            <View style={rowStyles.fieldsRow}>
                {/* Quantity */}
                <View style={rowStyles.fieldWrap}>
                    <Text style={rowStyles.fieldLabel}>Quantity</Text>
                    <View style={[rowStyles.inputBox, isOver && rowStyles.inputBoxError]}>
                        <TextInput
                            style={rowStyles.input}
                            value={qtyInput}
                            onChangeText={handleQtyChange}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#D97706"
                        />
                        <Text style={rowStyles.inputSuffix}>{item.unit}</Text>
                    </View>
                    {isOver && (
                        <View style={rowStyles.errorRow}>
                            <Icon name="error-outline" size={11} color="#EF4444" />
                            <Text style={rowStyles.errorText}>
                                Exceeds available by {Math.abs(balance)} {item.unit}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Cost */}
                <View style={rowStyles.fieldWrap}>
                    <Text style={rowStyles.fieldLabel}>Cost / unit</Text>
                    <View style={rowStyles.inputBox}>
                        <Text style={rowStyles.inputPrefix}>$</Text>
                        <TextInput
                            style={rowStyles.input}
                            value={costInput}
                            onChangeText={handleCostChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#D97706"
                        />
                    </View>
                </View>
            </View>

            {/* ── Line total ── */}
            {qty > 0 && !isOver && (
                <View style={rowStyles.totalRow}>
                    <Icon name="receipt-long" size={13} color="#065F46" />
                    <Text style={rowStyles.totalText}>
                        Line total:{' '}
                        <Text style={rowStyles.totalValue}>
                            ${(qty * (parseFloat(costInput) || 0)).toFixed(2)}
                        </Text>
                    </Text>
                </View>
            )}
        </View>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClaimStep({ data, step, setFormData }: Step2Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Fetch step data ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!step) { setIsLoading(false); return; }

        let cancelled = false;

        const fetchStep = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                const result = await getStep(step.id);
                if (cancelled) return;
                if (result) {
                    setFormData((prev) => ({
                        ...prev,
                        consum_products: result.consum_products, 
                        lot_number:      result.lot_number,      
                        contact:         result.contact,         
                        lot_id:          result.lot_id,         
                        step_id:         result.step_id,        
                        parent_step_id:  result.parent_step_id,  
                    }));
                }
            } catch (error: any) {
                if (!cancelled) setFetchError(error?.message ?? 'Failed to load step data.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchStep();
        return () => { cancelled = true; };
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Update a single consum_product field ──────────────────────────────────
    const handleUpdate = (id: number, field: 'quantity' | 'cost', value: number | null) => {
        setFormData((prev) => ({
            ...prev,
            consum_products: (prev.consum_products as ConsumProduct[]).map((cp) =>
                cp.id === id ? { ...cp, [field]: value } : cp,
            ),
        }));
    };

    // ── Grand total across all rows ───────────────────────────────────────────
    const consumProducts = (data.consum_products ?? []) as ConsumProduct[];
    const grandTotal = consumProducts.reduce((sum, cp) => {
        const qty = cp.quantity ?? 0;
        return sum + qty * (cp.cost ?? 0);
    }, 0);

    const hasOverage = consumProducts.some((cp) => {
        const qty = cp.quantity ?? 0;
        return qty > cp.supplied_qty - cp.used_qty;
    });

    // ── Guards ────────────────────────────────────────────────────────────────
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
                <Icon name="error-outline" size={32} color="#EF4444" />
                <Text style={styles.errorText}>{fetchError}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* ── Page header ── */}
            <Text style={styles.stepTitle}>Add Claim</Text>
            <Text style={styles.stepSubtitle}>
                Enter the quantity and cost for each raw material used in this claim.
            </Text>

            {/* ── Consum products list ── */}
            {consumProducts.length > 0 ? (
                <>
                    {/* Section header */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Icon name="precision-manufacturing" size={15} color="#B45309" />
                        </View>
                        <Text style={styles.sectionTitle}>RAW MATERIALS</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{consumProducts.length}</Text>
                        </View>
                    </View>

                    {consumProducts.map((cp) => (
                        <ConsumRow
                            key={cp.id}
                            item={cp}
                            onUpdate={handleUpdate}
                        />
                    ))}
                    

                    {/* ── Overage warning ── */}
                    {hasOverage && (
                        <View style={styles.warningBanner}>
                            <Icon name="warning" size={16} color="#B45309" />
                            <Text style={styles.warningText}>
                                One or more quantities exceed what is available.
                                Please correct before submitting.
                            </Text>
                        </View>
                    )}

                    {/* ── Grand total ── */}
                    {grandTotal > 0 && !hasOverage && (
                        <View style={styles.grandTotal}>
                            <Text style={styles.grandTotalLabel}>CLAIM TOTAL</Text>
                            <Text style={styles.grandTotalValue}>
                                ${grandTotal.toFixed(2)}
                            </Text>
                        </View>
                    )}
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Icon name="inventory-2" size={36} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No raw materials found for this step.</Text>
                </View>
            )}
        </ScrollView>
    );
}

// ─── Row styles ───────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        padding: 14,
        gap: 10,
        marginBottom: 2, // gap handled by parent
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    nameWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    iconWrap: {
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: '#92400E',
        flex: 1,
    },
    unitBadge: {
        backgroundColor: '#FEF3C7',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    unitText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D97706',
    },

    // Stats strip
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#FEF9EE',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FDE68A',
        overflow: 'hidden',
    },
    statCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    statSep: { width: 1, backgroundColor: '#FDE68A' },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#78350F',
    },
    statUsed: { color: '#DC2626' },
    statOk:   { color: '#16A34A' },
    statOver: { color: '#EF4444' },

    // Progress
    trackWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    track: {
        flex: 1,
        height: 5,
        backgroundColor: '#FDE68A',
        borderRadius: 3,
        overflow: 'hidden',
    },
    trackFill: {
        height: 5,
        borderRadius: 3,
    },
    trackPct: {
        fontSize: 10,
        fontWeight: '700',
        color: '#D97706',
        minWidth: 32,
        textAlign: 'right',
    },

    // Editable fields
    fieldsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    fieldWrap: {
        flex: 1,
        gap: 5,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        borderRadius: 9,
        paddingHorizontal: 10,
        height: 44,
    },
    inputBoxError: {
        borderColor: '#EF4444',
        backgroundColor: '#FFF5F5',
    },
    inputPrefix: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706',
        marginRight: 2,
    },
    inputSuffix: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
        marginLeft: 4,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#78350F',
        paddingVertical: 0,
        textAlign: 'left',
    },

    // Error
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    errorText: {
        fontSize: 10,
        color: '#EF4444',
        fontWeight: '500',
        flex: 1,
    },

    // Line total
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    totalText: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '500',
    },
    totalValue: {
        fontWeight: '800',
        fontSize: 13,
        color: '#065F46',
    },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: {
        padding: spacing.lg,
        paddingBottom: 40,
        gap: 12,
    },

    stepTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        lineHeight: 38,
    },
    stepSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 21,
        marginTop: 4,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 4,
    },
    sectionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B45309',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        flex: 1,
    },
    countBadge: {
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    countText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B45309',
    },

    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 10,
        padding: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#92400E',
        lineHeight: 18,
    },

    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    grandTotalLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#065F46',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    grandTotalValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#047857',
    },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
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
        color: '#EF4444',
        textAlign: 'center',
        lineHeight: 22,
    },
});