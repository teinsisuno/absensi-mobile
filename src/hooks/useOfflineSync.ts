import { useCallback, useEffect } from 'react';
import { syncService } from '../services/sync';
import { useAppStore } from '../stores/appStore';

export function useOfflineSync() {
  const isOnline = useAppStore((s) => s.isOnline);
  const setSyncing = useAppStore((s) => s.setSyncing);
  const setPendingCount = useAppStore((s) => s.setPendingCount);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncService.syncPendingQueue();
      const count = await syncService.getPendingCount();
      setPendingCount(count);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [setPendingCount, setSyncing]);

  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return { syncNow };
}

