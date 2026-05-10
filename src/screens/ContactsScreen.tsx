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
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../types/navigation';
import BottomNavigation from '../components/BottomNavigation';
import { fetchCategories, fetchCities, fetchContacts, getContactTypes } from '../services/contactService';
import { Contact, FilterState, FilterChip, ContactCategory, City } from '../types/contact';
import { colors } from '../theme';
import FlexibleDropdown from '../components/ui/FlexibleDropdown';
import ContactProfile from '../components/ui/ContactProfile';
import { formatBalance } from '../utils/currency';
import Filter from '../components/Filter';
import Header from '../components/ui/Header';
import FilterModal from '../components/FilterModal';
import MultiSelectFilter from '../components/MultiSelectChips';
import Empty from '../components/common/Empty';
import Loading from '../components/common/Loading';
import FilterTabs from '../components/FilterTabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Error from '../components/common/Error';
import { FloatingFabButton } from '../components/ui/FloatingFabButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    contactType: 'all',
    cities: [],
    category: [],
  });
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    searchQuery: '',
    contactType: 'all',
    cities: [],
    category: [],
  });

  // Fetch contact types with TanStack Query
  const { data: contactTypes = [] } = useQuery({
    queryKey: ['contactTypes'],
    queryFn: getContactTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch cities with TanStack Query
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch categories with TanStack Query
  const { data: categories = [] } = useQuery<ContactCategory[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Create quick filter chips from contact types
  const quickFilters = useMemo<FilterChip[]>(() => {
    return [
      { key: 'all', label: 'All' },
      ...contactTypes.map((type: string) => ({
        key: type,
        label: type,
      })),
    ];
  }, [contactTypes]);

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
    queryKey: ['contacts', filters],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      console.log('🌐 Fetching page:', pageParam, 'with filters:', filters);
      const filterParams = {
        page: pageParam,
        limit: 10,
        search: filters,
      };
      const response = await fetchContacts(filterParams);
      return response;
    },
    getNextPageParam: (lastPage) => {
      // Fallback to original pagination format
      if (lastPage.pagination) {
        const nextPage = lastPage.pagination.hasNextPage
          ? lastPage.pagination.currentPage + 1
          : undefined;
        return nextPage;
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

  // Flatten contacts from all pages
  const contacts = useMemo(() => {
    const allContacts = data?.pages.flatMap((page) => page.data) ?? [];
    return allContacts;
  }, [data]);

  // City dropdown items
  const cityDropdownItems = useMemo(() => {
    return cities.map((city: City) => ({
      label: city.label,
      value: String(city.id),
    }));
  }, [cities]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleContactPress = useCallback(
    (contact: Contact) => {
      navigation.navigate('ContactLedger', { contact: contact });
    },
    [navigation]
  );

  const handleAddContact = useCallback(() => {
    navigation.navigate('AddContact');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenFilters = useCallback(() => {
    setDraftFilters(filters);
    setShowFilterModal(true);
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    const resetState: FilterState = {
      searchQuery: '',
      contactType: 'all',
      cities: [],
      category: [],
    };
    setDraftFilters(resetState);
    setFilters(resetState);
  }, []);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setShowFilterModal(false);
  };

  const handleCategoryChange = (newSelection: string[]) => {
    setDraftFilters(prev => ({
      ...prev,
      category: newSelection,
    }));
  };




  const renderContactItem = ({ item }: { item: Contact }) => {
    const balanceColor = item.balance < 0 ? colors.error : colors.primary;

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactLeft}>
          <ContactProfile
            avatar={item.avatar}
            name={item.name}
            type={item.type}
          />
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.contactPhone}>{item.phone}</Text>
          </View>
        </View>

        <View style={styles.contactRight}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>BALANCE</Text>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
              {formatBalance(item.balance, item.currency)}
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
      <Header title='Contacts' navigation={null}></Header>

      {/* Search Bar */}
      <Filter placeHolder="Search Contacts..." setFilters={setFilters} filters={filters} handleOpenFilters={handleOpenFilters} />
      {/* Quick Filter Chips */}
      {quickFilters.length > 0 && (
        <View style={styles.filterTabsWrapper}>
          <FilterTabs
            tabs={quickFilters}
            value={filters.contactType}
            onChange={(key) => setFilters((prev) => ({ ...prev, contactType: key }))}
          />
        </View>
      )}

      {isError && !isLoading && <Error refetch={refetch} />}

      {/* Contacts Listcc */}
      {isLoading && contacts.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item, index) => `contact-${item.id}-${index}`}
          contentContainerStyle={styles.contactsList}
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


      {/* Filter Bottom Sheet Modal */}

      <FilterModal
        visible={showFilterModal}
        title="Filter Contacts"
        onClose={() => setShowFilterModal(false)}
        onReset={handleResetFilters}
        onApply={handleApplyFilters}
      >
        {/* City */}
        <View style={styles.filterSection}>
          <FlexibleDropdown
            label="CITY NAME"
            placeholder="Select cities"
            multiple
            searchable
            items={cityDropdownItems}
            value={draftFilters.cities}
            onValueChange={(value) =>
              setDraftFilters(prev => ({
                ...prev,
                cities: value as string[],
              }))
            }
          />
        </View>
        <MultiSelectFilter
          title="CONTACT CATEGORY"
          options={categories}
          valueKey='id'
          labelKey='name'
          selectedValues={draftFilters.category}
          onSelectionChange={handleCategoryChange}
        />

      </FilterModal>


      {/* Bottom Navigation */}
      <BottomNavigation activeRoute="Contacts" />
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
  contactsList: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  contactItem: {
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
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.backgroundDark,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  contactPhone: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  contactRight: {
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

export default ContactsScreen;