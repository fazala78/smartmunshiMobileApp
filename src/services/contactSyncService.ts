// services/contactSyncService.ts
import Contacts, { Contact } from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
  BackHandler,
} from 'react-native';
import { createSyncContact } from './contactService';

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  chunkSize: 50,
  delayBetweenChunks: 2000, // ms
  maxRetries: 3,
  retryBackoffBase: 1500, // ms
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NormalisedContact {
  id: string;
  firstName: string;
  lastName: string;
  phones: Array<{ label: string; number: string }>;
  emails: Array<{ label: string; address: string }>;
  company: string;
  thumbnailPath: string | null;
}

export interface ChunkPayload {
  chunkIndex: number;
  totalChunks: number;
  contacts: NormalisedContact[];
}

export interface SyncProgress {
  sent: number;
  total: number;
  percent: number;
}

export interface SyncResult {
  totalSent: number;
  skipped: number;
}

export interface SyncCallbacks {
  onProgress?: (progress: SyncProgress) => void;
  onChunkSuccess?: (chunkIndex: number) => void;
  onChunkError?: (chunkIndex: number, error: Error) => void;
  onComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
  onAlreadyUpToDate?: () => void;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  SENT_HASHES: 'contactSync:sentHashes',
  CHECKPOINT: 'contactSync:checkpoint',
  LOCAL_DB: 'localContacts:all', // shared with contactLocalService
} as const;

// ─── Local DB Types (mirrors contactLocalService) ─────────────────────────────

interface LocalContact {
  localId: string;
  recordID: string;
  firstName: string;
  lastName: string;
  phones: Array<{ label: string; number: string }>;
  emails: Array<{ label: string; address: string }>;
  company: string;
  status: 'pending' | 'synced' | 'error';
  savedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashContact(contact: Contact): string {
  const raw = [
    contact.recordID,
    contact.phoneNumbers
      .map(p => p.number)
      .sort()
      .join(','),
    contact.emailAddresses
      .map(e => e.email)
      .sort()
      .join(','),
  ].join('|');

  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function normaliseContact(contact: Contact): NormalisedContact {
  return {
    id: contact.recordID,
    firstName: contact.givenName ?? '',
    lastName: contact.familyName ?? '',
    phones: contact.phoneNumbers.map(p => ({
      label: p.label,
      number: p.number,
    })),
    emails: contact.emailAddresses.map(e => ({
      label: e.label,
      address: e.email,
    })),
    company: contact.company ?? '',
    thumbnailPath: contact.hasThumbnail ? contact.thumbnailPath : null,
  };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Permissions ──────────────────────────────────────────────────────────────

/**
 * Checks current permission status WITHOUT prompting the user.
 * Used by TenantVerificationScreen on mount to pre-fill state.
 */
export async function checkContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      );
    } catch {
      return false;
    }
  } else {
    // iOS: try a lightweight read — if it throws, permission is denied
    try {
      await Contacts.checkPermission();
      const permission = await Contacts.checkPermission();
      return permission === 'authorized';
    } catch {
      return false;
    }
  }
}

