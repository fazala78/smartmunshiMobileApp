import { useEffect, useState } from 'react';
import { Currency } from '../types/contact';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const formatBalance = (amount: number, currency?: Currency) => {
  if (!currency) return Math.abs(amount).toFixed(0);

  const value = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return currency.format === 'prefix'
    ? `${currency.symbol} ${value}`
    : `${value} ${currency.symbol}`;
};

export default function useCurrency() {
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    const loadCurrencies = async () => {
      const stored = await AsyncStorage.getItem('currencies');
      if (stored) {
        const currencies: Currency[] = JSON.parse(stored);
        const found = currencies.find(c => c.default === 1);
        setDefaultCurrency(found || null);
      }
    };

    loadCurrencies();
  }, []);

  return defaultCurrency;
}
