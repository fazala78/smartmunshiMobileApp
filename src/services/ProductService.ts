import { Cart } from '../types/Inventory';
import {
  Product,
  ProductFormData,
  ProductTransactionPaginatedResponse,
  ProductTransactionTypes,
} from '../types/Product';
import api from './api';
import { getJson, setJson } from './storage';

const PRODUCTS_CACHE_KEY = 'products:all';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
}
export interface ProductPaginatedResponse<T = any> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const fetchProductsPage = async (
  params: ProductQueryParams & { since?: string } = { page: 1, limit: 30 },
): Promise<ProductPaginatedResponse> => {
  try {
    const apiParams: any = {
      page: params.page ?? 1,
      limit: params.limit ?? 30,
      search: params.search,
    };

    // Add since parameter if provide
    if (params.since) {
      apiParams.since = params.since;
    }

    const response = await api.get('/all-products', {
      params: apiParams,
    });

    const responseData = response.data;
    const data: any[] = Array.isArray(responseData)
      ? responseData
      : responseData.data ?? responseData.products ?? [];

    const pagination = responseData.meta
      ? {
          currentPage: responseData.meta.current_page,
          totalPages: responseData.meta.last_page,
          totalItems: responseData.meta.total,
          itemsPerPage: responseData.meta.per_page,
          hasNextPage:
            responseData.meta.current_page < responseData.meta.last_page,
          hasPreviousPage: responseData.meta.current_page > 1,
        }
      : responseData.pagination || {
          currentPage: responseData.page || 1,
          totalPages: responseData.totalPages || 1,
          totalItems: responseData.total || data.length,
          itemsPerPage: responseData.limit || data.length,
          hasNextPage:
            responseData.current_page != responseData.last_page || false,
          hasPreviousPage: responseData.hasPreviousPage || false,
        };

    return { data, pagination };
  } catch (error: any) {
    throw error;
  }
};

export const fetchAllProducts = async (
  params: Omit<ProductQueryParams, 'page'> & { since?: string } = {
    limit: 30,
    search: '',
  },
): Promise<any[]> => {
  const allProducts: any[] = [];
  let currentPage = 1;
  const since = params.since;

  while (true) {
    const response = await fetchProductsPage({
      ...params,
      page: currentPage,
      since,
    });

    // Filter out items with status === false
    const activeProducts = response.data;
    allProducts.push(...activeProducts);
    console.log(response);
    console.log('response product');
    if (!response.pagination.hasNextPage) break;
    currentPage += 1;
  }

  // Merge with existing cache if doing incremental sync, otherwise replace
  if (since) {
    const cached = getCachedProducts();
    const mergedProducts = [...cached, ...allProducts];
    // Remove duplicates by id
    const uniqueProducts = Array.from(
      new Map(mergedProducts.map(p => [p.id, p])).values(),
    );

    // Remove contacts with status === false from cache
    const activeContacts = uniqueProducts.filter(
      (product: Cart) => (product as any).status !== false,
    );

    setJson(PRODUCTS_CACHE_KEY, activeContacts);
    return uniqueProducts;
  } else {
    setJson(PRODUCTS_CACHE_KEY, allProducts);
    return allProducts;
  }
};

export const getCachedProducts = (): any[] => {
  return getJson<any[]>(PRODUCTS_CACHE_KEY) ?? [];
};

export const createProduct = async (payload: ProductFormData): Promise<any> => {
  try {
    const response = await api.post('/products', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error.response?.data || { message: error.message || error };
  }
};

export const fetchCategories = async (): Promise<ProductCategory[]> => {
  try {
    const response = await api.get('/product-categories', {});
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

export const fetchProducts = async (
  filters: any = {},
): Promise<ProductPaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    // Add search query
    if (filters.search && filters.search.searchQuery.trim()) {
      params.term = filters.search.searchQuery.trim();
    }

    // Add contact type filter
    if (filters.search?.query && filters.search.query !== 'all') {
      params.query = filters.search.query;
    }

    // Add category filter as comma-separated IDs
    if (filters.search?.categories && filters.search.categories.length > 0) {
      params.categories = filters.search.categories
        .map((category: any) => (typeof category === 'object' ? category.id : category))
        .join(',');
    }

    const response = await api.get('/products', { params });

    const responseData = response.data;

    // Handle Laravel pagination format
    if (responseData.data && responseData.meta.current_page !== undefined) {
      return {
        data: responseData.data,
        pagination: {
          currentPage: responseData.meta.current_page,
          totalPages: responseData.meta.last_page,
          totalItems: responseData.meta.total,
          itemsPerPage: responseData.meta.per_page,
          hasNextPage:
            responseData.meta.current_page < responseData.meta.last_page,
          hasPreviousPage: responseData.meta.current_page > 1,
        },
      };
    }

    // Handle direct array response
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: responseData.length,
          itemsPerPage: responseData.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Handle other structured responses
    return {
      data: responseData.data || responseData.contacts || [],
      pagination: responseData.pagination || {
        currentPage: responseData.page || 1,
        totalPages: responseData.totalPages || 1,
        totalItems: responseData.total || 0,
        itemsPerPage: responseData.limit || 10,
        hasNextPage: responseData.hasNextPage || false,
        hasPreviousPage: responseData.hasPreviousPage || false,
      },
    };
  } catch (error: any) {
    throw error;
  }
};

export const adjustStock = async (payload: {
  product: Product;
  adjustment: string;
  date?: string;
}): Promise<any> => {
  try {
    const response = await api.post('/product-adjustment', payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: error.message || error };
  }
};

export const getProductTransactions = async (
  productId: number,
  params: any,
): Promise<ProductTransactionPaginatedResponse> => {
  const { page, search } = params;
  try {
    const queryParams: any = {
      page,
      per_page: 15, // Default to 15 transactions per page
    };

    // Add filters
    if (search?.fromDate) {
      queryParams.from = search.fromDate;
    }

    if (search?.toDate) {
      queryParams.to = search.toDate;
    }

    if (search?.type && search.type !== 'all') {
      queryParams.type = search.type;
    }

    const response = await api.get(`/product/${productId}/ledger`, {
      params: queryParams,
    });

    // Transform Laravel pagination format to our custom format
    const laravelData = response.data;

    const transformedResponse: any = {
      data: laravelData.data,
      pagination: {
        currentPage: laravelData.meta.current_page,
        totalPages: laravelData.meta.last_page,
        totalItems: laravelData.meta.total,
        itemsPerPage: laravelData.meta.per_page,
        hasNextPage: laravelData.meta.current_page < laravelData.meta.last_page,
        hasPreviousPage: laravelData.meta.current_page > 1,
      },
    };

    return transformedResponse;
  } catch (error: any) {
    throw error.response?.data || { message: error.message || error };
  }
};

export const getProductTransactionTypes = async (): Promise<
  ProductTransactionTypes[]
> => {
  try {
    const response = await api.get<ProductTransactionTypes[]>(
      '/product-transactions',
    );
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};
