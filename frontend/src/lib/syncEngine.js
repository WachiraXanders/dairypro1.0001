import { entities } from '@/api';
import { getQueue, removeQueueItem, upsertCache, deleteCached } from './offlineDb';

let syncing = false;

/**
 * Processes the offline queue in creation order. Runs create ops first for
 * each localId so later update/delete ops targeting that same localId can be
 * resolved to the real server id within the same run.
 */
export async function syncAll() {
  if (syncing) return { synced: 0, failed: 0, skipped: true };
  if (!navigator.onLine) return { synced: 0, failed: 0, offline: true };

  syncing = true;
  const localIdMap = {}; // localId -> server id, scoped to this run
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getQueue();
    for (const item of queue) {
      const client = entities[item.entity];
      if (!client) {
        // Unknown entity (shouldn't happen) — drop it so it doesn't block the queue forever.
        await removeQueueItem(item.id);
        continue;
      }

      try {
        if (item.op === 'create') {
          const created = await client.create(item.payload);
          if (item.localId) {
            localIdMap[item.localId] = created.id;
            await deleteCached(item.entity, item.localId);
          }
          await upsertCache(item.entity, created);
          await removeQueueItem(item.id);
          synced += 1;
        } else if (item.op === 'update') {
          const realId = localIdMap[item.targetId] || item.targetId;
          const updated = await client.update(realId, item.payload);
          await upsertCache(item.entity, updated);
          await removeQueueItem(item.id);
          synced += 1;
        } else if (item.op === 'delete') {
          const realId = localIdMap[item.targetId] || item.targetId;
          await client.delete(realId);
          await deleteCached(item.entity, realId);
          await removeQueueItem(item.id);
          synced += 1;
        } else {
          await removeQueueItem(item.id);
        }
      } catch (err) {
        // Leave it queued and try again on the next sync — but don't let one
        // bad item block the rest of the queue.
        failed += 1;
        // eslint-disable-next-line no-console
        console.warn(`Offline sync: failed to sync ${item.entity} ${item.op}`, err);
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

export function isSyncing() {
  return syncing;
}
