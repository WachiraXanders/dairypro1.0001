import { useCallback, useEffect, useState } from 'react';
import { entities } from '@/api';
import { enqueue, upsertCache, deleteCached, getCachedList, tempId } from '@/lib/offlineDb';

/**
 * Offline-aware CRUD for a single entity. Mirrors the shape of the regular
 * `entities[name]` client (create/update/remove) so callers don't need to
 * branch on connectivity — reads and writes just work either way, and any
 * offline writes are queued for `syncAll()` to push once back online.
 */
export function useOfflineEntity(entityName) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const client = entities[entityName];

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const list = await client.list();
        setRecords(list);
        // Refresh the local cache so it stays useful the next time we go offline.
        list.forEach((r) => upsertCache(entityName, r));
      } else {
        const cached = await getCachedList(entityName);
        setRecords(cached.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
      }
    } catch {
      const cached = await getCachedList(entityName);
      setRecords(cached);
    } finally {
      setIsLoading(false);
    }
  }, [entityName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data) => {
    if (navigator.onLine) {
      const created = await client.create(data);
      await upsertCache(entityName, created);
      setRecords((prev) => [created, ...prev]);
      return created;
    }
    const lid = tempId();
    const localRecord = { ...data, id: lid, _isLocal: true, created_date: new Date().toISOString() };
    await upsertCache(entityName, localRecord);
    await enqueue({ entity: entityName, op: 'create', payload: data, localId: lid });
    setRecords((prev) => [localRecord, ...prev]);
    return localRecord;
  }, [entityName]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(async (id, data) => {
    if (navigator.onLine && !String(id).startsWith('local_')) {
      const updated = await client.update(id, data);
      await upsertCache(entityName, updated);
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    }
    const merged = { ...(records.find((r) => r.id === id) || {}), ...data, id, _isLocal: true };
    await upsertCache(entityName, merged);
    await enqueue({ entity: entityName, op: 'update', payload: data, targetId: id });
    setRecords((prev) => prev.map((r) => (r.id === id ? merged : r)));
    return merged;
  }, [entityName, records]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback(async (id) => {
    if (navigator.onLine && !String(id).startsWith('local_')) {
      await client.delete(id);
    } else {
      await enqueue({ entity: entityName, op: 'delete', targetId: id });
    }
    await deleteCached(entityName, id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, [entityName]); // eslint-disable-line react-hooks/exhaustive-deps

  return { records, isLoading, create, update, remove, refresh };
}
