/**
 * IndexedDB wrapper for offline response queuing.
 *
 * Uses a simple promise-based API over the native IDB API (no external library).
 * Stores pending review submissions that failed due to being offline,
 * to be synced via Background Sync when connectivity is restored.
 */

const DB_NAME = 'hemisphere-offline';
const DB_VERSION = 1;
const OUTBOX_STORE = 'outbox';

export interface PendingReviewSubmission {
  id?: number; // auto-increment
  sessionId: string;
  itemId: string;
  rating: number; // 1..4
  timeMs: number;
  timestamp: number; // Date.now()
  retryCount: number;
}

/**
 * Open (or create) the offline IndexedDB database.
 * Creates the outbox object store on first run.
 */
export async function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a review submission to the offline outbox for later sync.
 */
export async function queueReviewSubmission(
  submission: Omit<PendingReviewSubmission, 'id' | 'retryCount'>
): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = tx.objectStore(OUTBOX_STORE);
    const record: Omit<PendingReviewSubmission, 'id'> = { ...submission, retryCount: 0 };
    const req = store.add(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all pending submissions from the outbox.
 */
export async function getPendingSubmissions(): Promise<PendingReviewSubmission[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly');
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as PendingReviewSubmission[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove a successfully synced submission from the outbox by its auto-increment id.
 */
export async function removePendingSubmission(id: number): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all pending submissions from the outbox (e.g. after a full sync).
 */
export async function clearOutbox(): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
