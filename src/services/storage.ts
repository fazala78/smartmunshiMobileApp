import { MMKV } from 'react-native-mmkv';
import { Contact } from '../types/contact';
import { Cart } from '../types/Inventory';

let storage: MMKV | null = null;

const getStorage = (): MMKV => {
  if (!storage) {
    storage = new MMKV({ id: 'appStorage' });
  }
  return storage;
};

export const setJson = (key: string, data: unknown): void => {
  try {
    getStorage().set(key, JSON.stringify(data));
    console.log('data store');
  } catch (error) {
    console.error(`Failed to write ${key} to MMKV`, error);
  }
};

export const getJson = <T>(key: string): T | null => {
  try {
    const value = getStorage().getString(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error(`Failed to read ${key} from MMKV`, error);
    return null;
  }
};

export const deleteItem = (key: string): void => {
  try {
    getStorage().delete(key);
  } catch (error) {
    console.error(`Failed to delete ${key} from MMKV`, error);
  }
};

export const getAllContacts = (): Contact[] => {
  return getJson<Contact[]>('contacts:all') ?? [];
};

export const searchContacts = (query: string): Contact[] => {
  const contacts = getAllContacts();
  if (!query.trim()) return contacts;
  const lower = query.toLowerCase().trim();
  return contacts.filter(c => c.name?.toLowerCase().includes(lower));
};

export const getAllProducts = (): Cart[] => {
  return getJson<Cart[]>('products:all') ?? [];
};

export const searchProducts = (query: string): Cart[] => {
  const products = getAllProducts();
  if (!query.trim()) return products;
  const lower = query.toLowerCase().trim();
  return products.filter(
    p => p.name?.toLowerCase().includes(lower),
    ///|| p.sku?.toLowerCase().includes(lower), // ← SKU search too
  );
};

// ── Sync time tracking ──────────────────────────────────────────────────────
export const setSyncTime = (key: string, timestamp: string): void => {
  try {
    getStorage().set(key, timestamp);
  } catch (error) {
    console.error(`Failed to write sync time ${key}`, error);
  }
};

export const getSyncTime = (key: string): string | null => {
  try {
    return getStorage().getString(key) || null;
  } catch (error) {
    console.error(`Failed to read sync time ${key}`, error);
    return null;
  }
};

export const getLastContactsSyncTime = (): string | null => {
  return getSyncTime('lastContactsSyncTime');
};

export const setLastContactsSyncTime = (timestamp: string): void => {
  setSyncTime('lastContactsSyncTime', timestamp);
};

export const getLastProductsSyncTime = (): string | null => {
  return getSyncTime('lastProductsSyncTime');
};

export const setLastProductsSyncTime = (timestamp: string): void => {
  setSyncTime('lastProductsSyncTime', timestamp);
};

// ─── Clear all storage ─────────────────────────────────────────────────────────
export const clearAllStorage = (): void => {
  try {
    getStorage().clearAll();
    console.log('All MMKV storage cleared');
  } catch (error) {
    console.error('Failed to clear all MMKV storage', error);
  }
};

export const clearSyncTimes = (): void => {
  try {
    deleteItem('lastContactsSyncTime');
    deleteItem('lastProductsSyncTime');
    console.log('Sync times cleared');
  } catch (error) {
    console.error('Failed to clear sync times', error);
  }
};
