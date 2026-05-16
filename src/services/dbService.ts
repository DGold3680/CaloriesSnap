import { openDB, IDBPDatabase } from 'idb';
import { FoodEntry } from '../types';

const DB_NAME = 'CalorieSnapDB';
const STORE_NAME = 'entries';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveEntry(entry: FoodEntry) {
  const db = await getDB();
  // Remove transient imageUrl before saving to DB
  const { imageUrl, ...rest } = entry;
  return db.put(STORE_NAME, rest);
}

export async function getAllEntries(): Promise<FoodEntry[]> {
  const db = await getDB();
  const entries = await db.getAll(STORE_NAME);
  // Sort by date descending
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function deleteEntry(id: string) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}

export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persisted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}
