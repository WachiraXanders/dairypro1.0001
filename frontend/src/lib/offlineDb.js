const DB_NAME = 'dairypro_offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'queue';
const CACHE_STORE = 'cache';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not available in this browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const q = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        q.createIndex('entity', 'entity');
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const c = db.createObjectStore(CACHE_STORE, { keyPath: 'cacheKey' });
        c.createIndex('entity', 'entity');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- sync queue ---------------------------------------------------------

export async function enqueue({ entity, op, payload, localId = null, targetId = null }) {
  const store = await tx(QUEUE_STORE, 'readwrite');
  const record = { entity, op, payload, localId, targetId, createdAt: new Date().toISOString() };
  const id = await wrap(store.add(record));
  return { ...record, id };
}

export async function getQueue() {
  const store = await tx(QUEUE_STORE, 'readonly');
  const all = await wrap(store.getAll());
  return all.sort((a, b) => a.id - b.id);
}

export async function removeQueueItem(id) {
  const store = await tx(QUEUE_STORE, 'readwrite');
  await wrap(store.delete(id));
}

export async function queueCount() {
  const all = await getQueue();
  return all.length;
}

// ---- entity cache (for reading data while offline) ----------------------

export async function upsertCache(entity, record) {
  if (!record?.id) return;
  const store = await tx(CACHE_STORE, 'readwrite');
  await wrap(store.put({ cacheKey: `${entity}:${record.id}`, entity, record }));
}

export async function deleteCached(entity, id) {
  const store = await tx(CACHE_STORE, 'readwrite');
  await wrap(store.delete(`${entity}:${id}`));
}

export async function getCachedList(entity) {
  const store = await tx(CACHE_STORE, 'readonly');
  const index = store.index('entity');
  const all = await wrap(index.getAll(entity));
  return all.map((row) => row.record);
}

export function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
