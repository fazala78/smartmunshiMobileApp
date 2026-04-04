import { PaymentPayload } from '../types/payments';
import { BankReceipt, PaymentResource } from '../types/receipt';
import api from './api';

export const getBankPaymentTransactions = async (
  route: string,
  filters?: any,
): Promise<any[]> => {
  try {
    // Build query parameters from filters
    const params: any = {};
    if (filters?.date) {
      params.date = filters.date;
    }
    if (filters?.payment_method) {
      params.payment_method = filters.payment_method;
    }
    if (filters?.searchQuery) {
      params.query = filters.searchQuery;
    }

    if (filters?.accounts && filters.accounts.length > 0) {
      params.accounts = filters.accounts
        .map((item: string) => item.split('_')[0])
        .join(',');
    }
    params.page = filters.page ?? 1;
    const response = await api.get<any>(route, {
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

export const deletePayment = async (transaction_id: number): Promise<any> => {
  try {
    const response = await api.delete(`/bank-payment/${transaction_id}`);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const getPaymentMethods = async (route: string): Promise<any[]> => {
  try {
    const response = await api.get('/payment-modes/' + route, {});
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const createBankPayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/bank-payment', payload);
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

export const getBankReceipt = async (
  type: string,
  id: number,
): Promise<BankReceipt> => {
  try {
    const response = await api.get(type + '/' + id);
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

export const fetchBankPaymentHtml = async (
  transaction_id: number,
): Promise<string> => {
  try {
    const response = await api.get(`/bank-payment/${transaction_id}/html`, {
      headers: { Accept: 'text/html' },
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
