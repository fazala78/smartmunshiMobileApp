import { PaymentPayload } from '../types/payments';
import { PaymentResource } from '../types/receipt';
import api from './api';
export const getPaymentMethods = async (route: string): Promise<any[]> => {
  try {
    const response = await api.get('/payment-modes/' + route, {});
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

export const getReceivePaymentTransactions = async (
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

    if (filters?.contacts && filters.contacts.length > 0) {
      params.contacts = filters.contacts
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

export const createPaidPayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/pay-payments', payload);
    return response.data.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const deletePayment = async (
  transaction_id: number,
  route: string,
): Promise<any> => {
  try {
    const response = await api.delete(`/${route}/${transaction_id}`);
    return response.data;
  } catch (error: any) {
    console.log('deleteTransaction error:', error);
    throw error;
  }
};

export const getReceipt = async (
  type: string,
  id: number,
): Promise<PaymentResource> => {
  try {
    const response = await api.get(type + '/' + id);
    console.log('📦 Raw API Response:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

export const fetchReceiptHtml = async (
  route: string,
  transaction_id: number,
): Promise<string> => {
  try {
    const response = await api.get(`/${route}/${transaction_id}/html`, {
      headers: { Accept: 'text/html' },
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const createReceivePayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/receive-payments', payload);
    return response.data.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};
