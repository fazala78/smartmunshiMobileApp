// components/assembly/LotCard.tsx
import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { ActionKey, InventoryItem, ProducedItem } from '../../types/assembly';
import { deleteLot } from '../../services/assemblyService';

// ─── Types ────────────────────────────────────────────────────────────────────

type RootStackParamList = {
    nextProcess: { stepId: number };
    stockify: { stepId: number };
    issueStock: { step: InventoryItem };
    claim: { step: InventoryItem };
    Assembly: undefined;
    [key: string]: object | undefined;
};

interface LotCardProps {
    item: InventoryItem;
    onAction?: (key: ActionKey, itemId: string) => void;
    onTitlePress?: (item: InventoryItem) => void;
    onDelete?: (itemId: string) => Promise<void>;
}

const FONT = Platform.select({ ios: 'System', android: 'sans-serif' });

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
    { key: 'nextStage',   label: 'Next process', sub: 'Move to next stage',   icon: 'skip-next',         color: colors.dark,          bg: colors.infoLight },
    { key: 'stockify',    label: 'Stockify',      sub: 'Move to inventory',    icon: 'inventory',         color: colors.primaryDark,   bg: colors.primaryLight },
    { key: 'issueStock',  label: 'Issue stock',   sub: 'Dispatch materials',   icon: 'output',            color: colors.warningDark,   bg: colors.warningLight },
    { key: 'claim',       label: 'Claim',         sub: 'File a return claim',  icon: 'assignment-return', color: colors.purple,       bg: colors.purpleLight },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByPurchaseId(products: ProducedItem[]): Map<number, ProducedItem[]> {
    return products.reduce((map, item) => {
        const key = item.purchase_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
        return map;
    }, new Map<number, ProducedItem[]>());
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

const ActionsBottomSheet: React.FC<{
    visible: boolean;
    lotNumber: string;
    onClose: () => void;
    onAction: (key: string) => void;
}> = ({ visible, lotNumber, onClose, onAction }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose}>
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
                            onPress={() => { onAction(btn.key); onClose(); }}
                        >
                            <Icon name={btn.icon} size={22} color={btn.color} />
                            <View style={{ flex: 1 }}>
                                <Text style={[sheetStyles.btnLabel, { color: btn.color }]}>{btn.label}</Text>
                                <Text style={[sheetStyles.btnSub,   { color: btn.color }]}>{btn.sub}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    </Modal>
);

// ─── Section Header Row ───────────────────────────────────────────────────────

const SectionRow: React.FC<{
    label: string;
    icon: string;
    iconColor: string;
    expanded: boolean;
    onToggle: () => void;
}> = ({ label, icon, iconColor, expanded, onToggle }) => (
    <TouchableOpacity style={styles.sectionRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.sectionRowLeft}>
            <Icon name={icon} size={15} color={iconColor} />
            <Text style={[styles.sectionLabel, { color: iconColor }]}>{label}</Text>
        </View>
        <Icon name={expanded ? 'expand-less' : 'expand-more'} size={18} color={iconColor} />
    </TouchableOpacity>
);

// ─── Table Header ─────────────────────────────────────────────────────────────

const TableHead: React.FC<{ cols: { label: string; flex: number; right?: boolean }[] }> = ({ cols }) => (
    <View style={styles.tableHeader}>
        {cols.map((c, i) => (
            <Text
                key={i}
                style={[styles.tableHeaderCell, { flex: c.flex }, c.right && styles.textRight]}
            >
                {c.label}
            </Text>
        ))}
    </View>
);

// ─── Materials Section ────────────────────────────────────────────────────────

