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
import { fetchCategories, ProductCategory } from '../services/ProductService';
import { FilterChip } from '../types/contact';
import { colors } from '../theme';
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
import { fetchProducts } from '../services/ProductService';
import useCurrency from '../utils/currency';
import { Currency } from '../types/Currency';
import { Product, ProductFilter } from '../types/Product';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'products'>;
};

const ProductsScreen: React.FC<Props> = ({ navigation }) => {
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<ProductFilter>({
        query: 'all',
        searchQuery: '',
        categories: [],
    });
    const [draftFilters, setDraftFilters] = useState<ProductFilter>({
        query: 'all',
        searchQuery: '',
        categories: [],
    });

    const { data: categories = [] } = useQuery<ProductCategory[]>({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
    });

    const quickFilters = useMemo<FilterChip[]>(() => {
        return [
            { key: 'all', label: 'All' },
            { key: 'best_seller', label: 'Best seller' },
            { key: 'low_in_demand', label: 'Low in demand' },
            { key: 'out_of_stock', label: 'Out of stock' },
            { key: 'limited_stock', label: 'Limited stock' },
        ];
    }, []);

    const currency = useCurrency();

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
        queryKey: ['products', filters],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
            const filterParams = {
                page: pageParam,
                limit: 10,
                search: filters,
            };
            const response = await fetchProducts(filterParams);
            return response;
        },
        getNextPageParam: (lastPage) => {
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
                    apiError.response?.data?.message || 'Failed to load products. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        }
    }, [isError, error, navigation]);

    const products = useMemo(() => {
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

    const handleProductPress = useCallback(
        (product: Product) => {
            navigation.navigate('productLedger', { product: product });
        },
        [navigation]
    );

    const handleAddProduct = useCallback(() => {
        navigation.navigate('AddProduct');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenFilters = useCallback(() => {
        setDraftFilters(filters);
        setShowFilterModal(true);
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        const resetState: any = {
            query: 'all',
            searchQuery: '',
            categories: [],
        };
        setDraftFilters(resetState);
        setFilters(resetState);
    }, []);

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilterModal(false);
    };

    const handleCategoryChange = (newSelection: string[]) => {
        setDraftFilters((prev: any) => ({
            ...prev,
            categories: newSelection,
        }));
    };

    const renderProductItem = ({ item }: { item: any }) => {
        const stockColor = item.balance < 0 ? colors.error : colors.primary;

        return (
            <TouchableOpacity
                style={styles.productItem}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.productLeft}>
                    <View style={styles.productIcon}>
                        <Icon name="inventory" size={26} color={colors.primary} />
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.productPrice}>
                            {formatBalance(item.price, currency as Currency)}
                        </Text>
                    </View>
                </View>

                <View style={styles.productRight}>
                    <View style={styles.stockContainer}>
                        <Text style={styles.stockLabel}>{item.unit}</Text>
                        <Text style={[styles.stockAmount, { color: stockColor }]}>
                            {item.balance}
                        </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#61896f" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return <Loading />;
    };

    const renderEmpty = () => {
        if (isLoading) return null;
        return <Empty title="No products found" />;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            <Header title='Products' navigation={navigation} />

            <Filter
                placeHolder="Search Products..."
                setFilters={setFilters}
                filters={filters}
                handleOpenFilters={handleOpenFilters}
            />

            {quickFilters.length > 0 && (
                <View style={styles.filterTabsWrapper}>
                    <FilterTabs
                        tabs={quickFilters}
                        value={filters.query}
                        onChange={(key) => setFilters((prev: any) => ({ ...prev, query: key }))}
                    />
                </View>
            )}

            {isError && !isLoading && <Error refetch={refetch} />}

            {isLoading && products.length === 0 ? (
                <Loading />
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProductItem}
                    keyExtractor={(item, index) => `product-${item.id}-${index}`}
                    contentContainerStyle={styles.productList}
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

            <FloatingFabButton onPress={handleAddProduct} />

            <FilterModal
                visible={showFilterModal}
                title="Filter Products"
                onClose={() => setShowFilterModal(false)}
                onReset={handleResetFilters}
                onApply={handleApplyFilters}
            >
                <MultiSelectFilter
                    title="PRODUCT CATEGORY"
                    options={categories}
                    valueKey='id'
                    labelKey='name'
                    selectedValues={draftFilters.categories}
                    onSelectionChange={handleCategoryChange}
                />
            </FilterModal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    filterTabsWrapper: {
        height: 52,
        flexShrink: 0,
    },
    productList: {
        paddingBottom: 120,
        flexGrow: 1,
    },
    productItem: {
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
    productLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    productIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryMuted,
    },
    productInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.backgroundDark,
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    productPrice: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    productRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stockContainer: {
        alignItems: 'flex-end',
    },
    stockLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textPlaceholder,
        letterSpacing: 0.5,
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    stockAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProductsScreen;