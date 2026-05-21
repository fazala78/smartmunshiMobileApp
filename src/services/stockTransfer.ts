import api from './api';

export const transferStock = async (payload: any): Promise<any> => {
  try {
    const response = await api.post('/inter-branch-transfers', payload);
    return response.data.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};
