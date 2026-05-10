// BatchCard.tsx – Clean card UI with bottom sheet actions
import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { InventoryItem } from '../../types/assembly';

// ─── Types ────────────────────────────────────────────────────────────────────
type RootStackParamList = {
    nextProcess: { stepId: number };
    stockify: { stepId: number };
    issueStock: { step: InventoryItem };
    claim: { step: InventoryItem };
    [key: string]: object | undefined;
};

interface BatchCardProps {
    item: InventoryItem;
}

const FONT = Platform.select({
    ios: 'System',
    android: 'sans-serif',
});

// ─── Sheet Action Config ──────────────────────────────────────────────────────
interface SheetActionConfig {
    key: string;
    label: string;
    sub: string;
    icon: string;
    color: string;
    bg: string;
}

const SHEET_ACTIONS: SheetActionConfig[] = [
    {
        key: 'nextStage',
        label: 'Next process',
        sub: 'Move to next stage',
        icon: 'skip-next',
        color: colors.textPrimary,
        bg: colors.infoLight,
    },
    {
        key: 'stockify',
        label: 'Stockify',
        sub: 'Move to inventory',
        icon: 'inventory',
        color: colors.primaryDark,
        bg: colors.primaryLight,
    },
    {
        key: 'issueStock',
        label: 'Issue stock',
        sub: 'Dispatch materials',
        icon: 'output',
        color: colors.warningText,
        bg: colors.warningLight,
    },
    {
        key: 'claim',
        label: 'Claim',
        sub: 'File a return claim',
        icon: 'assignment-return',
        color: colors.purple,
        bg: colors.purpleLight,
    },
];

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
const ActionsBottomSheet: React.FC<{
    visible: boolean;
    lotNumber: string;
    onClose: () => void;
    onAction: (key: string) => void;
}> = ({ visible, lotNumber, onClose, onAction }) => (
    <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
    >
        <TouchableOpacity
            style={sheetStyles.overlay}
            activeOpacity={1}
            onPress={onClose}
        >
            <View style={sheetStyles.sheet}>
                <View style={sheetStyles.handle} />
                <View style={sheetStyles.header}>
                    <Text style={sheetStyles.title}>
                        Lot #{lotNumber.toUpperCase()} — choose action
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icon name="close" size={20} color={colors.gray500} />
                    </TouchableOpacity>
                </View>
                <View style={sheetStyles.grid}>
                    {SHEET_ACTIONS.map((btn) => (
                        <TouchableOpacity
                            key={btn.key}
                            style={[sheetStyles.sheetBtn, { backgroundColor: btn.bg }]}
                            activeOpacity={0.75}
                            onPress={() => {
                                onAction(btn.key);
                                onClose();
                            }}
                        >
                            <Icon name={btn.icon} size={22} color={btn.color} />
                            <View style={{ flex: 1 }}>
                                <Text style={[sheetStyles.btnLabel, { color: btn.color }]}>
                                    {btn.label}
                                </Text>
                                <Text style={[sheetStyles.btnSub, { color: btn.color }]}>
                                    {btn.sub}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    </Modal>
);

// ─── Material Flow Table ──────────────────────────────────────────────────────
const MaterialFlowTable: React.FC<{ items: InventoryItem['provided_products'] }> = ({ items }) => (
    <View>
        <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.textRight, { flex: 1 }]}>Provided</Text>
            <Text style={[styles.tableHeaderCell, styles.textRight, { flex: 1 }]}>Used</Text>
            <Text style={[styles.tableHeaderCell, styles.textRight, { flex: 0.7 }]}>Rem.</Text>
        </View>
        {items?.map((item, idx) => {
            const balance = item.quantity - item.used;
            return (
                <View
                    key={idx}
                    style={[styles.tableRow, idx < items.length - 1 && styles.tableRowBorder]}
                >
                    <View style={{ flex: 2 }}>
                        <Text style={styles.tableItemName}>{item.name}</Text>
                        <Text style={styles.outputItemUnitName}>{item.unit}</Text>
                    </View>
                    <Text style={[styles.tableSentValue, { flex: 1 }, styles.textRight]}>
                        {item.quantity}
                    </Text>
                    <Text style={[styles.tableUsedValue, { flex: 1 }, styles.textRight]}>
                        {item.used}
                    </Text>
                    <Text style={[styles.tableRemValue, { flex: 0.7 }, styles.textRight]}>
                        {balance}
                    </Text>
                </View>
            );
        })}
    </View>
);

// ─── Output Table ─────────────────────────────────────────────────────────────
const OutputTable: React.FC<{ items: InventoryItem['produced_products'] }> = ({ items }) => {
    const [expandedConsumptions, setExpandedConsumptions] = useState<Set<number>>(new Set());

    const toggleConsumption = useCallback((id: number) => {
        setExpandedConsumptions((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    if (!items?.length) return null;

    const grouped = items.reduce((map, prod) => {
        const key = prod.purchase_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(prod);
        return map;
    }, new Map<number, typeof items>());

    return (
        <View>
            <View style={[styles.tableHeader, styles.outputTableHeader]}>
                <Text style={[styles.tableHeaderCell, styles.outputHeaderCell, { flex: 2 }]}>Item</Text>
                <Text style={[styles.tableHeaderCell, styles.outputHeaderCell, styles.textRight, { flex: 1 }]}>Price</Text>
                <Text style={[styles.tableHeaderCell, styles.outputHeaderCell, styles.textRight, { flex: 1 }]}>Qty</Text>
                <Text style={[styles.tableHeaderCell, styles.outputHeaderCell, styles.textRight, { flex: 1 }]}>Sub.</Text>
            </View>
            {Array.from(grouped.entries()).map(([purchaseId, products]) => (
                <View key={purchaseId} style={styles.purchaseGroup}>
                    {products.map((prodItem, idx) => {
                        const isOpen = expandedConsumptions.has(prodItem.id);
                        const hasConsumptions = prodItem.consumptions.length > 0;
                        return (
                            <View key={prodItem.id}>
                                <TouchableOpacity
                                    style={[
                                        styles.outputRow,
                                        idx < products.length - 1 && styles.outputRowBorder,
                                    ]}
                                    onPress={() => hasConsumptions && toggleConsumption(prodItem.id)}
                                    activeOpacity={hasConsumptions ? 0.7 : 1}
                                >
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.outputItemName}>{prodItem.name}</Text>
                                        <Text style={styles.outputItemUnitName}>{prodItem.unit}</Text>
                                    </View>
                                    <View style={[{ flex: 1 }, styles.alignRight]}>
                                        <Text style={styles.outputUnit}>
                                            {prodItem.price.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={[{ flex: 1 }, styles.alignRight]}>
                                        <Text style={styles.outputUnit}>
                                            {prodItem.quantity.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={[{ flex: 1 }, styles.alignRight]}>
                                        <Text style={styles.outputUnit}>
                                            {(prodItem.price * prodItem.quantity).toLocaleString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {isOpen && (
                                    <View style={styles.consumptionsPanel}>
                                        {prodItem.consumptions.map((c, ci) => (
                                            <View key={ci} style={styles.consumptionRow}>
                                                <View style={styles.bullet} />
                                                <Text style={styles.consumptionName}>{c.name}</Text>
                                                <Text style={styles.consumptionCost}>
                                                    ${c.quantity.toFixed(2)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

// ─── Main BatchCard Component ─────────────────────────────────────────────────
const BatchCard: React.FC<BatchCardProps> = ({ item }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [materialsExpanded, setMaterialsExpanded] = useState(true);
    const [producedExpanded, setProducedExpanded] = useState(true);

    const handleActionPress = useCallback(
        (key: string) => {
            switch (key) {
                case 'nextStage':
                    navigation.push('nextProcess', { stepId: Number(item.id) });
                    break;
                case 'stockify':
                    navigation.push('stockify', { stepId: Number(item.id) });
                    break;
                case 'issueStock':
                    navigation.push('issueStock', { step: item });
                    break;
                case 'claim':
                    navigation.push('claim', { step: item });
                    break;
                default:
                    null;
            }
        },
        [navigation, item]
    );

    // ─── Yield Calculation ────────────────────────────────────────────────────
    const totalProvided = item.provided_products?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
    const totalUsed = item.provided_products?.reduce((sum, p) => sum + p.used, 0) ?? 0;
    const totalProduced = item.produced_products?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
    let completionPercent = 0;
    if (totalProvided > 0) {
        completionPercent = Math.min((totalUsed / totalProvided) * 100, 100);
    }
    const percentDisplay = `${Math.round(completionPercent)}%`;

    return (
        <View style={styles.batchCard}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.batchId}>Lot #{item.lot_number}</Text>
                    <Text style={styles.batchDate}>Process: {item.process}</Text>
                </View>
                <View style={styles.headerRight}>
                    {/* Yield badge */}
                    <View style={styles.yieldBadgeContainer}>
                        <Text style={styles.yieldLabel}>Yield</Text>
                        <View style={[styles.yieldBadge, { backgroundColor: colors.primaryMuted }]}>
                            <Text style={[styles.yieldValue, { color: colors.textPrimary }]}>{percentDisplay}</Text>
                        </View>
                    </View>
                    {/* Actions trigger */}
                    <TouchableOpacity
                        style={styles.headerActionsBtn}
                        onPress={() => setSheetVisible(true)}
                        activeOpacity={0.72}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                        <Icon name="more-vert" size={20} color={colors.gray700} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Materials Provided */}
            {item.provided_products && item.provided_products.length > 0 && (
                <View style={styles.sectionPad}>
                    <TouchableOpacity
                        style={styles.sectionHeaderRow}
                        onPress={() => setMaterialsExpanded((p) => !p)}
                    >
                        <Text style={styles.sectionTitle}>Material Flow</Text>
                        <Icon
                            name={materialsExpanded ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={colors.gray500}
                        />
                    </TouchableOpacity>
                    {materialsExpanded && <MaterialFlowTable items={item.provided_products} />}
                </View>
            )}

            {/* Produced Items */}
            {item.produced_products && item.produced_products.length > 0 && (
                <View style={styles.outputSection}>
                    <TouchableOpacity
                        style={styles.sectionHeaderRow}
                        onPress={() => setProducedExpanded((p) => !p)}
                    >
                        <Text style={styles.outputSectionTitle}>Processed Output</Text>
                        <Icon
                            name={producedExpanded ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                    {producedExpanded && <OutputTable items={item.produced_products} />}
                </View>
            )}

            {/* Bottom Sheet */}
            <ActionsBottomSheet
                visible={sheetVisible}
                lotNumber={item.lot_number}
                onClose={() => setSheetVisible(false)}
                onAction={handleActionPress}
            />

            {/* Footer */}
            <View style={styles.cardFooter}>
                <Text style={styles.footerLabel}>Batch Balance</Text>
                <View style={styles.footerTotals}>
                    <Text style={styles.totalIn}>Total In: {totalProvided.toLocaleString()}</Text>
                    <Text style={styles.totalOut}>Total Out: {totalProduced.toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );
};

// ─── Bottom Sheet Styles ──────────────────────────────────────────────────────
const sheetStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 36,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 99,
        backgroundColor: colors.gray300,
        alignSelf: 'center',
        marginTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    title: {
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: '500',
        color: colors.gray700,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 16,
    },
    sheetBtn: {
        width: '47.5%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 10,
    },
    btnLabel: {
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: '700',
    },
    btnSub: {
        fontSize: 11,
        fontFamily: FONT,
        marginTop: 2,
        opacity: 0.75,
    },
});

// ─── Card Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    batchCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    cardDeleting: { opacity: 0.5 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    batchId: {
        fontSize: 15,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray900,
    },
    batchDate: {
        fontSize: 11,
        fontFamily: FONT,
        color: colors.gray500,
        marginTop: 1,
    },
    yieldBadgeContainer: { alignItems: 'flex-end' },
    yieldLabel: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    yieldBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
    yieldValue: { fontSize: 12, fontFamily: FONT, fontWeight: '700' },
    sectionPad: { padding: 16 },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        paddingBottom: 8,
    },
    tableHeaderCell: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    textRight: { textAlign: 'right' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    tableItemName: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray900,
        lineHeight: 17,
    },
    tableSentValue: {
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    tableUsedValue: {
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray700,
    },
    tableRemValue: {
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: '900',
        color: colors.gray800,
    },
    outputSection: {
        padding: 16,
        backgroundColor: colors.primaryMuted,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    outputSectionTitle: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    outputTableHeader: { borderBottomColor: colors.primaryLight },
    outputHeaderCell: { color: colors.primaryDark },
    outputRow: { flexDirection: 'row', paddingVertical: 10 },
    outputRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.primaryLight,
    },
    outputItemName: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray900,
        lineHeight: 17,
        textTransform: 'capitalize',
    },
    outputItemUnitName: {
        fontSize: 8,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray500,
        lineHeight: 17,
        textTransform: 'uppercase',
    },
    outputUnit: {
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: FONT,
        fontWeight: 'bold',
        color: colors.primary,
        opacity: 0.7,
        textAlign: 'right',
        paddingHorizontal: 2,
    },
    consumptionsPanel: {
        backgroundColor: colors.primaryLight,
        borderRadius: 8,
        marginTop: 6,
        marginBottom: 8,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    consumptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    bullet: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    consumptionName: {
        flex: 1,
        fontSize: 12,
        color: colors.gray700,
        fontWeight: '500',
    },
    consumptionCost: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primaryDark,
        minWidth: 55,
        textAlign: 'right',
    },
    purchaseGroup: {
        borderBottomWidth: 1,
        borderColor: colors.gray200,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerActionsBtn: {
        width: 32,
        height: 32,
        borderRadius: 99,
        backgroundColor: colors.gray100,
        borderWidth: 0.5,
        borderColor: colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.backgroundLight,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    footerLabel: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '500',
        color: colors.gray700,
    },
    footerTotals: { flexDirection: 'row', gap: 16 },
    totalIn: { fontSize: 12, fontFamily: FONT, fontWeight: '700', color: colors.textPrimary },
    totalOut: { fontSize: 12, fontFamily: FONT, fontWeight: '700', color: colors.primary },
    alignRight: { alignItems: 'flex-end' },
});

export default BatchCard;