import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { getSetting, setSetting } from '../services/database';

interface AppState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  apiBaseUrl: string;
  init: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (iso: string) => void;
  setApiBaseUrl: (url: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  apiBaseUrl: '',

  init: async () => {
    const state = await NetInfo.fetch();
    const lastSync = await getSetting('last_sync_at');
    const baseUrl = await getSetting('api_base_url');
    set({
      isOnline: Boolean(state.isConnected && state.isInternetReachable !== false),
      lastSyncAt: lastSync,
      apiBaseUrl: baseUrl ?? '',
    });

    NetInfo.addEventListener((netState) => {
      set({
        isOnline: Boolean(netState.isConnected && netState.isInternetReachable !== false),
      });
    });
  },

  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (iso) => set({ lastSyncAt: iso }),
  setApiBaseUrl: async (url) => {
    await setSetting('api_base_url', url);
    set({ apiBaseUrl: url });
  },
}));

