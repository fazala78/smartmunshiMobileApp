import { TransactionItem, TransactionsResponse } from '../types/journal';
import api from './api';

/**
 * Get contact transaction types
 * @returns Promise with contact stats
 */

export const getJournalTransactionType = async (): Promise<any[]> => {
  try {
    const response = await api.get<any[]>('/journal-transaction');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};

export const getJournalEntries = async (
  filters?: any,
): Promise<TransactionItem[]> => {
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

    const response = await api.get<TransactionsResponse>('/journals', {
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