/**
 * Prompts the user for contacts permission.
 * Called explicitly from TenantVerificationScreen when user taps the button.
 * Shows a settings redirect alert if permanently denied on Android.
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message:
            'This app needs access to your contacts to sync them to your store.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      // User permanently denied — guide them to settings
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Contacts permission was denied. Please enable it in app settings to continue.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => BackHandler.exitApp(),
            },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
          { cancelable: false },
        );
      }
      return false;
    } catch {
      return false;
    }
  } else {
    try {
      const permission = await Contacts.requestPermission();
      if (permission === 'authorized') return true;

      // iOS denied — open settings
      if (permission === 'denied') {
        Alert.alert(
          'Permission Required',
          'Please enable Contacts access in Settings to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return false;
    } catch {
      return false;
    }
  }
}

// ─── Local DB Helpers ─────────────────────────────────────────────────────────

async function getAllLocalContacts(): Promise<LocalContact[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_DB);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function updateLocalContactStatuses(
  localIds: string[],
  status: 'synced' | 'error',
): Promise<void> {
  try {
    const all = await getAllLocalContacts();
    const idSet = new Set(localIds);
    const updated = all.map(c => (idSet.has(c.localId) ? { ...c, status } : c));
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(updated));
  } catch {
    // Non-fatal — status will be corrected on next sync
  }
}

// ─── Sent-hash Persistence ────────────────────────────────────────────────────

async function loadSentHashes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SENT_HASHES);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

async function saveSentHashes(hashSet: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SENT_HASHES,
      JSON.stringify([...hashSet]),
    );
  } catch {
    // Non-fatal
  }
}

// ─── Checkpoint Persistence ───────────────────────────────────────────────────

async function loadCheckpoint(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CHECKPOINT);
    return raw !== null ? parseInt(raw, 10) : -1;
  } catch {
    return -1;
  }
}

async function saveCheckpoint(chunkIndex: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKPOINT, String(chunkIndex));
  } catch {
    // Non-fatal
  }
}

async function clearCheckpoint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CHECKPOINT);
  } catch {
    // Non-fatal
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function sendChunk(
  contacts: NormalisedContact[],
  chunkIndex: number,
  totalChunks: number,
  attempt = 1,
): Promise<void> {
  const payload: ChunkPayload = { chunkIndex, totalChunks, contacts };
  try {
    await createSyncContact(payload);
  } catch (error) {
    if (attempt < CONFIG.maxRetries) {
      const backoff = CONFIG.retryBackoffBase * Math.pow(2, attempt - 1);
      await sleep(backoff);
      return sendChunk(contacts, chunkIndex, totalChunks, attempt + 1);
    }
    throw error;
  }
}

// ─── Save Device Contacts → Local DB ─────────────────────────────────────────

/**
 * Called ONCE from TenantVerificationScreen after permission is granted
 * and tenant is verified. Reads all device contacts and saves them to
 * local AsyncStorage with status: 'pending'. Does NOT post to the API —
 * that is handled by syncContacts() via ContactSyncProvider.
 */
