// OverviewCard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme';
import { getLotStatus } from '../../services/assemblyService';
import { LotStatus } from '../../types/assembly';
const C = {
    primary: '#00288e',
    secondary: '#1f6c3a',
    surfaceContainer: '#e9edff',
    outline: '#757684',
    outlineVariant: '#c4c5d5',
    onSurfaceVariant: '#444653',
};

const FONT = Platform.select({
    ios: 'System',
    android: 'sans-serif',
});

export const OverviewCard: React.FC<{ id: number }> = ({ id }) => {
    const [lotStatus, setLotStatus] = useState<LotStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getLotStatus(id);
                setLotStatus(data);
            } catch (error) {
                console.error('Failed to fetch lot status:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchStatus();
        }
    }, [id]);

    const percentage = lotStatus && lotStatus.provided > 0 ? ((lotStatus.consumed + lotStatus.claimed) / lotStatus.provided) * 100 : 0;

    if (loading) {
        return (
            <View style={styles.overviewCard}>
                <Text style={styles.overviewCardTitle}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.overviewCard}>
            <Text style={styles.overviewCardTitle}>Active Lots Overview</Text>
            <View style={styles.overviewStats}>
                <View style={styles.overviewStatLeft}>
                    <Text style={styles.overviewStatLabel}>Total Materials Sent</Text>
                    <View style={styles.statValueRow}>
                        <Text style={styles.statValuePrimary}>{lotStatus?.provided || 0}</Text>
                        <Text style={styles.statUnitPrimary}>UNITS</Text>
                    </View>
                </View>
                <View style={styles.overviewStatRight}>
                    <Text style={styles.overviewStatLabel}>Total Consumed</Text>
                    <View style={styles.statValueRow}>
                        <Text style={styles.statValueSecondary}>{lotStatus?.consumed || 0}</Text>
                        <Text style={styles.statUnitSecondary}>UNITS</Text>
                    </View>
                   
                </View>
                 <View style={styles.overviewStatRight}>
                    <View>
                        <Text style={styles.overviewStatLabel}>Total Claimed</Text>
                        <View style={styles.statValueRow}>
                            <Text style={styles.statValueSecondary}>{lotStatus?.claimed || 0}</Text>
                            <Text style={styles.statUnitSecondary}>UNITS</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.yieldRow}>
                <Text style={styles.globalYieldText}>{Math.round(percentage)}% Global Yield</Text>
               
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overviewCard: {
        backgroundColor: colors.backgroundLight,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
        marginBottom:10,
    },
    overviewCardTitle: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: '700',
        color: C.outline,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    overviewStats: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: C.outlineVariant,
        borderStyle: 'dashed',
        marginBottom: 12,
    },
    overviewStatLeft: { flex: 1 },
    overviewStatRight: {
        flex: 1,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: C.outlineVariant,
    },
    overviewStatLabel: {
        fontSize: 13,
        fontFamily: FONT,
        color: C.onSurfaceVariant,
        lineHeight: 18,
        marginBottom: 4,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    statValuePrimary: {
        fontSize: 22,
        fontFamily: FONT,
        fontWeight: '800',
        color: C.primary,
    },
    statUnitPrimary: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        color: C.primary,
        opacity: 0.7,
    },
    statValueSecondary: {
        fontSize: 22,
        fontFamily: FONT,
        fontWeight: '800',
        color: C.secondary,
    },
    statUnitSecondary: {
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: '700',
        color: C.secondary,
        opacity: 0.7,
    },
    yieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    globalYieldText: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: '700',
        color: C.secondary,
    },
    updatedText: {
        fontSize: 11,
        fontFamily: FONT,
        color: C.outline,
        fontStyle: 'italic',
    },
    progressTrack: {
        height: 8,
        backgroundColor: C.surfaceContainer,
        borderRadius: 99,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        width: '95%',
        backgroundColor: C.secondary,
        borderRadius: 99,
    },
});