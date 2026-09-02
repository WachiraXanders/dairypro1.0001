import React, { useEffect, useState, useCallback } from 'react';
import { WifiOff, RefreshCw, CloudUpload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { syncAll } from '@/lib/syncEngine';
import { queueCount } from '@/lib/offlineDb';
import OfflineEntrySheet from './OfflineEntrySheet';

export default function OfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await queueCount());
    } catch {
      // IndexedDB unavailable — offline queueing simply won't be used.
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncAll();
      await refreshPending();
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} offline change${result.synced === 1 ? '' : 's'}`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} change(s) failed to sync — will retry later`);
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    // Register a minimal service worker for basic asset caching. Non-fatal if unsupported.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    refreshPending();

    const handleOnline = () => { setIsOnline(true); runSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodically check the queue in case another tab/component enqueued something.
    const interval = setInterval(refreshPending, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>You're offline — entries you log now will sync automatically once you're back online.</span>
          <Button size="sm" variant="secondary" className="h-7 ml-1" onClick={() => setEntryOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Quick Log
          </Button>
        </div>
      )}

      {isOnline && pending > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-600 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          <CloudUpload className="w-4 h-4" />
          <span>{pending} change{pending === 1 ? '' : 's'} waiting to sync</span>
          <Button size="sm" variant="secondary" className="h-7" onClick={runSync} disabled={syncing}>
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sync now'}
          </Button>
        </div>
      )}

      <OfflineEntrySheet open={entryOpen} onOpenChange={setEntryOpen} />
    </>
  );
}
