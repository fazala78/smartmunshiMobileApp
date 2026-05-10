// hooks/usePermission.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Permission = { name: string };

export const usePermission = (permission: string): boolean => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      try {
        const raw = await AsyncStorage.getItem('permissions');
        if (!raw) {
          setHasPermission(false);
          return;
        }
        const permissions: Permission[] = JSON.parse(raw);
        console.log(permissions);
        setHasPermission(permissions.some(p => p.name === permission));
      } catch {
        setHasPermission(false);
      }
    };
    check();
  }, [permission]);

  return hasPermission;
};
