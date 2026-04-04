/**
 * useContactSync.ts
 *
 * Drop-in React hook that wraps contactSyncService.
 *
 * Example:
 *   const { start, reset, isRunning, status, progress, lastError } = useContactSync();
 */

import { useState, useCallback } from 'react';

import {
  syncContacts,
  resetSyncHistory,
  SyncProgress,
} from '../services/contactSyncService';

type SyncStatus = 'idle' | 'running' | 'done' | 'error';

interface UseContactSyncReturn {
  start: () => Promise<void>;
  reset: () => Promise<void>;
  isRunning: boolean;
  status: SyncStatus;
  progress: SyncProgress;
  lastError: string | null;
}

export function useContactSync(): UseContactSyncReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState<SyncProgress>({
    sent: 0,
    total: 0,
    percent: 0,
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const start = useCallback(async (): Promise<void> => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('running');
    setLastError(null);

    await syncContacts({
      onProgress: (p: SyncProgress) => setProgress(p),

      onChunkSuccess: (chunkIndex: number) => {
        console.log(`[Hook] Chunk ${chunkIndex} delivered ✓`);
      },

      onChunkError: (chunkIndex: number, error: Error) => {
        console.warn(`[Hook] Chunk ${chunkIndex} failed:`, error.message);
      },

      onComplete: ({ totalSent, skipped }) => {
        setStatus('done');
        setIsRunning(false);
        console.log(
          `[Hook] Sync complete — sent: ${totalSent}, skipped: ${skipped}`,
        );
      },

      onError: (error: Error) => {
        setLastError(error.message);
        setStatus('error');
        setIsRunning(false);
      },
    });
  }, [isRunning]);

  const reset = useCallback(async (): Promise<void> => {
    await resetSyncHistory();
    setStatus('idle');
    setProgress({ sent: 0, total: 0, percent: 0 });
    setLastError(null);
  }, []);

  return { start, reset, isRunning, status, progress, lastError };
}
