import Contacts, { Contact } from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_CONTACTS_KEY = 'localContacts:all';
const WATCHER_INTERVAL_MS = 30_000;

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

function toLocalContact(c: Contact): LocalContact {
  return {
    localId: `local_${c.recordID}_${Date.now()}`,
    recordID: c.recordID,
    firstName: c.givenName ?? '',
    lastName: c.familyName ?? '',
    phones: c.phoneNumbers.map(p => ({ label: p.label, number: p.number })),
    emails: c.emailAddresses.map(e => ({ label: e.label, address: e.email })),
    company: c.company ?? '',
    status: 'pending',
    savedAt: Date.now(),
  };
}

async function getAllLocalContacts(): Promise<LocalContact[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeLocalContacts(contacts: LocalContact[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(contacts));
}

/** Called once from TenantVerificationScreen after permission granted */
export async function saveDeviceContactsToLocalDB(): Promise<void> {
  try {
    const [rawContacts, existing] = await Promise.all([
      Contacts.getAll(),
      getAllLocalContacts(),
    ]);
    const existingIds = new Set(existing.map(c => c.recordID));
    const newOnes = rawContacts
      .filter(c => !existingIds.has(c.recordID))
      .map(toLocalContact);
    if (newOnes.length > 0) {
      await writeLocalContacts([...existing, ...newOnes]);
      console.log(`[LocalDB] Saved ${newOnes.length} contacts`);
    }
  } catch (err) {
    console.error('[LocalDB] Save failed:', err);
  }
}

let watcherTimer: ReturnType<typeof setInterval> | null = null;

/** Started by ContactSyncProvider — runs on all screens after login */
export function startNewContactWatcher(onNewContacts: () => void): void {
  if (watcherTimer) return;
  watcherTimer = setInterval(async () => {
    try {
      const [rawContacts, existing] = await Promise.all([
        Contacts.getAll(),
        getAllLocalContacts(),
      ]);
      const existingIds = new Set(existing.map(c => c.recordID));
      const brandNew = rawContacts.filter(c => !existingIds.has(c.recordID));
      if (brandNew.length > 0) {
        await writeLocalContacts([
          ...existing,
          ...brandNew.map(toLocalContact),
        ]);
        console.log(`[Watcher] ${brandNew.length} new contact(s) detected`);
        onNewContacts();
      }
    } catch (err) {
      console.warn('[Watcher] Poll error:', err);
    }
  }, WATCHER_INTERVAL_MS);
}

export function stopNewContactWatcher(): void {
  if (watcherTimer) {
    clearInterval(watcherTimer);
    watcherTimer = null;
  }
}
