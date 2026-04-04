import api from './api';

export const getTransactionInventory = async (
  route: string,
  filters?: any,
): Promise<any[]> => {
  try {
    // Build query parameters from filters
    const params: any = {};
    if (filters?.date) {
      params.date = filters.date;
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
    console.log(response);
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Failed to get journals',
      }
    );
  }
};

export const deleteTransaction = async (
  transaction_id: number,
  route: string,
  payload: any,
): Promise<any> => {
  try {
    const response = await api.delete(`/${route}/${transaction_id}`, {
      data: {
        payments: payload.payments,
        sale_return: payload.sale_return,
      },
    });
    return response.data;
  } catch (error: any) {
    console.log('deleteTransaction error:', error);
    throw error;
  }
};

export const fetchInvoiceHTML = async (
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
