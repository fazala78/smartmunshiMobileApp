import { Inventory } from '../types/Inventory';
import { InvoiceReceipt, JournalSlip } from '../types/receipt';
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
export const getInvoice = async (
  type: string,
  id: number,
): Promise<InvoiceReceipt> => {
  try {
    const response = await api.get(type + '/' + id);
    return response.data.data;
  } catch (error: any) {
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

export const getTotalCash = async (): Promise<any> => {
  try {
    const response = await api.get<any>('/total-cash');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get journals',
      }
    );
  }
};
