import { CashTransferPayload } from '../types/cashTransfer';
import api from './api';

export const cashTransfer = async (
  payload: CashTransferPayload,
): Promise<any> => {
  try {
    const response = await api.post('/cash-transfer', payload);
    return response.data.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};
