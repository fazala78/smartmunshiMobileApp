import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import useCurrency from '../utils/currency';
import DatePicker from '../components/DatePicker';
import Filter from '../components/Filter';
import Header from '../components/ui/Header';
import FilterModal from '../components/FilterModal';
import ApiDropdown from '../components/ui/ApiDropdown';
import DatePickerField from '../components/DatePickerField';
import { chequeQueryParams } from '../types/chques';
import { getCheques } from '../services/cheques';
import Error from '../components/common/Error';
import Loading from '../components/common/Loading';
import Empty from '../components/common/Empty';
import ChequeCard, { Cheque, ChequeAction, ChequeStatus } from '../components/ChequeCard';
import FilterTabs from '../components/FilterTabs';
// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: string; label: string }[] = [
    { key: 'unsettled', label: 'Pending' },
    { key: 'installment', label: 'Partial paid cheques' },
    { key: 'cleared', label: 'Cleared' },
    { key: 'partial', label: 'Partial' },
    { key: 'issued', label: 'Paid' },
    { key: 'clearing', label: 'Clearing' },
    { key: 'handed_over', label: 'Forwarded' },
];

// ─── Action builder — returns different buttons per status ────────────────────

const buildActions = (
    status: ChequeStatus,
    onClear: (id: number) => void,
    onBounce: (id: number) => void,
    onReturn: (id: number) => void,
    onReopen: (id: number) => void,
): ChequeAction[] => {
    switch (status) {
        case 'unsettled':
        case 'pending':
            // Pending: can Clear, Bounce, or Return
            return [
                { label: 'Clear', icon: 'check-circle', color: '#22c55e', onPress: onClear },
                { label: 'Bounce', icon: 'cancel', color: '#ef4444', onPress: onBounce },
                { label: 'Return', icon: 'undo', color: '#f59e0b', onPress: onReturn },
            ];
        case 'bounced':
            // Bounced: can only Reopen or Return
            return [
                { label: 'Reopen', icon: 'refresh', color: '#6366f1', onPress: onReopen },
                { label: 'Return', icon: 'undo', color: '#f59e0b', onPress: onReturn },
            ];
        case 'clearing':
            // Clearing: can Clear or Bounce
            return [
                { label: 'Clear', icon: 'check-circle', color: '#22c55e', onPress: onClear },
                { label: 'Bounce', icon: 'cancel', color: '#ef4444', onPress: onBounce },
            ];
        case 'cleared':
        case 'issued':
            // Settled: only Return makes sense
            return [
                { label: 'Return', icon: 'undo', color: '#f59e0b', onPress: onReturn },
            ];
        case 'handed_over':
            // Forwarded: can Reopen or Return
            return [
                { label: 'Reopen', icon: 'refresh', color: '#6366f1', onPress: onReopen },
                { label: 'Return', icon: 'undo', color: '#f59e0b', onPress: onReturn },
            ];
        default:
            // installment / partial — Clear or Bounce
            return [
                { label: 'Clear', icon: 'check-circle', color: '#22c55e', onPress: onClear },
                { label: 'Bounce', icon: 'cancel', color: '#ef4444', onPress: onBounce },
            ];
    }
};

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ChequeList'>;
};

const ChequeListScreen: React.FC<Props> = ({ navigation }) => {

    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<chequeQueryParams>({
        searchQuery: '', contacts: [], accounts: [],clearing_date:'', status: 'unsettled',
    });
    const [draftFilters, setDraftFilters] = useState<chequeQueryParams>({ ...filters });

    const currency = useCurrency();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['cheques-list', filters],
        queryFn: () => getCheques(filters),
        staleTime: 30_000,
    });

    const cheques: Cheque[] = data ?? [];

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleClear = useCallback((id: number) => { /* api call */ }, []);
    const handleBounce = useCallback((id: number) => { /* api call */ }, []);
    const handleReturn = useCallback((id: number) => { /* api call */ }, []);
    const handleReopen = useCallback((id: number) => { /* api call */ }, []);
    const handlePress = useCallback((item: Cheque) => {
        // navigation.navigate('ChequeDetail', { id: item.id });
    }, []);

    // ── Filter handlers ───────────────────────────────────────────────────────
    const handleOpenFilters = useCallback(() => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        const reset: chequeQueryParams = {
            searchQuery: '', contacts: [], accounts: [], status: 'unsettled', date: filters.date,
        };
        setDraftFilters(reset);
        setFilters(reset);
    }, [filters.date]);

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            <Header title="Cheques" navigation={navigation} />

            <Filter
                placeHolder="Search cheques..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

            <DatePicker onDateChange={(date) => setFilters((p: any) => ({ ...p, date }))} />

            {/* Status filter chips */}
            <FilterTabs
                tabs={STATUS_FILTERS}
                value={filters.status}
                onChange={(key) => setFilters((prev) => ({ ...prev, status: key }))}
            />

            {/* List section header */}
            <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderText}>Cheque Results</Text>
                {cheques.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{cheques.length}</Text>
                    </View>
                )}
            </View>

            {/* States */}
            {isLoading && <Loading />}
            {isError && !isLoading && <Error refetch={refetch} />}
            {!isLoading && !isError && cheques.length === 0 && <Empty title="No cheques found" />}

            {/* List */}
            {!isLoading && !isError && cheques.length > 0 && (
                <FlatList
                    data={cheques}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.flatList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <ChequeCard
                            item={item}
                            currency={currency}
                            onPress={handlePress}
                            actions={buildActions(
                                item.status,
                                handleClear,
                                handleBounce,
                                handleReturn,
                                handleReopen,
                            )}
                        />
                    )}
                />
            )}

            {/* Filter Modal */}
            <FilterModal
                visible={showFilterModal}
                title="Filter Cheques"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <View style={styles.filterSection}>
                    <ApiDropdown
                        label="Contact"
                        url="/contacts"
                        value={draftFilters.contacts}
                        multiple
                        zIndex={2000}
                        onValueChange={(v) =>
                            setDraftFilters((p: any) => ({ ...p, contacts: v as string[] }))
                        }
                    />
                </View>
                <View style={styles.filterSection}>
                    <ApiDropdown
                        label="Account"
                        url="/search-account"
                        value={draftFilters.accounts}
                        multiple
                        onValueChange={(v) =>
                            setDraftFilters((p: any) => ({ ...p, accounts: v as string[] }))
                        }
                    />
                </View>
                <View style={styles.filterSection}>
                    <DatePickerField
                        label="Clearing Date"
                        value={(draftFilters as any).clearing_date ?? null}
                        onChange={(d) => setDraftFilters((p: any) => ({
                            ...p,
                            clearing_date: d ? d : undefined,
                        }))}
                        placeholder="Select date"
                        inputBg={colors.backgroundLight}
                    />
                </View>
            </FilterModal>

        </SafeAreaView>
    );
};

export default ChequeListScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    listHeaderText: { fontSize: 11, fontWeight: '800', color: '#61896f', letterSpacing: 2, textTransform: 'uppercase' },
    countBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    countText: { fontSize: 11, fontWeight: '800', color: colors.primary },
    flatList: { flex: 1 },
    listContent: { paddingHorizontal: 12, paddingBottom: 40, gap: 10 },
    filterSection: { marginBottom: 15 },
});