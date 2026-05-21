import { AccountTransactionPaginatedResponse, BankAccountPaginatedResponse, CreateBankAccountPayload } from '../types/bankList';
import { SuccessResponse } from '../screens/modals/SuccessModal';
import api from './api';

export const fetchBanks = async (
  filters: any = {},
): Promise<BankAccountPaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
    };

    if (filters.search?.searchQuery?.trim()) {
      params.search = filters.search.searchQuery.trim();
    }

    const response = await api.get('/banks-list', { params });
    const responseData = response.data;

    // Laravel paginator response (current_page at root level)
    if (responseData.data && responseData.current_page !== undefined) {
      return {
        data: responseData.data,
        pagination: {
          currentPage: responseData.current_page,
          totalPages: responseData.last_page,
          totalItems: responseData.total,
          itemsPerPage: responseData.per_page,
          hasNextPage: responseData.next_page_url !== null,
          hasPreviousPage: responseData.prev_page_url !== null,
        },
      };
    }

    return {
      data: Array.isArray(responseData) ? responseData : [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 15,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  } catch (error: any) {
    throw error;
  }
};

export const createBankAccount = async (
  payload: CreateBankAccountPayload,
): Promise<SuccessResponse> => {
  const response = await api.post('/bank-accounts', payload);
  return response.data;
};

export const getAccountTransactions = async (
  accountId: number,
  params: any,
): Promise<AccountTransactionPaginatedResponse> => {
  const { page, search } = params;
  try {
    const queryParams: any = { page, per_page: 15 };

    if (search?.fromDate) queryParams.from_date = search.fromDate;
    if (search?.toDate)   queryParams.to_date   = search.toDate;
    if (search?.type && search.type !== 'all') queryParams.type = search.type;

    const response = await api.get(`/account-ledger/${accountId}`, { params: queryParams });
    const { data, meta } = response.data;

    return {
      data,
      pagination: {
        currentPage:    meta.current_page,
        totalPages:     meta.last_page,
        totalItems:     meta.total,
        itemsPerPage:   meta.per_page,
        hasNextPage:    meta.current_page < meta.last_page,
        hasPreviousPage: meta.current_page > 1,
      },
    };
  } catch (error: any) {
    throw error;
  }
};
