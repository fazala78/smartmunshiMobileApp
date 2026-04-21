import { PaginatedResponse, Processes } from '../types/assembly';
import api from './api';

export const getProcesses = async (): Promise<Processes[]> => {
  try {
    const response = await api.get<Processes[]>('/processes');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};

export const fetchLots = async (
  filters: any = {},
): Promise<PaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    // Add search query
    if (filters.search && filters.search.searchQuery.trim()) {
      params.search = filters.search.searchQuery.trim();
    }

    // Add contact type filter
    if (filters.search?.lotStatus && filters.search.lotStatus !== 'all') {
      params.type = filters.search.lotStatus;
    }

    if (filters.search?.processes && filters.search.processes.length > 0) {
      params.processes = filters.search.processes;
    }

    params.isSubLot = filters.search.isSubLot;

    const response = await api.get('/lots', { params });

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
export const fetchSubLots = async (
  lot_id: number,
  filters: any = {},
): Promise<PaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };

    if (filters.search?.searchQuery?.trim()) {
      params.search = filters.search.searchQuery.trim();
    }

    if (filters.search?.lotStatus && filters.search.lotStatus !== 'all') {
      params.type = filters.search.lotStatus;
    }

    if (filters.search?.processes?.length > 0) {
      params.processes = filters.search.processes;
    }

    const response = await api.get(`/lots/${lot_id}`, { params });
    const r = response.data;

    // ── Format 1: Laravel pagination with `meta` wrapper
    if (r.data && r.meta?.current_page !== undefined) {
      return {
        data: r.data,
        pagination: {
          currentPage: r.meta.current_page,
          totalPages: r.meta.last_page,
          totalItems: r.meta.total,
          itemsPerPage: r.meta.per_page,
          hasNextPage: r.meta.current_page < r.meta.last_page,
          hasPreviousPage: r.meta.current_page > 1,
        },
      };
    }

    // ── Format 2: Laravel default paginator (fields at root level)
    if (r.data && r.current_page !== undefined) {
      return {
        data: r.data,
        pagination: {
          currentPage: r.current_page,
          totalPages: r.last_page,
          totalItems: r.total,
          itemsPerPage: r.per_page,
          hasNextPage: r.next_page_url !== null,
          hasPreviousPage: r.prev_page_url !== null,
        },
      };
    }

    // ── Format 3: plain array
    if (Array.isArray(r)) {
      return {
        data: r,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: r.length,
          itemsPerPage: r.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // ── Fallback
    return {
      data: r.data ?? r.contacts ?? [],
      pagination: {
        currentPage: r.current_page ?? r.page ?? 1,
        totalPages: r.last_page ?? r.totalPages ?? 1,
        totalItems: r.total ?? r.totalItems ?? 0,
        itemsPerPage: r.per_page ?? r.limit ?? 10,
        hasNextPage: !!r.next_page_url,
        hasPreviousPage: !!r.prev_page_url,
      },
    };
  } catch (error: any) {
    throw error;
  }
};
