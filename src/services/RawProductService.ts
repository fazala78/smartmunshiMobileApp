import { ProductTransactionPaginatedResponse } from '../types/Product';
import api from './api';

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

export const fetchRawProducts = async (filters: any = {}): Promise<any> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };

    const searchValue =
      typeof filters.search === 'string'
        ? filters.search.trim()
        : filters.search?.searchQuery?.trim();

    if (searchValue) {
      params.search = searchValue;
    }

    if (filters.search?.lots && filters.search.lots.length > 0) {
      params.lot = filters.search.lots
        .map((lot: any) => {
          if (typeof lot === 'object' && lot?.id) {
            return String(lot.id).split('_')[0];
          }

          return String(lot).split('_')[0];
        })
        .filter(Boolean)
        .join(',');
    }

    // Add category filter as comma-separated IDs
    if (filters.search?.contacts && filters.search.contacts.length > 0) {
      params.contact = filters.search.contacts
        .map((contact: any) => {
          if (typeof contact === 'object' && contact?.id) {
            return String(contact.id).split('_')[0];
          }

          return String(contact).split('_')[0];
        })
        .filter(Boolean)
        .join(',');
    }

    const response = await api.get('/raw-products', { params });
    const responseData = response.data;

    // Handle Laravel pagination format
    if (responseData.data && responseData.current_page !== undefined) {
      return {
        data: responseData.data,
        pagination: {
          currentPage: responseData.current_page,
          totalPages: responseData.last_page,
          totalItems: responseData.total,
          itemsPerPage: responseData.per_page,
          hasNextPage: responseData.current_page < responseData.last_page,
          hasPreviousPage: responseData.current_page > 1,
        },
      };
    }

    // Handle nested meta pagination format
    if (responseData.data && responseData.meta?.current_page !== undefined) {
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

    // Fallback response
    return {
      data: responseData.data || [],
      pagination: responseData.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: responseData.data?.length || 0,
        itemsPerPage: responseData.data?.length || 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  } catch (error: any) {
    throw error;
  }
};

export const getRawProductTransactions = async (
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

    const response = await api.get(`/raw-product/${productId}/ledger`, {
      params: queryParams,
    });

    const responseData = response.data;

    // Handle response with data array (with or without meta pagination)
    if (responseData.data && Array.isArray(responseData.data)) {
      const transformedResponse: any = {
        data: responseData.data,
        pagination: {
          currentPage: responseData.meta?.current_page || page || 1,
          totalPages: responseData.meta?.last_page || 1,
          totalItems: responseData.meta?.total || responseData.data.length,
          itemsPerPage: responseData.meta?.per_page || responseData.data.length,
          hasNextPage: responseData.meta
            ? responseData.meta.current_page < responseData.meta.last_page
            : false,
          hasPreviousPage: responseData.meta
            ? responseData.meta.current_page > 1
            : false,
        },
      };
      return transformedResponse;
    }

    // Handle direct array response
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        pagination: {
          currentPage: page || 1,
          totalPages: 1,
          totalItems: responseData.length,
          itemsPerPage: responseData.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    throw new Error('Invalid response format');
  } catch (error: any) {
    throw error.response?.data || { message: error.message || error };
  }
};
