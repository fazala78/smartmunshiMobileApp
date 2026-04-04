import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useConfiguration() {
  const [configuration, setConfiguration] = useState<any>(null);
  useEffect(() => {
    const loadConfiguration = async () => {
      const stored = await AsyncStorage.getItem('configuration');
      if (stored) {
        setConfiguration(JSON.parse(stored));
      }
    };
    loadConfiguration();
  }, []);
  return configuration;
}
