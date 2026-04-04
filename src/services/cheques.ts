import { Cheque, InstallmentData } from '../types/cheques';
import { toDateString } from '../utils/stringUtils';
import api from './api';
export const getCheques = async (filters?: any): Promise<Cheque[]> => {
  try {
    // Build query parameters from filters
    const params: any = {};

    if (filters?.date) {
      params.date = filters.date;
    }

    if (filters?.searchQuery) {
      params.query = filters.searchQuery;
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
    params.page = filters.page ?? 1;
    const response = await api.get<any>('/cheques-list', {
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

export const getChequeInstallments = async (
  cheque: Cheque,
): Promise<InstallmentData> => {
  try {
    const response = await api.get<{ data: InstallmentData }>(
      `/cheque-instalment/${cheque.id}`,
    );
    return response.data.data;
  } catch (error: any) {
    throw (
      error.response?.data ?? {
        message: error.message ?? 'Failed to get installments',
      }
    );
  }
};

export const updateCheque = async (
  cheque: any,
  action: string,
): Promise<any> => {
  try {
    const response = await api.post('/update-cheque', {
      cheque_id: cheque.id,
      action,
    });
    return response.data;
  } catch (error: any) {
    console.error('updateCheque error:', error);
    throw error;
  }
};

export const recordInstallment = async (
  cheque: any,
  amount: number,
  account_id: number | undefined,
): Promise<any> => {
  try {
    const response = await api.post('/store-installment', {
      cheque_id: cheque.id,
      amount,
      account_id,
    });
    return response.data;
  } catch (error: any) {
    console.error('updateCheque error:', error);
    throw error;
  }
};
