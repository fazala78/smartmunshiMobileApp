import { JournalEntry } from '../types/manualJournalEntry';
import { JournalSlip } from '../types/receipt';
import api from './api';

export const postJournalEntries = async (
  payload: JournalEntry[],
): Promise<any> => {
  try {
    const response = await api.post('/manual-journal-entries', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
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

export const fetchJournalEntry = async (
  transaction_id: number,
): Promise<string> => {
  try {
    const response = await api.get(`/journal-entry/${transaction_id}/html`, {
      headers: { Accept: 'text/html' },
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
