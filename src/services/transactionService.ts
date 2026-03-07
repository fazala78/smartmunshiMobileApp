import { ContactForm } from '../types/contact';
import { Inventory } from '../types/Inventory';
import { PaymentPayload } from '../types/payments';
import {
  BankReceipt,
  ExpenseSlip,
  JournalSlip,
  PaymentResource,
} from '../types/receipt';
import api from './api';
/**
 * Fetch contacts with filters and pagination
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
/**
 * Fetch contacts with filters and pagination
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
export const getInvoice = async (type: string, id: number): Promise<any> => {
  try {
    const response = await api.get(type + '/' + id);
    console.log('📦 Raw API Response:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
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

export const getJournalEntry = async (
  type: string,
  id: number,
): Promise<JournalSlip> => {
  try {
    const response = await api.get(type + '/' + id);
    console.log('📦 Raw API Response:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

export const getBankReceipt = async (
  type: string,
  id: number,
): Promise<BankReceipt> => {
  try {
    const response = await api.get(type + '/' + id);
    console.log('📦 Raw API Response:', response.data.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
};

// services/inventoryService.ts

export const createInvoice = async (payload: Inventory): Promise<any> => {
  try {
    const response = await api.post('/invoice', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createPurchase = async (payload: Inventory): Promise<any> => {
  try {
    const response = await api.post('/purchases', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createSaleReturn = async (payload: Inventory): Promise<any> => {
  try {
    const response = await api.post('/sale-returns', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createPurchaseReturn = async (
  payload: Inventory,
): Promise<any> => {
  try {
    const response = await api.post('/purchase-returns', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createReceivePayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/receive-payments', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createPaidPayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/pay-payments', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createExpense = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/expenses', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

export const createBankPayment = async (
  payload: PaymentPayload,
): Promise<PaymentResource> => {
  try {
    const response = await api.post('/bank-payment', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};
