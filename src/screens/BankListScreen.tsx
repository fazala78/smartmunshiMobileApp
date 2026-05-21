import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {  useInfiniteQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../types/navigation';
import BottomNavigation from '../components/BottomNavigation';
import { BankAccount } from '../types/bankList';
import { colors } from '../theme';
import ContactProfile from '../components/ui/ContactProfile';
import { formatBalance } from '../utils/currency';
import Filter from '../components/Filter';
import Header from '../components/ui/Header';
import FilterModal from '../components/FilterModal';
import Empty from '../components/common/Empty';
import Loading from '../components/common/Loading';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Error from '../components/common/Error';
import { FloatingFabButton } from '../components/ui/FloatingFabButton';
import { fetchBanks } from '../services/bankListService';
import AddBankAccountModal from './modals/AddBankAccountModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'bankList'>;
};

const BankListScreen: React.FC<Props> = ({ navigation }) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState<any>({
    searchQuery: '',
  });
  const [draftFilters, setDraftFilters] = useState<any>({
    searchQuery: '',
  });



  // Fetch contacts with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['banks', filters],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const filterParams = {
        page: pageParam,
        limit: 10,
        search: filters,
      };
      const response = await fetchBanks(filterParams);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNextPage) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
    enabled: true,
  });

  // Handle API errors
  React.useEffect(() => {
    if (isError && error) {
      const apiError = error as any;
      if (apiError.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]);
      } else {
        Alert.alert(
          'Error',
          apiError.response?.data?.message || 'Failed to load contacts. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [isError, error, navigation]);

  const accounts = useMemo<BankAccount[]>(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);


  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleContactPress = useCallback(
    (account: BankAccount) => {
     navigation.navigate('AccountLedger', { account });
    },
    [navigation]
  );

  const handleAddContact = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleOpenFilters = useCallback(() => {
    setDraftFilters(filters);
    setShowFilterModal(true);
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    const resetState: any = {
      searchQuery: '',
    };
    setDraftFilters(resetState);
    setFilters(resetState);
  }, []);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setShowFilterModal(false);
  };





  const renderContactItem = ({ item }: { item: BankAccount }) => {
    const balanceColor = item.balance < 0 ? colors.error : colors.primary;

    return (
      <TouchableOpacity
        style={styles.bankItem}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bankLeft}>
          <ContactProfile
            name={item.name}
          />
          <View style={styles.bankInfo}>
            <Text style={styles.bankName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.bankCode}>{item.code}</Text>
          </View>
        </View>

        <View style={styles.bankRight}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>BALANCE</Text>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
              {formatBalance(item.balance)}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#61896f" />
        </View>
      </TouchableOpacity>
    );
  };


  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <Loading />
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <Empty title="No contacts found" />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <Header title='Banks' navigation={navigation}></Header>

      {/* Search Bar */}
      <Filter placeHolder="Search banks..." setFilters={setFilters} filters={filters} handleOpenFilters={handleOpenFilters} />
     

      {isError && !isLoading && <Error refetch={refetch} />}

      {/* Accounts List */}
      {isLoading && accounts.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={accounts}
          renderItem={renderContactItem}
          keyExtractor={(item, index) => `contact-${item.id}-${index}`}
          contentContainerStyle={styles.bankList}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
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

      {/* Floating Add Button */}
      <FloatingFabButton onPress={handleAddContact} />


      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => refetch()}
      />

      {/* Filter Bottom Sheet Modal */}

      <FilterModal
        visible={showFilterModal}
        title="Filter Contacts"
        onClose={() => setShowFilterModal(false)}
        onReset={handleResetFilters}
        onApply={handleApplyFilters}
      >
        {/* City */}
        <Text style={styles.filterSection}>No Filter Available</Text>
       

      </FilterModal>


      {/* Bottom Navigation */}
      <BottomNavigation activeRoute="Menu" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  filterTabsWrapper: {
    height: 52,      // matches FilterTabs row height exactly
    flexShrink: 0,       // FlatList cannot compress this wrapper
  },

  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipsList: {
    flexGrow: 0,
    backgroundColor: colors.white,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 5,
    gap: 12,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111813',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#61896f',
    fontWeight: '500',
  },
  bankList: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 75,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundLight,
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  bankInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.backgroundDark,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  bankCode: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  bankRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPlaceholder,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textPlaceholder,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.backgroundDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPlaceholder,
    letterSpacing: 1,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textPlaceholder,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(19, 236, 91, 0.2)',
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPlaceholder,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textPlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  applyButton: {
    flex: 2,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default BankListScreen;