import { PaymentPayload } from '../types/payments';
import { ExpenseSlip } from '../types/receipt';
import api from './api';

export const getExpensePaymentTransactions = async (
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

    if (filters?.expense_account && filters.expense_account.length > 0) {
      params.expense_account = filters.expense_account
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
    const response = await api.delete(`/expenses/${transaction_id}`);
    return response.data;
  } catch (error: any) {
    console.log('deleteTransaction error:', error);
    throw error;
  }
};

export const getPaymentMethods = async (route: string): Promise<any[]> => {
  try {
    const response = await api.get('/payment-modes/' + route, {});
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

export const getExpense = async (
  type: string,
  id: number,
): Promise<ExpenseSlip> => {
  try {
    const response = await api.get(type + '/' + id);
    console.log('📦 Raw API Response:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

export const fetchExpenseHtml = async (
  transaction_id: number,
): Promise<string> => {
  try {
    const response = await api.get(`/expenses/${transaction_id}/html`, {
      headers: { Accept: 'text/html' },
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const createExpense = async (
  payload: PaymentPayload,
): Promise<ExpenseSlip> => {
  try {
    const response = await api.post('/expenses', payload);
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};
