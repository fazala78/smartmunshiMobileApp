import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';
import { ActionKey, InventoryItem, ProducedItem } from '../../types/assembly';


interface LotCardProps {
    item: InventoryItem;
    onAction?: (key: ActionKey, itemId: string) => void;
    onTitlePress?: (item: InventoryItem) => void;
}

interface ActionButton {
    key: ActionKey;
    label: string;
    icon: string;
    color: string;
    bg: string;
}

const ACTION_BUTTONS: ActionButton[] = [
    { key: 'nextStage', label: 'Next Stage', icon: 'arrow-forward', color: '#4F46E5', bg: '#EEF2FF' },
    { key: 'stockify', label: 'Stockify', icon: 'inventory-2', color: '#16A34A', bg: '#F0FDF4' },
    { key: 'issueStock', label: 'Issue Stock', icon: 'local-shipping', color: '#EA580C', bg: '#FFF7ED' },
    { key: 'claim', label: 'Claim', icon: 'star-outline', color: '#C026D3', bg: '#FDF2F8' },
];

function groupByPurchaseId(products: ProducedItem[]): Map<number, ProducedItem[]> {
    return products.reduce((map, item) => {
        const key = item.purchase_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
        return map;
    }, new Map<number, ProducedItem[]>());
}

const LotCard: React.FC<LotCardProps> = ({ item, onAction, onTitlePress }) => {
    const [materialsExpanded, setMaterialsExpanded] = useState(false);
    const [producedExpanded, setProducedExpanded] = useState(false);
    const [finishedExpanded, setFinishedExpanded] = useState(false);
    const [claimsExpanded, setClaimsExpanded] = useState(false);
    // key = produced item id, value = expanded bool
    const [expandedConsumptions, setExpandedConsumptions] = useState<Set<number>>(new Set());

    const toggleMaterials = useCallback(() => setMaterialsExpanded(p => !p), []);
    const toggleProduced = useCallback(() => setProducedExpanded(p => !p), []);
    const toggleFinished = useCallback(() => setFinishedExpanded(p => !p), []);
    const toggleClaims = useCallback(() => setClaimsExpanded(p => !p), []);

    const toggleConsumption = useCallback((id: number) => {
        setExpandedConsumptions(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleAction = useCallback((key: ActionKey) => {
        onAction?.(key, String(item.id));
    }, [onAction, item.id]);

    const groupedProduced = item.produced_products?.length
        ? groupByPurchaseId(item.produced_products)
        : null;

    const grandTotal = item.produced_products?.reduce(
        (sum, p) => sum + p.price * p.quantity, 0
    ) ?? 0;

    const finishedTotal = item.finished_products?.reduce(
        (sum, p) => sum + p.cost * p.quantity, 0
    ) ?? 0;

    const claimsTotal = item.claims?.reduce(
        (sum, c) => sum + c.cost * c.quantity, 0
    ) ?? 0;

    const handleTitlePress = useCallback(
        () => onTitlePress?.(item),
        [onTitlePress, item],
    );
    const isComplete = item.status?.toLowerCase() === 'complete';
    const statusColor = isComplete ? colors.primary : colors.warning;
    const isLocked = (item.finished_products?.length ?? 0) > 0 || (item.claims?.length ?? 0) > 0;


    return (
        <View style={styles.card}>
            {/* ── Header ── */}
            <View style={styles.cardHeader}>
                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.idText, { color: statusColor }]}>
                        {item.status.toUpperCase()}
                    </Text>

                    <Text style={styles.statusText}>
                        LOT: {item.lot_number.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.actionIcons}>

                    { /* <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="edit-note" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="shortcut" size={20} color="#94A3B8" />
                    </TouchableOpacity> */}

                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="delete-outline" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Title ── */}
            {isLocked ? (
                <View style={styles.titleRow}>
                    <View style={styles.titleContent}>
                        <Text style={styles.itemTitle}>
                            <Icon name="factory" size={16} style={{ marginRight: 8 }} />
                            <Text style={{ color: '#334155', fontWeight: '600' }}> {item.account}</Text>
                        </Text>
                        <View style={styles.locationRow}>
                            <Icon name="inventory" size={12} color={colors.primary} />
                            <Text style={styles.locationText}>{item.process}</Text>
                        </View>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.titleRow} activeOpacity={0.7} onPress={handleTitlePress}>
                    <View style={styles.titleContent}>
                        <Text style={styles.itemTitle}>
                            <Icon name="factory" size={16} style={{ marginRight: 8 }} />
                            <Text style={{ color: '#334155', fontWeight: '600' }}> {item.account}</Text>
                        </Text>
                        <View style={styles.locationRow}>
                            <Icon name="local-laundry-service" size={12} color={colors.warning} />
                            <Text style={styles.locationText}>{item.process}</Text>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={24} color="#047857" style={styles.chevron} />
                </TouchableOpacity>
            )}

            {/* ── Materials Provided ── */}
            {item.provided_products && item.provided_products.length > 0 && (
                <>
                    <TouchableOpacity style={styles.sectionDivider} onPress={toggleMaterials} activeOpacity={0.7}>
                        <View style={styles.sectionHeader}>
                            <Icon name="inventory-2" size={18} color="#B45309" />
                            <Text style={[styles.sectionTitle, { color: '#B45309' }]}>MATERIALS PROVIDED</Text>
                        </View>
                        <Icon name={materialsExpanded ? 'expand-less' : 'expand-more'} size={20} color="#B45309" />
                    </TouchableOpacity>

                    {materialsExpanded && (
                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Item Name</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Provided</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Used</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Balance</Text>
                            </View>
                            {item.provided_products.map((mat, idx) => {
                                const balance = mat.quantity - mat.used;
                                return (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={[styles.matNameCell, { flex: 2.5 }]}>{mat.name}</Text>
                                        <Text style={[styles.matCell, styles.cellRight]}>{mat.quantity} {mat.unit}</Text>
                                        <Text style={[styles.matCell, styles.cellRight]}>{mat.used} {mat.unit}</Text>
                                        <Text style={[styles.matCell, styles.cellRight, { color: balance > 0 ? '#10B981' : '#EF4444', fontWeight: '700' }]}>
                                            {balance} {mat.unit}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </>
            )}

            {/* ── Produced Items ── */}
            {groupedProduced && (
                <>
                    <TouchableOpacity style={styles.sectionDivider} onPress={toggleProduced} activeOpacity={0.7}>
                        <View style={styles.sectionHeader}>
                            <Icon name="precision-manufacturing" size={18} color="#047857" />
                            <Text style={[styles.sectionTitle, { color: '#047857' }]}>PRODUCED ITEMS</Text>
                        </View>
                        <Icon name={producedExpanded ? 'expand-less' : 'expand-more'} size={20} color="#047857" />
                    </TouchableOpacity>

                    {producedExpanded && (
                        <View style={styles.producedContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Item Name</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Price</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Qty</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Total</Text>
                            </View>
                            {Array.from(groupedProduced.entries()).map(([purchaseId, products], groupIdx) => {
                                return (
                                    <View
                                        key={purchaseId}
                                        style={[styles.purchaseGroup, groupIdx > 0 && styles.purchaseGroupDivider]}
                                    >
                                        {/* ── Group Header ── */}
                                        <View style={styles.purchaseGroupHeader}>
                                            <View style={styles.purchaseBadge}>
                                                <Icon name="receipt-long" size={11} color="#6D28D9" />
                                                <Text style={styles.purchaseBadgeText}>PO #{purchaseId}</Text>
                                            </View>
                                        </View>

                                        {/* ── Each Produced Item ── */}
                                        {products.map((prodItem, idx) => {
                                            const subtotal = prodItem.price * prodItem.quantity;
                                            const isOpen = expandedConsumptions.has(prodItem.id);
                                            const hasConsumptions = prodItem.consumptions.length > 0;

                                            return (
                                                <View key={prodItem.id}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.tableRow,
                                                            idx === products.length - 1 && !isOpen && { borderBottomWidth: 0 },
                                                        ]}
                                                        onPress={() => hasConsumptions && toggleConsumption(prodItem.id)}
                                                        activeOpacity={hasConsumptions ? 0.7 : 1}
                                                    >
                                                        <View style={[styles.prodNameCell, { flex: 2 }]}>
                                                            <View style={styles.prodNameRow}>
                                                                <Text style={styles.prodNameText}>{prodItem.name}</Text>
                                                                {hasConsumptions && (
                                                                    <Icon
                                                                        name={isOpen ? 'expand-less' : 'expand-more'}
                                                                        size={16}
                                                                        color="#047857"
                                                                    />
                                                                )}
                                                            </View>
                                                        </View>
                                                        <Text style={[styles.priceText, styles.cellRight]}>
                                                            ${prodItem.price.toFixed(2)}
                                                        </Text>
                                                        <Text style={[styles.qtyText, styles.cellRight]}>
                                                            {prodItem.quantity} {prodItem.unit}
                                                        </Text>
                                                        <Text style={[styles.subtotalText, styles.cellRight]}>
                                                            ${subtotal.toFixed(2)}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {/* ── Expanded Consumptions ── */}
                                                    {isOpen && (
                                                        <View style={styles.consumptionsPanel}>
                                                            <View style={styles.consumptionsHeader}>
                                                                <Text style={styles.consumptionsHeaderText}>MATERIALS USED</Text>
                                                            </View>
                                                            {prodItem.consumptions.map((c, ci) => (
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
                                );
                            })}

                            <View style={styles.grandTotalRow}>
                                <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                                <Text style={styles.grandTotalValue}>${grandTotal.toFixed(2)}</Text>
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ── Finished Products ── */}
            {item.finished_products && item.finished_products.length > 0 && (
                <>
                    <TouchableOpacity style={styles.sectionDivider} onPress={toggleFinished} activeOpacity={0.7}>
                        <View style={styles.sectionHeader}>
                            <Icon name="check-circle" size={18} color="#0369A1" />
                            <Text style={[styles.sectionTitle, { color: '#0369A1' }]}>FINISHED PRODUCTS</Text>
                        </View>
                        <Icon name={finishedExpanded ? 'expand-less' : 'expand-more'} size={20} color="#0369A1" />
                    </TouchableOpacity>

                    {finishedExpanded && (
                        <View style={styles.finishedContainer}>
                            {/* Group by purchase_id */}
                            {Array.from(
                                item.finished_products.reduce((map, fp) => {
                                    if (!map.has(fp.purchase_id)) map.set(fp.purchase_id, []);
                                    map.get(fp.purchase_id)!.push(fp);
                                    return map;
                                }, new Map<number, typeof item.finished_products>())
                            ).map(([purchaseId, products], groupIdx) => (
                                <View
                                    key={purchaseId}
                                    style={[styles.purchaseGroup, groupIdx > 0 && styles.purchaseGroupDivider]}
                                >
                                    {/* ── Group Header ── */}
                                    <View style={styles.purchaseGroupHeader}>
                                        <View style={styles.finishedPoBadge}>
                                            <Icon name="receipt-long" size={11} color="#0369A1" />
                                            <Text style={styles.finishedPoBadgeText}>PO #{purchaseId}</Text>
                                        </View>
                                    </View>
                                    {/* ── Column Headers ── */}
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Item Name</Text>
                                        <Text style={[styles.tableHeaderCell, styles.cellRight]}>Cost</Text>
                                        <Text style={[styles.tableHeaderCell, styles.cellRight]}>Qty</Text>
                                        <Text style={[styles.tableHeaderCell, styles.cellRight]}>Total</Text>
                                    </View>
                                    {products!.map((fp, idx) => {
                                        const subtotal = fp.cost * fp.quantity;
                                        return (
                                            <View
                                                key={fp.id}
                                                style={[
                                                    styles.tableRow,
                                                    idx === products!.length - 1 && { borderBottomWidth: 0 },
                                                ]}
                                            >
                                                <Text style={[styles.prodNameText, { flex: 2 }]}>{fp.name}</Text>
                                                <Text style={[styles.matCell, styles.cellRight]}>${fp.cost.toFixed(2)}</Text>
                                                <Text style={[styles.qtyText, styles.cellRight]}>{fp.quantity}</Text>
                                                <Text style={[styles.subtotalText, styles.cellRight, { color: '#0369A1' }]}>
                                                    ${subtotal.toFixed(2)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                            <View style={[styles.grandTotalRow, { borderTopColor: '#BAE6FD' }]}>
                                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                                <Text style={[styles.grandTotalValue, { color: '#0369A1' }]}>${finishedTotal.toFixed(2)}</Text>
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ── Claims ── */}
            {item.claims && item.claims.length > 0 && (
                <>
                    <TouchableOpacity style={styles.sectionDivider} onPress={toggleClaims} activeOpacity={0.7}>
                        <View style={styles.sectionHeader}>
                            <Icon name="star" size={18} color="#C026D3" />
                            <Text style={[styles.sectionTitle, { color: '#C026D3' }]}>CLAIMS</Text>
                        </View>
                        <Icon name={claimsExpanded ? 'expand-less' : 'expand-more'} size={20} color="#C026D3" />
                    </TouchableOpacity>

                    {claimsExpanded && (
                        <View style={styles.claimsContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Display Name</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Cost</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Qty</Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRight]}>Total</Text>
                            </View>
                            {item.claims.map((claim, idx) => {
                                const subtotal = claim.cost * claim.quantity;
                                return (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.tableRow,
                                            idx === item.claims!.length - 1 && { borderBottomWidth: 0 },
                                        ]}
                                    >
                                        <View style={[{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                            <Icon name="star-outline" size={13} color="#C026D3" />
                                            <Text style={[styles.prodNameText, { color: '#701A75' }]}>{claim.display_name}</Text>
                                        </View>
                                        <Text style={[styles.matCell, styles.cellRight]}>${claim.cost.toFixed(2)}</Text>
                                        <Text style={[styles.qtyText, styles.cellRight]}>{claim.quantity}</Text>
                                        <Text style={[styles.subtotalText, styles.cellRight, { color: '#86198F' }]}>
                                            ${subtotal.toFixed(2)}
                                        </Text>
                                    </View>
                                );
                            })}
                            <View style={[styles.grandTotalRow, { borderTopColor: '#F0ABFC' }]}>
                                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                                <Text style={[styles.grandTotalValue, { color: '#86198F' }]}>${claimsTotal.toFixed(2)}</Text>
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ── Action Buttons ── */}
            {!isLocked && (
                <View style={styles.actionRow}>
                    {ACTION_BUTTONS.map((btn) => (
                        <TouchableOpacity
                            key={btn.key}
                            style={styles.actionBtn}
                            activeOpacity={0.7}
                            onPress={() => handleAction(btn.key)}
                        >
                            <View style={[styles.actionIconWrap, { backgroundColor: btn.bg }]}>
                                <Icon name={btn.icon} size={18} color={btn.color} />
                            </View>
                            <Text style={[styles.actionLabel, { color: btn.color }]}>{btn.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    statusContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0, color: colors.gray500 },
    idText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0, color: '#94A3B8', fontFamily: 'monospace', marginRight: 8 },
    actionIcons: { flexDirection: 'row', gap: 12 },

    titleRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
    titleContent: { flex: 1, flexDirection: 'column' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },

    itemTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', textTransform: 'capitalize', width: '100%' },
    chevron: { marginLeft: 4, marginTop: 2 },
    locationText: { fontSize: 14, color: '#64748B', marginLeft: 2 },

    sectionDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 },

    // Materials provided
    tableContainer: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 10 },
    tableHeader: { flexDirection: 'row', marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tableHeaderCell: { flex: 1, fontSize: 9, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    cellRight: { textAlign: 'right' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    matNameCell: { fontSize: 12, color: '#334155', fontWeight: '500' },
    matCell: { flex: 1, fontSize: 12, color: '#475569' },

    // Produced container
    producedContainer: { backgroundColor: '#F0FDF8', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0' },

    // Finished products container
    finishedContainer: { backgroundColor: '#F0F9FF', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#BAE6FD' },
    finishedPoBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    finishedPoBadgeText: { fontSize: 10, fontWeight: '700', color: '#0369A1' },

    // Claims container
    claimsContainer: { backgroundColor: '#FDF4FF', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#F0ABFC' },

    // Purchase group
    purchaseGroup: { marginBottom: 4 },
    purchaseGroupDivider: { borderTopWidth: 1, borderTopColor: '#E0F2FE', paddingTop: 12, marginTop: 8 },
    purchaseGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    purchaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    purchaseBadgeText: { fontSize: 10, fontWeight: '700', color: '#6D28D9' },
    manufacturerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    manufacturerText: { fontSize: 10, fontWeight: '600', color: '#0369A1' },

    // Produced item row
    prodNameCell: { flexDirection: 'column', justifyContent: 'center', gap: 2 },
    prodNameText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    consumptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
    consumptionBadgeText: { fontSize: 10, color: '#047857', fontWeight: '600' },
    prodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },

    priceText: { flex: 1, fontSize: 12, color: '#047857' },
    qtyText: { flex: 1, fontSize: 12, color: '#475569' },
    subtotalText: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#065F46' },

    // Consumptions panel
    consumptionsPanel: { backgroundColor: '#ECFDF5', borderRadius: 8, marginBottom: 4, marginHorizontal: 2, padding: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' },
    consumptionsHeader: { marginBottom: 6 },
    consumptionsHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' },
    consumptionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
    consumptionName: { flex: 1, fontSize: 12, color: '#374151', fontWeight: '500' },
    consumptionQty: { fontSize: 12, color: '#6B7280' },
    consumptionCost: { fontSize: 12, fontWeight: '700', color: '#065F46', minWidth: 55, textAlign: 'right' },

    // Totals
    groupTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#A7F3D0' },
    groupTotalLabel: { fontSize: 10, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
    groupTotalValue: { fontSize: 13, fontWeight: '700', color: '#047857' },
    grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#6EE7B7' },
    grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: 1 },
    grandTotalValue: { fontSize: 17, fontWeight: '800', color: '#047857' },

    // Action buttons
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    actionBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
    actionIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});

export default LotCard;