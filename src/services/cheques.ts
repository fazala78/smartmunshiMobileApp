import { Cheque, ChequeStatusSummary, ContactChequeListItem, InstallmentData } from '../types/cheques';
import { toDateString } from '../utils/stringUtils';
import api from './api';

/** Builds the shared `cheques-list` / `cheque-status` query params from the screen filters. */
const buildChequeFilterParams = (filters?: any): Record<string, any> => {
  const params: Record<string, any> = {};

  if (filters?.date) {
    params.date = filters.date;
  }

  if (filters?.searchQuery) {
    params.query = filters.searchQuery;
  }

  if (filters?.status) {
    params.status = filters.status;
  }

  if (filters?.accounts && filters.accounts.length > 0) {
    params.accounts = filters.accounts.join(',');
  }

  if (filters?.contacts && filters.contacts.length > 0) {
    params.contacts = filters.contacts.join(',');
  }

  if (filters?.clearing_date) {
    params.clearing_date = toDateString(filters.clearing_date);
  }

  return params;
};

export const getCheques = async (filters?: any): Promise<Cheque[]> => {
  try {
    const params = buildChequeFilterParams(filters);
    params.page = filters?.page ?? 1;
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

export const getChequeStatus = async (
  filters?: any,
): Promise<ChequeStatusSummary> => {
  try {
    const response = await api.get<ChequeStatusSummary>('/cheque-status', {
      params: buildChequeFilterParams(filters),
    });
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get cheque status',
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
  date?: string,
): Promise<any> => {
  try {
    const response = await api.post('/update-cheque', {
      cheque_id: cheque.id,
      action,
      date,
    });
    return response.data;
  } catch (error: any) {
    console.error('updateCheque error:', error);
    throw error;
  }
};

/**
 * Get the cheque list backing one of the contact-ledger cheque-summary cards
 * (e.g. the "Pending Cheques" or "Partial Cheques" card).
 * @param contactId - Contact ID
 * @param status - Route status segment, e.g. "pending" | "partial"
 */
export const getContactChequeList = async (
  contactId: number,
  status: string,
): Promise<ContactChequeListItem[]> => {
  try {
    const response = await api.get<{ data: ContactChequeListItem[] }>(
      `/contact-cheque-list/${contactId}/${status}`,
    );
    return response.data.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get cheque list',
      }
    );
  }
};

/**
 * Get the cheque list backing one of the account-ledger cheque-summary cards.
 * @param accountId - Bank account ID
 * @param status - Route status segment (raw `cheque_status`, e.g. "unsettled" | "partial")
 */
export const getAccountChequeList = async (
  accountId: number,
  status: string,
): Promise<ContactChequeListItem[]> => {
  try {
    const response = await api.get<{ data: ContactChequeListItem[] }>(
      `/account-cheque-list/${accountId}/${status}`,
    );
    return response.data.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get cheque list',
      }
    );
  }
};

export const recordInstallment = async (
  cheque: any,
  amount: number,
  account_id: number | undefined,
  date?: string,
): Promise<any> => {
  try {
    const response = await api.post('/store-installment', {
      cheque_id: cheque.id,
      amount,
      account_id,
      date,
    });
    return response.data;
  } catch (error: any) {
    console.error('updateCheque error:', error);
    throw error;
  }
};
