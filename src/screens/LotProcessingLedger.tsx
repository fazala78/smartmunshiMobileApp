import React, { useMemo, useState } from 'react';
import {
    FlatList,
    View,
    StyleSheet,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import Header from '../components/ui/Header';
import Filter from '../components/Filter';
import FilterTabs from '../components/FilterTabs';
import FilterModal from '../components/FilterModal';
import MultiSelectFilter from '../components/MultiSelectChips';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProcesses, fetchLots } from '../services/assemblyService';
import Empty from '../components/common/Empty';
import Loading from '../components/common/Loading';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FetchParams, InventoryItem, LotFilters, Processes } from '../types/assembly';
import BatchCard from '../components/assembly/BatchCard';
import { OverviewCard } from '../components/assembly/OverviewCard';
import { Contact } from '../types/contact';

const LOT_STATUSES = ['All', 'Complete', 'Incomplete'] as const;

type RootStackParamList = {
    lotLedger: {
        contact: Contact;
    };
};

type Props = NativeStackScreenProps<RootStackParamList, 'lotLedger'>;



const LotProcessingLedger: React.FC<Props> = ({ route, navigation }) => {

    // ✅ safer default filters
    const getDefaultFilters = (): LotFilters => ({
        searchQuery: '',
        lotStatus: 'all',
        processes: [],
        contacts: [route.params?.contact?.id + '_contact'],
        isSubLot: true,
        isLedgerScreen:true,

    });

    const [filters, setFilters] = useState<LotFilters>(getDefaultFilters);
    const [draftFilters, setDraftFilters] = useState<LotFilters>(getDefaultFilters);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // ─── Filters ─────────────────────────────────────────────

    const handleOpenFilters = () => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    };

    const handleResetFilters = () => {
        const defaults = getDefaultFilters();
        setDraftFilters(defaults);
        setFilters(defaults);
    };

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    };

 

    const handleProcessChange = (newSelection: string[]) => {
        setDraftFilters(prev => ({ ...prev, processes: newSelection }));
    };

    // ─── Tabs ─────────────────────────────────────────────

    const lotStatusTabs = useMemo(
        () => LOT_STATUSES.map(cat => ({ key: cat.toLowerCase(), label: cat })),
        []
    );

    // ─── Queries ─────────────────────────────────────────────

    const { data: processes = [] } = useQuery<Processes[]>({
        queryKey: ['processes'],
        queryFn: getProcesses,
        staleTime: 5 * 60 * 1000,
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['lots', JSON.stringify(filters)], // ✅ FIXED
        queryFn: async ({ pageParam = 1 }) => {
            const params: FetchParams = {
                page: pageParam,
                limit: 10,
                search: filters,
            };
            return fetchLots(params);
        },
        getNextPageParam: (lastPage) => {
            const pagination = lastPage?.pagination;
            if (!pagination || !pagination.hasNextPage) return undefined;
            return pagination.currentPage + 1;
        },
        initialPageParam: 1,
        staleTime: 30000,
    });

    // ─── Data ─────────────────────────────────────────────

    const lots = useMemo(
        () => data?.pages.flatMap(page => page.data) ?? [],
        [data]
    );

    // ─── List handlers ─────────────────────────────────────

    const handleEndReached = () => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            fetchNextPage();
        }
    };

    const handleRefresh = () => {
        refetch();
    };

    // ─── Render ─────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            <Header title={route.params?.contact?.name} navigation={navigation} />

            <Filter
                placeHolder="Search Lots..."
                filters={filters}
                setFilters={(value) =>
                    setFilters(prev => ({ ...prev, searchQuery: value.searchQuery }))
                }
                handleOpenFilters={handleOpenFilters}
            />


            {/* Tabs */}
            <FilterTabs
                tabs={lotStatusTabs}
                value={filters.lotStatus}
                onChange={(key) =>
                    setFilters(prev => ({ ...prev, lotStatus: key }))
                }
            />

            {/* List */}
            {isLoading && lots.length === 0 ? (
                <Loading />
            ) : (
                <FlatList
                    data={lots}
                    keyExtractor={(item: InventoryItem) => item.id.toString()}
                    renderItem={({ item }) => <BatchCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isFetchingNextPage ? <Loading /> : null}
                    ListEmptyComponent={!isLoading ? <Empty title="No Lots found" /> : null}
                    ListHeaderComponent={<OverviewCard id={route.params?.contact?.id} />}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews
                    initialNumToRender={10}
                    windowSize={5}
                    maxToRenderPerBatch={10}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}

            {/* Filter Modal */}
            <FilterModal
                visible={showFilterModal}
                title="Filter Lots"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
               

                {/* ✅ FIXED */}
                {draftFilters.isSubLot && (
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
        </SafeAreaView>
    );
};

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    toggleRow: {
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray300,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
});

export default LotProcessingLedger;