export async function saveDeviceContactsToLocalDB(): Promise<void> {
  try {
    const [rawContacts, existing] = await Promise.all([
      Contacts.getAll(),
      getAllLocalContacts(),
    ]);

    const existingIds = new Set(existing.map(c => c.recordID));

    const newOnes: LocalContact[] = rawContacts
      .filter(c => !existingIds.has(c.recordID))
      .map(c => ({
        localId: `local_${c.recordID}_${Date.now()}`,
        recordID: c.recordID,
        firstName: c.givenName ?? '',
        lastName: c.familyName ?? '',
        phones: c.phoneNumbers.map(p => ({ label: p.label, number: p.number })),
        emails: c.emailAddresses.map(e => ({
          label: e.label,
          address: e.email,
        })),
        company: c.company ?? '',
        status: 'pending' as const,
        savedAt: Date.now(),
      }));

    if (newOnes.length > 0) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_DB,
        JSON.stringify([...existing, ...newOnes]),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {}
}

// ─── New Contact Watcher ──────────────────────────────────────────────────────

let watcherTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Started by ContactSyncProvider — runs across ALL screens after login.
 * Polls device contacts every 30s. If any new recordID is found that isn't
 * in local DB, saves it (status: pending) and fires onNewContacts() to
 * trigger a background sync.
 */
export function startNewContactWatcher(onNewContacts: () => void): void {
  if (watcherTimer) return; // already running — guard against double-start

  watcherTimer = setInterval(async () => {
    try {
      const [rawContacts, existing] = await Promise.all([
        Contacts.getAll(),
        getAllLocalContacts(),
      ]);

      const existingIds = new Set(existing.map(c => c.recordID));
      const brandNew = rawContacts.filter(c => !existingIds.has(c.recordID));

      if (brandNew.length > 0) {
        const newLocal: LocalContact[] = brandNew.map(c => ({
          localId: `local_${c.recordID}_${Date.now()}`,
          recordID: c.recordID,
          firstName: c.givenName ?? '',
          lastName: c.familyName ?? '',
          phones: c.phoneNumbers.map(p => ({
            label: p.label,
            number: p.number,
          })),
          emails: c.emailAddresses.map(e => ({
            label: e.label,
            address: e.email,
          })),
          company: c.company ?? '',
          status: 'pending' as const,
          savedAt: Date.now(),
        }));

        await AsyncStorage.setItem(
          STORAGE_KEYS.LOCAL_DB,
          JSON.stringify([...existing, ...newLocal]),
        );

        onNewContacts();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {}
  }, 30_000);
}

export function stopNewContactWatcher(): void {
  if (watcherTimer) {
    clearInterval(watcherTimer);
    watcherTimer = null;
  }
}

// ─── Main Sync Function ───────────────────────────────────────────────────────

/**
 * Reads pending contacts from local DB, deduplicates via hash,
 * and uploads to the API in chunks with retry + checkpoint resume.
 *
 * Called by ContactSyncProvider:
 *   - on mount (initial sync)
 *   - when app returns to foreground (AppState)
 *   - when watcher detects new contacts
 *
 * Safe to call multiple times — isSyncing ref in the provider prevents
 * concurrent runs. Completed chunks update local DB status to 'synced'.
 */
export async function syncContacts(
  callbacks: SyncCallbacks = {},
): Promise<void> {
  const {
    onProgress,
    onChunkSuccess,
    onChunkError,
    onComplete,
    onError,
    onAlreadyUpToDate,
  } = callbacks;

  try {
    // Only sync if we actually have permission
    const hasPermission = await checkContactsPermission();
    if (!hasPermission) {
      return;
    }

    // Read pending contacts from local DB (not from device directly)
    const localContacts = await getAllLocalContacts();
    const pendingContacts = localContacts.filter(
      c => c.status === 'pending' || c.status === 'error',
    );

    if (pendingContacts.length === 0) {
      onAlreadyUpToDate?.();
      return;
    }

    // Deduplicate against already-sent hashes
    const sentHashes = await loadSentHashes();
    const rawContacts = await Contacts.getAll();
    const rawContactMap = new Map(rawContacts.map(c => [c.recordID, c]));

    const toSend: NormalisedContact[] = [];
    const toSendIds: string[] = []; // localIds
    const toSendHashes: string[] = [];

    for (const local of pendingContacts) {
      const raw = rawContactMap.get(local.recordID);
      if (!raw) continue; // contact was deleted from device

      const hash = hashContact(raw);
      if (sentHashes.has(hash)) continue; // already sent in a previous session

      toSend.push(normaliseContact(raw));
      toSendIds.push(local.localId);
      toSendHashes.push(hash);
    }

    const skipped = localContacts.length - toSend.length;

    if (toSend.length === 0) {
      onAlreadyUpToDate?.();
      return;
    }

    // Chunk and send
    const chunks = chunkArray(toSend, CONFIG.chunkSize);
    const idChunks = chunkArray(toSendIds, CONFIG.chunkSize);
    const hashChunks = chunkArray(toSendHashes, CONFIG.chunkSize);
    const totalChunks = chunks.length;

    const checkpoint = await loadCheckpoint();
    const startIndex = checkpoint + 1;
    let totalSent = startIndex * CONFIG.chunkSize;

    for (let i = startIndex; i < totalChunks; i++) {
      const chunk = chunks[i];
      const chunkIds = idChunks[i];
      const chunkHashes = hashChunks[i];

      try {
        await sendChunk(chunk, i, totalChunks);

        // Persist immediately after each successful chunk
        chunkHashes.forEach(h => sentHashes.add(h));
        await saveSentHashes(sentHashes);
        await saveCheckpoint(i);
        await updateLocalContactStatuses(chunkIds, 'synced');

        totalSent += chunk.length;
        onChunkSuccess?.(i);

        onProgress?.({
          sent: Math.min(totalSent, toSend.length),
          total: toSend.length,
          percent: Math.min(100, Math.round((totalSent / toSend.length) * 100)),
        });
      } catch (err) {
        const e = err as Error;
        await updateLocalContactStatuses(chunkIds, 'error');
        onChunkError?.(i, e);
        throw e; // re-throw so outer catch fires onError
      }

      if (i < totalChunks - 1) {
        await sleep(CONFIG.delayBetweenChunks);
      }
    }

    await clearCheckpoint();
    onComplete?.({ totalSent, skipped });
  } catch (err) {
    onError?.(err as Error);
  }
}

// ─── Reset Utility ────────────────────────────────────────────────────────────

/**
 * Clears all sync history. Useful for testing or when a user logs out
 * and a fresh sync is needed on next login.
 */
export async function resetSyncHistory(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SENT_HASHES,
      STORAGE_KEYS.CHECKPOINT,
    ]);
    // Reset all local contact statuses back to pending
    const all = await getAllLocalContacts();
    const reset = all.map(c => ({ ...c, status: 'pending' as const }));
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(reset));
  } catch {
    // Non-fatal
  }
}
