import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { checkOnline, syncService } from '../services/api';

const NetworkContext = createContext({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  syncNow: () => {},
});

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline]     = useState(true);
  const [isSyncing, setIsSyncing]   = useState(false);
  const [pendingCount, setPending]  = useState(0);
  const appStateRef = useRef(AppState.currentState);

  const refreshPending = async () => {
    try {
      const r = await syncService.getPendingCount();
      setPending(r?.count ?? 0);
    } catch (_) {}
  };

  useEffect(() => {
    // Bootstrap — check initial state
    checkOnline().then(online => {
      setIsOnline(online);
      syncService._lastOnline = online;
    });
    refreshPending();

    // Listen to SyncService events
    const offOnline  = syncService.on('online',  () => { setIsOnline(true);  refreshPending(); });
    const offOffline = syncService.on('offline', () => setIsOnline(false));
    const offStart   = syncService.on('sync-start', () => setIsSyncing(true));
    const offDone    = syncService.on('sync-done',  () => { setIsSyncing(false); refreshPending(); });
    const offErr     = syncService.on('sync-error', () => { setIsSyncing(false); refreshPending(); });

    // When app comes to foreground → check immediately
    const sub = AppState.addEventListener('change', async (state) => {
      const prev = appStateRef.current;
      appStateRef.current = state;
      if (prev.match(/inactive|background/) && state === 'active') {
        await syncService.checkConnectivity();
        await refreshPending();
      }
    });

    return () => {
      offOnline(); offOffline(); offStart(); offDone(); offErr();
      sub.remove();
    };
  }, []);

  const syncNow = async () => {
    const online = await checkOnline();
    setIsOnline(online);
    if (online) await syncService.syncPending();
    await refreshPending();
  };

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing, pendingCount, syncNow }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
