import { toDateString } from '../utils/stringUtils';
import api from './api';
export const getCheques = async (filters?: any): Promise<any[]> => {
  console.log('api called');
  try {
    // Build query parameters from filters
    const params: any = {};

    if (filters?.date) {
      params.date = filters.date;
    }

    if (filters?.searchQuery) {
      params.search = filters.searchQuery;
    }

    if (filters?.status) {
      params.status = filters.status;
      // Or if your API expects an array:
      // params.transaction_types = filters.transactionTypes;
    }

    if (filters?.accounts && filters.accounts.length > 0) {
      params.accounts = filters.accounts.join(',');
      // Or if your API expects an array:
      // params.debit_accounts = filters.debitAccounts;
    }

    if (filters?.contacts && filters.contacts.length > 0) {
      params.contacts = filters.contacts.join(',');
      // Or if your API expects an array:
      // params.credit_accounts = filters.creditAccounts;
    }

    if (filters?.clearing_date) {
      params.clearing_date = toDateString(filters.clearing_date);
      // Or if your API expects an array:
      // params.credit_accounts = filters.creditAccounts;
    }
    const response = await api.get<any>('/cheques-list', {
      params,
    });
    return response.data.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get journals',
      }
    );
  }
};
