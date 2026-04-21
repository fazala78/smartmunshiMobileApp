import React, { useCallback, useMemo } from 'react';
import {
    FlatList,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ListRenderItemInfo,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import { fetchSubLots } from '../services/assemblyService';
import LotCard from '../components/assembly/LotCard';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import { RootStackParamList } from '../types/navigation';
import { ActionKey, InventoryItem } from '../types/assembly';

type Props = NativeStackScreenProps<RootStackParamList, 'subLots'>;

const AssemblySubLots: React.FC<Props> = ({ route, navigation }) => {
    const { lotId, lotNumber, depth } = route.params;

    // ─── Fetch children of this lot ───────────────────────────────────────

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['lots', 'children', lotId],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
            return await fetchSubLots(lotId, {
                page: pageParam,
                limit: 10,
                // no lot_id in search — the function already uses it for the URL
            });
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage?.pagination) return undefined;
            return lastPage.pagination.hasNextPage
                ? lastPage.pagination.currentPage + 1
                : undefined;
        },
        initialPageParam: 1,
        staleTime: 30 * 1000,
    });

    const lots = useMemo<InventoryItem[]>(
        () => data?.pages.flatMap(page => page.data ?? []) ?? [],
        [data],
    );

    // ─── Navigation handlers ──────────────────────────────────────────────

    const handleBack = useCallback((): void => {
        navigation.goBack();
    }, [navigation]);

    // Pops all the way back to AssemblyRoot regardless of depth
    const handleHome = useCallback((): void => {
        navigation.popToTop();
    }, [navigation]);

    const handleTitlePress = useCallback((item: InventoryItem): void => {
        navigation.push('subLots', {
            lotId: Number(item.id),
            lotNumber: item.lot_number,
            depth: depth + 1,
        });
    }, [navigation, depth]);

    const handleAction = useCallback((key: ActionKey, itemId: string | number): void => {
        console.log(`Action "${key}" on item ${itemId} at depth ${depth}`);
    }, [depth]);

    // ─── FlatList callbacks ───────────────────────────────────────────────

    const handleEndReached = useCallback((): void => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

    const keyExtractor = useCallback((item: InventoryItem) => String(item.id), []);

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<InventoryItem>) => (
            <LotCard
                item={item} 
                onAction={handleAction}
                onTitlePress={handleTitlePress}
            />
        ),
        [handleAction, handleTitlePress],
    );

    const renderFooter = useCallback(
        () => (isFetchingNextPage ? <Loading /> : null),
        [isFetchingNextPage],
    );

    const renderEmpty = useCallback(
        () => (isLoading ? null : <Empty title="No child lots found" />),
        [isLoading],
    );

    const handleRefresh = useCallback(() => refetch(), [refetch]);

    // ─── Render ───────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* ── Custom header with back + home ── */}
            <View style={styles.header}>

                {/* Back — always goes 1 step back */}
                <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
                    <Text style={styles.backButtonText}><Icon name="chevron-left" size={28} color={colors.gray900} /></Text>
                </TouchableOpacity>

                {/* Title — truncated lot number */}
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {lotNumber}
                    </Text>
                    {depth > 0 && (
                        <Text style={styles.headerDepth}>Level {depth + 1}</Text>
                    )}
                </View>

                {/* Home — always pops to root */}
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={handleHome}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon name="home" size={20} color={colors.gray900} />
                </TouchableOpacity>

            </View>

            {/* ── Child lots list ── */}
            {isLoading && lots.length === 0 ? (
                <Loading />
            ) : (
                <FlatList<InventoryItem>
                    data={lots}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>CHILD LOTS</Text>
                            <Text style={styles.listCount}>{lots.length} items</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching && !isLoading}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // ── Header ──
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
    headerBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    backButtonText: { fontSize: 24, color: '#111813' },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    headerDepth: { fontSize: 10, color: '#94A3B8', letterSpacing: 0.5, marginTop: 1 },

    // ── List ─
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 },
    listTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, color: '#64748B' },
    listCount: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
});

export default AssemblySubLots;