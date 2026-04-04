import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncContacts } from '../services/contactSyncService';
import { startNewContactWatcher, stopNewContactWatcher } from '../services/contactLocalService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

interface ContactSyncContextValue {
  syncStatus: SyncStatus;
  syncProgress: number;      // 0–100
  triggerSync: () => void;   // manually trigger from any screen if needed
}

const ContactSyncContext = createContext<ContactSyncContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ContactSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const isSyncing = useRef(false);

  // ── Background sync runner (safe to call multiple times) ──────────────────
  const triggerSync = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      if (isSyncing.current) return;
      isSyncing.current = true;
      setSyncStatus('syncing');

      try {
        await syncContacts({
          onProgress: ({ percent }) => setSyncProgress(percent),

          onChunkSuccess: (idx) => console.log(`[Sync] Chunk ${idx} done`),

          onChunkError: (idx, err) =>
            console.warn(`[Sync] Chunk ${idx} error:`, err.message),

          onComplete: ({ totalSent, skipped }) => {
            console.log(`[Sync] Complete — sent: ${totalSent}, skipped: ${skipped}`);
            setSyncStatus('done');
            setSyncProgress(100);
          },

          onAlreadyUpToDate: () => {
            console.log('[Sync] Already up to date');
            setSyncStatus('done');
          },

          onError: (err) => {
            console.error('[Sync] Fatal error:', err.message);
            setSyncStatus('error');
          },
        });
      } finally {
        isSyncing.current = false;
      }
    }


  }, []);

  // ── Start watcher + initial sync when provider mounts ─────────────────────
  useEffect(() => {

    // Kick off initial background sync
    triggerSync();

    // Watch for new contacts added to device — triggers sync automatically
    startNewContactWatcher(() => triggerSync());

    // Re-sync whenever app comes back to foreground
    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') triggerSync();
      },
    );

    return () => {
      stopNewContactWatcher();
      appStateSub.remove();
    };
  }, [triggerSync]);

  return (
    <ContactSyncContext.Provider value={{ syncStatus, syncProgress, triggerSync }}>
      {children}
    </ContactSyncContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useContactSync = (): ContactSyncContextValue => {
  const ctx = useContext(ContactSyncContext);
  if (!ctx) throw new Error('useContactSync must be used inside ContactSyncProvider');
  return ctx;
};