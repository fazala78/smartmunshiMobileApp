import { ProductFormData } from '../types/Product';
import api from './api';

export const createProduct = async (payload: ProductFormData): Promise<any> => {
  try {
    const response = await api.post('/products', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};
