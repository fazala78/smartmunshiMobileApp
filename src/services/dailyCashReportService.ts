import { CashReportResponse } from '../types/dailyCashReport';
import api from './api';

export const getCashReport = async (
  filters?: any,
): Promise<CashReportResponse> => {
  try {
    // Build query parameters from filters
    const params: any = {};

    if (filters?.date) {
      params.date = filters.date;
    }

    if (filters?.searchQuery) {
      params.search = filters.searchQuery;
    }

    if (filters?.transactionTypes && filters.transactionTypes.length > 0) {
      params.transaction_types = filters.transactionTypes.join(',');
      // Or if your API expects an array:
      // params.transaction_types = filters.transactionTypes;
    }

    if (filters?.debitAccounts && filters.debitAccounts.length > 0) {
      params.debit_account = filters.debitAccounts.join(',');
      // Or if your API expects an array:
      // params.debit_accounts = filters.debitAccounts;
    }

    if (filters?.creditAccounts && filters.creditAccounts.length > 0) {
      params.credit_account = filters.creditAccounts.join(',');
      // Or if your API expects an array:
      // params.credit_accounts = filters.creditAccounts;
    }

    const response = await api.get<any>('/daily-cash-report', {
      params,
    });
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get journals',
      }
    );
  }
};