const MaterialsSection: React.FC<{ items: InventoryItem['provided_products'] }> = ({ items }) => {
    const [expanded, setExpanded] = useState(false);
    if (!items?.length) return null;
    return (
        <View style={[styles.section]}>
            <SectionRow
                label="Materials provided"
                icon="inventory-2"
                iconColor={colors.warningDark}
                expanded={expanded}
                onToggle={() => setExpanded(p => !p)}
            />
            {expanded && (
                <View style={[styles.sectionBody, { backgroundColor: colors.warningLight }]}>
                    <TableHead cols={[
                        { label: 'Item',     flex: 2.5 },
                        { label: 'Provided', flex: 1, right: true },
                        { label: 'Used',     flex: 1, right: true },
                        { label: 'Rem.',     flex: 1, right: true },
                    ]} />
                    {items.map((mat, idx) => {
                        const balance = mat.quantity - mat.used;
                        return (
                            <View key={idx} style={[styles.tableRow, idx === items.length - 1 && styles.tableRowLast]}>
                                <View style={{ flex: 2.5 }}>
                                    <Text style={styles.itemName}>{mat.name}</Text>
                                    <Text style={styles.itemUnit}>{mat.unit}</Text>
                                </View>
                                <Text style={[styles.cellValue, { flex: 1, color: colors.textPrimary }, styles.textRight]}>{mat.quantity}</Text>
                                <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>{mat.used}</Text>
                                <Text style={[styles.cellValue, { flex: 1, color: balance > 0 ? colors.primary : colors.danger, fontWeight: '700' }, styles.textRight]}>{balance}</Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

// ─── Produced Section ─────────────────────────────────────────────────────────

const ProducedSection: React.FC<{ items: InventoryItem['produced_products'] }> = ({ items }) => {
    const [expanded, setExpanded] = useState(false);
    const [expandedConsumptions, setExpandedConsumptions] = useState<Set<number>>(new Set());

    const toggleConsumption = useCallback((id: number) => {
        setExpandedConsumptions(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    if (!items?.length) return null;

    const grouped = groupByPurchaseId(items);
    const grandTotal = items.reduce((sum, p) => sum + p.price * p.quantity, 0);

    return (
        <View style={[styles.section, { borderColor: colors.primaryBorder }]}>
            <SectionRow
                label="Produced items"
                icon="precision-manufacturing"
                iconColor={colors.primaryDark}
                expanded={expanded}
                onToggle={() => setExpanded(p => !p)}
            />
            {expanded && (
                <View style={[styles.sectionBody, { backgroundColor: colors.primaryLight }]}>
                    <TableHead cols={[
                        { label: 'Item',  flex: 2 },
                        { label: 'Price', flex: 1, right: true },
                        { label: 'Qty',   flex: 1, right: true },
                        { label: 'Sub.',  flex: 1, right: true },
                    ]} />
                    {Array.from(grouped.entries()).map(([purchaseId, products], gi) => (
                        <View key={purchaseId} style={gi > 0 ? styles.purchaseDivider : undefined}>
                            <View style={styles.poBadgeRow}>
                                <View style={[styles.poBadge, { backgroundColor: colors.warningLight }]}>
                                    <Icon name="receipt-long" size={10} color={colors.warning} />
                                    <Text style={[styles.poBadgeText, { color: colors.warning }]}>PO #{purchaseId}</Text>
                                </View>
                            </View>
                            {products.map((prod, idx) => {
                                const isOpen = expandedConsumptions.has(prod.id);
                                const hasCons = prod.consumptions.length > 0;
                                return (
                                    <View key={prod.id}>
                                        <TouchableOpacity
                                            style={[styles.tableRow, idx === products.length - 1 && !isOpen && styles.tableRowLast]}
                                            onPress={() => hasCons && toggleConsumption(prod.id)}
                                            activeOpacity={hasCons ? 0.7 : 1}
                                        >
                                            <View style={{ flex: 2 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                    <Text style={styles.itemName}>{prod.name}</Text>
                                                    {hasCons && (
                                                        <Icon
                                                            name={isOpen ? 'expand-less' : 'expand-more'}
                                                            size={14}
                                                            color={colors.primaryDark}
                                                        />
                                                    )}
                                                </View>
                                                <Text style={styles.itemUnit}>{prod.unit}</Text>
                                            </View>
                                            <Text style={[styles.cellValue, { flex: 1, color: colors.primaryDark }, styles.textRight]}>
                                                {prod.price.toLocaleString()}
                                            </Text>
                                            <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>
                                                {prod.quantity.toLocaleString()}
                                            </Text>
                                            <Text style={[styles.cellValue, { flex: 1, color: colors.primaryDark, fontWeight: '700' }, styles.textRight]}>
                                                {(prod.price * prod.quantity).toLocaleString()}
                                            </Text>
                                        </TouchableOpacity>
                                        {isOpen && (
                                            <View style={styles.consumptionsPanel}>
                                                {prod.consumptions.map((c, ci) => (
                                                    <View key={ci} style={styles.consumptionRow}>
                                                        <View style={styles.bullet} />
                                                        <Text style={styles.consumptionName}>{c.name}</Text>
                                                        <Text style={styles.consumptionQty}>{c.quantity}×{c.cost}</Text>
                                                        <Text style={styles.consumptionCost}>${(c.cost * c.quantity).toFixed(2)}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Grand total</Text>
                        <Text style={[styles.totalValue, { color: colors.primaryDark }]}>${grandTotal.toFixed(2)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Finished Products Section ────────────────────────────────────────────────

const FinishedSection: React.FC<{ items: InventoryItem['finished_products'] }> = ({ items }) => {
    const [expanded, setExpanded] = useState(false);
    if (!items?.length) return null;

    const total = items.reduce((sum, p) => sum + p.cost * p.quantity, 0);
    const grouped = items.reduce((map, fp) => {
        if (!map.has(fp.purchase_id)) map.set(fp.purchase_id, []);
        map.get(fp.purchase_id)!.push(fp);
        return map;
    }, new Map<number, typeof items>());

    return (
        <View style={[styles.section, { borderColor: colors.infoLight }]}>
            <SectionRow
                label="Finished products"
                icon="check-circle"
                iconColor={colors.infoDark}
                expanded={expanded}
                onToggle={() => setExpanded(p => !p)}
            />
            {expanded && (
                <View style={[styles.sectionBody, { backgroundColor: colors.infoLight }]}>
                    {Array.from(grouped.entries()).map(([purchaseId, products], gi) => (
                        <View key={purchaseId} style={gi > 0 ? styles.purchaseDivider : undefined}>
                            <View style={styles.poBadgeRow}>
                                <View style={[styles.poBadge, { backgroundColor: colors.infoLight }]}>
                                    <Icon name="receipt-long" size={10} color={colors.info} />
                                    <Text style={[styles.poBadgeText, { color: colors.info }]}>PO #{purchaseId}</Text>
                                </View>
                            </View>
                            <TableHead cols={[
                                { label: 'Item',  flex: 2 },
                                { label: 'Cost',  flex: 1, right: true },
                                { label: 'Qty',   flex: 1, right: true },
                                { label: 'Total', flex: 1, right: true },
                            ]} />
                            {products!.map((fp, idx) => (
                                <View key={fp.id} style={[styles.tableRow, idx === products!.length - 1 && styles.tableRowLast]}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.itemName}>{fp.name}</Text>
                                    </View>
                                    <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>${fp.cost.toFixed(2)}</Text>
                                    <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>{fp.quantity}</Text>
                                    <Text style={[styles.cellValue, { flex: 1, color: colors.infoDark, fontWeight: '700' }, styles.textRight]}>${(fp.cost * fp.quantity).toFixed(2)}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={[styles.totalValue, { color: colors.infoDark }]}>${total.toFixed(2)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Claims Section ───────────────────────────────────────────────────────────

const ClaimsSection: React.FC<{ items: InventoryItem['claims'] }> = ({ items }) => {
    const [expanded, setExpanded] = useState(false);
    if (!items?.length) return null;

    const total = items.reduce((sum, c) => sum + c.cost * c.quantity, 0);

    return (
        <View style={[styles.section, { borderColor: colors.purpleLight }]}>
            <SectionRow
                label="Claims"
                icon="assignment-return"
                iconColor={colors.purple}
                expanded={expanded}
                onToggle={() => setExpanded(p => !p)}
            />
            {expanded && (
                <View style={[styles.sectionBody, { backgroundColor: colors.purpleLight }]}>
                    <TableHead cols={[
                        { label: 'Name',  flex: 2.5 },
                        { label: 'Cost',  flex: 1, right: true },
                        { label: 'Qty',   flex: 1, right: true },
                        { label: 'Total', flex: 1, right: true },
                    ]} />
                    {items.map((claim, idx) => (
                        <View key={idx} style={[styles.tableRow, idx === items.length - 1 && styles.tableRowLast]}>
                            <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Icon name="star-outline" size={12} color={colors.purple} />
                                <Text style={[styles.itemName, { color: colors.purple }]}>{claim.display_name}</Text>
                            </View>
                            <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>${claim.cost.toFixed(2)}</Text>
                            <Text style={[styles.cellValue, { flex: 1, color: colors.gray700 }, styles.textRight]}>{claim.quantity}</Text>
                            <Text style={[styles.cellValue, { flex: 1, color: colors.purple, fontWeight: '700' }, styles.textRight]}>${(claim.cost * claim.quantity).toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={[styles.totalValue, { color: colors.purple }]}>${total.toFixed(2)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Main LotCard ─────────────────────────────────────────────────────────────

const LotCard: React.FC<LotCardProps> = ({ item, onAction, onTitlePress }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // ─── Delete ───────────────────────────────────────────────────────────────

    const handleDelete = useCallback(() => {
        Alert.alert(
            'Delete Lot',
            `Delete LOT ${item.lot_number.toUpperCase()}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            await deleteLot?.(item.id);
                            navigation.navigate('Assembly');
                        } catch {
                            Alert.alert('Error', 'Failed to delete lot. Please try again.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }, [item.id, item.lot_number, navigation]);

    // ─── Action ───────────────────────────────────────────────────────────────

    const handleAction = useCallback((key: string) => {
        switch (key) {
            case 'nextStage':  navigation.push('nextProcess', { stepId: Number(item.id) }); break;
            case 'stockify':   navigation.push('stockify',    { stepId: Number(item.id) }); break;
            case 'issueStock': navigation.push('issueStock',  { step: item });              break;
            case 'claim':      navigation.push('claim',       { step: item });              break;
            default:           onAction?.(key as ActionKey, String(item.id));
        }
    }, [navigation, item, onAction]);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const isComplete   = item.status?.toLowerCase() === 'complete';
    const statusColor  = isComplete ? colors.primary : colors.warning;
    const statusBg     = isComplete ? colors.primaryLight : colors.warningLight;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={[styles.card, isDeleting && styles.cardDeleting]}>

            {/* ── Header ── */}
            <View style={styles.cardHeader}>
                {/* Left: status pill + lot info */}
                <View style={styles.headerLeft}>
                    <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.lotNumber}>Lot #{item.lot_number.toUpperCase()}</Text>
                    <Text style={styles.processText}>{item.process}</Text>
                </View>

                {/* Right: yield badge + action button + delete */}
                <View style={styles.headerRight}>
                    <View style={styles.headerActions}>
                        {item.parent_step !== null && (
                            <TouchableOpacity
                                style={styles.headerActionsBtn}
                                onPress={() => setSheetVisible(true)}
                                activeOpacity={0.72}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Icon name="more-vert" size={20} color={colors.gray700} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleDelete}
                            disabled={isDeleting}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Icon
                                name="delete-outline"
                                size={18}
                                color={colors.danger}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* ── Account / Title row ── */}
            <TouchableOpacity
                style={styles.titleRow}
                activeOpacity={0.7}
                onPress={() => onTitlePress?.(item)}
            >
                <View style={styles.titleLeft}>
                    <Icon name="factory" size={15} color={colors.gray500} />
                    <Text style={styles.accountText} numberOfLines={1}>{item.account}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.gray500} />
            </TouchableOpacity>

            {/* ── Sections ── */}
            <View style={styles.sectionsWrapper}>
                <MaterialsSection items={item.provided_products} />
                <ProducedSection  items={item.produced_products} />
                <FinishedSection  items={item.finished_products} />
                <ClaimsSection    items={item.claims} />
            </View>

            {/* ── Bottom Sheet ── */}
            <ActionsBottomSheet
                visible={sheetVisible}
                lotNumber={item.lot_number}
                onClose={() => setSheetVisible(false)}
                onAction={handleAction}
            />
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
        borderBottomColor: colors.gray300,
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

    // Card shell
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.gray200,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardDeleting: { opacity: 0.5 },

    // Header
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    headerLeft: {
        flex: 1,
        gap: 3,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 99,
        marginBottom: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    lotNumber: {
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray900,
    },
    processText: {
        fontSize: 11,
        fontFamily: FONT,
        color: colors.gray500,
        marginTop: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 99,
        backgroundColor: colors.dangerLight,
        borderWidth: 0.5,
        borderColor: colors.dangerLight,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Title / account row
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    titleLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    accountText: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: '600',
        color: colors.gray900,
        textTransform: 'capitalize',
    },

    // Sections wrapper
    sectionsWrapper: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
    },

    // Individual section card
    section: {
        overflow: 'hidden',
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.white,
    },
    sectionRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    sectionBody: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },

    // Table
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 7,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.07)',
        marginBottom: 2,
    },
    tableHeaderCell: {
        fontSize: 9,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    textRight: { textAlign: 'right' },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    tableRowLast: { borderBottomWidth: 0 },
    itemName: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '600',
        color: colors.gray900,
    },
    itemUnit: {
        fontSize: 9,
        fontFamily: FONT,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 1,
    },
    cellValue: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '500',
    },

    // PO badge
    poBadgeRow: {
        paddingVertical: 6,
    },
    poBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
    },
    poBadgeText: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
    },
    purchaseDivider: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.07)',
        marginTop: 8,
        paddingTop: 4,
    },

    // Consumptions
    consumptionsPanel: {
        backgroundColor: '#ecfdf5',
        borderRadius: 6,
        marginBottom: 4,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    consumptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 3,
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
        fontFamily: FONT,
        color: colors.gray700,
        fontWeight: '500',
    },
    consumptionQty: {
        fontSize: 11,
        fontFamily: FONT,
        color: colors.gray500,
    },
    consumptionCost: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.primaryDark,
        minWidth: 55,
        textAlign: 'right',
    },

    // Section totals
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'baseline',
        gap: 10,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
    },
    totalLabel: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        color: colors.gray700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    totalValue: {
        fontSize: 15,
        fontFamily: FONT,
        fontWeight: '800',
    },
});

export default LotCard;