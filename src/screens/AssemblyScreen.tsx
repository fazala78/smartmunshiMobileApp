import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    View,
    Text,
    StyleSheet,
    StatusBar,
    ListRenderItemInfo,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import { colors } from '../theme/colors';
import Header from '../components/ui/Header';
import Filter from '../components/Filter';
import FilterTabs from '../components/FilterTabs';
import SwitchField from '../components/ui/SwitchField';
import FilterModal from '../components/FilterModal';
import ApiDropdown from '../components/ui/ApiDropdown';
import MultiSelectFilter from '../components/MultiSelectChips';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProcesses, fetchLots } from '../services/assemblyService';
import { FilterChip } from '../types/contact';
import Empty from '../components/common/Empty';
import Loading from '../components/common/Loading';
import LotCard from '../components/assembly/LotCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ActionKey, FetchParams, InventoryItem, LotFilters, Processes } from '../types/assembly';

// ─── Types ────────────────────────────────────────────────────────────────────



// ─── Constants ────────────────────────────────────────────────────────────────

const LOT_STATUSES = ['All', 'Complete', 'Incomplete'] as const;

const DEFAULT_FILTERS: LotFilters = {
    searchQuery: '',
    lotStatus: 'all',
    processes: [],
    contacts: [],
    isSubLot: false,
};

// ─── Component ────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<RootStackParamList, 'Assembly'>;

const AssemblyScreen: React.FC<Props> = ({ navigation }) => {
    const [filters, setFilters] = useState<LotFilters>(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState<LotFilters>(DEFAULT_FILTERS);
    const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

    // ─── Filter handlers ──────────────────────────────────────────────────

    const handleOpenFilters = useCallback((): void => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback((): void => {
        setDraftFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
    }, []);

    const handleApplyFilters = useCallback((): void => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    }, [draftFilters]);

    const handleSwitchLotType = useCallback((value: boolean): void => {
        setFilters(prev => ({ ...prev, lotStatus: 'all', processes: [], isSubLot: value }));
    }, []);

    const handleAction = useCallback((key: ActionKey, itemId: string): void => {
        console.log(`Action "${key}" triggered for item ${itemId}`);
    }, []);

    // ─── Filter tabs ──────────────────────────────────────────────────────

    const lotStatusTabs = useMemo<FilterChip[]>(
        () => LOT_STATUSES.map(cat => ({ key: cat.toLowerCase(), label: cat })),
        [],
    );

    const { data: processes = [] } = useQuery<Processes[]>({
        queryKey: ['processes'],
        queryFn: getProcesses,
        staleTime: 5 * 60 * 1000,
    });



    // ─── Infinite query ───────────────────────────────────────────────────

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['lots', filters],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
            const params: FetchParams = { page: pageParam, limit: 10, search: filters };
            return await fetchLots(params);
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage?.pagination) return undefined;
            return lastPage.pagination.hasNextPage
                ? lastPage.pagination.currentPage + 1
                : undefined;
        },
        initialPageParam: 1,
        staleTime: 30 * 1000,
        enabled: true,
    });



    const lots = useMemo(() => {
        const allLots = data?.pages.flatMap((page) => page.data) ?? [];
        return allLots;
    }, [data]);

    // ─── FlatList callbacks ───────────────────────────────────────────────

    const handleEndReached = useCallback((): void => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

    const keyExtractor = useCallback((item: InventoryItem) => item.id.toString(), []);

     const handleTitlePress = useCallback((item: InventoryItem): void => {
    navigation.navigate('subLots', {
        lotId:     item.id,
        lotNumber: item.lot_number,
        depth:     0,                // root is depth 0
    });
}, [navigation]);

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<InventoryItem>) => {
            console.log('Rendering item:', item); // explicit statement, not comma expression
            return <LotCard item={item} onAction={handleAction}  onTitlePress={handleTitlePress} />;
        },
        [handleAction, handleTitlePress],
    );

    const renderFooter = useCallback(
        () => (isFetchingNextPage ? <Loading /> : null),
        [isFetchingNextPage],
    );

    const renderEmpty = useCallback(
        () => (isLoading ? null : <Empty title="No Lots found" />),
        [isLoading],
    );

    const handleRefresh = useCallback(() => refetch(), [refetch]);

    const handleProcessChange = useCallback((newSelection: string[]): void => {
        setDraftFilters(prev => ({ ...prev, processes: newSelection }));
    }, []);

   

    // ─── Render ───────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            <Header title="Assembly" navigation={null} />

            <Filter
                placeHolder="Search Lots..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

            {/* ── Unified filter block ── */}
            <View>

                {/* Status row — always visible */}
                <FilterTabs
                    tabs={lotStatusTabs}
                    value={filters.lotStatus}
                    onChange={(key) => setFilters(prev => ({ ...prev, lotStatus: key }))}
                />
            </View>

            {/* ── Lot type toggle ── */}
            <View style={styles.toggleRow}>
                <SwitchField
                    labelFalse="Main Lots"
                    labelTrue="Sub-Lots"
                    value={filters.isSubLot}
                    onChange={handleSwitchLotType}
                    colorTrue={colors.primary}
                    colorFalse={colors.primary}
                />
            </View>

            {/* ── List ── */}
            {isLoading && lots.length === 0 ? (
                <Loading />
            ) : (
                <FlatList
                    data={lots}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    ListHeaderComponent={
                        <View style={styles.inventoryHeader}>
                            <Text style={styles.inventoryTitle}>
                                {filters.isSubLot ? 'SUB-LOTS' : 'MAIN LOTS'}
                            </Text>
                            <Text style={styles.itemCount}>{lots.length} items</Text>
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

            {/* ── Filter modal ── */}
            <FilterModal
                visible={showFilterModal}
                title="Filter Lots"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <ApiDropdown
                    label="Contact"
                    url="/contacts"
                    value={draftFilters.contacts}
                    multiple
                    zIndex={2000}
                    onValueChange={(v) =>
                        setDraftFilters(prev => ({ ...prev, contacts: v as string[] }))
                    }
                />

                {filters.isSubLot && (
                    <View style={{ marginTop: 10 }}>
                        <MultiSelectFilter
                            title="Processes"
                            options={processes}
                            valueKey="id"
                            labelKey="name"
                            selectedValues={draftFilters.processes}
                            onSelectionChange={handleProcessChange}
                        />
                    </View>
                )}
            </FilterModal>

            <BottomNavigation activeRoute="Home" />
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    toggleRow: { backgroundColor: colors.white , paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
    inventoryTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, color: '#64748B' },
    itemCount: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },

    // ── Unified filter block ──
    filterRow: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16 },
    filterRowAlt: { backgroundColor: '#F8FAFC' },
    filterRowLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#94A3B8', textTransform: 'uppercase', width: 52 },
    filterRowDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginRight: 12 },
    filterRowSeparator: { height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
});

export default AssemblyScreen;