import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import { dbService } from '../services/database';

import { API_BASE_URL, API_KEY } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

// Get device ID (persistent)
export async function getDeviceId() {
  try {
    const stored = await AsyncStorage.getItem('device_id');
    if (stored) return stored;
    const deviceId = Device.deviceId || `android-${Date.now()}`;
    await AsyncStorage.setItem('device_id', deviceId);
    return deviceId;
  } catch (e) {
    return 'unknown-device';
  }
}

// Polygon API (Plotra v2 mobile endpoints — all at /api/v2)
export const polygonAPI = {
  // GET  /api/v2/farms/{identifier}
  getFarm: (farmId) => api.get(`/farms/${farmId}`),

  // POST /api/v2/parcels/polygon
  submit: (data) => api.post('/parcels/polygon', data),

  // POST /api/v2/sync/batch — body must be { captures: [...] }
  syncBatch: (body) => api.post('/sync/batch', body),
};

// Sync Service
export class SyncService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.autoSyncStarted = false;
  }

  async checkConnectivity() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected && networkState.isInternetReachable !== false;
      return this.isOnline;
    } catch (e) {
      this.isOnline = false;
      return false;
    }
  }

  async startAutoSync() {
    if (this.autoSyncStarted) return;
    this.autoSyncStarted = true;

    // Initial delayed check to allow DB to settle
    setTimeout(() => {
      this.syncPending().catch(err => console.warn('Initial sync failed:', err));
    }, 5000);

    // Background interval
    setInterval(async () => {
      try {
        if (this.isSyncing) return;

        const networkState = await Network.getNetworkStateAsync();
        const isOnline = networkState.isConnected && networkState.isInternetReachable !== false;

        if (isOnline) {
          await this.syncPending();
        }
      } catch (e) {
        console.warn('Auto-sync interval failed:', e);
      }
    }, 45000); // Increased to 45 seconds to reduce DB contention
  }

  async syncPending() {
    if (this.isSyncing) return;

    // Safety check for DB readiness
    if (!dbService.db) {
      console.log('Sync skipped: Database not ready');
      return;
    }

    this.isSyncing = true;
    try {
      const pending = await dbService.getQueue(null, 'pending');
      if (!pending || pending.length === 0) return;

      console.log(`Syncing ${pending.length} pending captures...`);
      const captures = pending.map((r) => ({
        farm_id: r.farm_id,
        polygon_coordinates: r.polygon_coordinates,
        area_ha: r.area_ha,
        captured_at: r.captured_at,
        device_id: r.device_id,
        accuracy_m: r.accuracy_m ?? null,
        agent_id: r.agent_id ?? null,
        parcel_name: r.parcel_name ?? null,
        perimeter_meters: r.perimeter_meters ?? null,
        points_count: r.points_count ?? null,
        notes: r.notes ?? null,
      }));

      try {
        const response = await polygonAPI.syncBatch({ captures });
        // Backend returns { synced: X }
        if (response.data && response.data.synced > 0) {
          console.log(`Successfully synced ${response.data.synced} records`);
          for (const c of pending) {
            await dbService.updateSyncStatus(c.id, 'synced');
          }
        }
      } catch (error) {
        console.warn('Batch sync API error:', error.message);
        for (const c of pending) {
          await dbService.updateSyncStatus(c.id, 'failed', error.message);
        }
      }
    } catch (dbError) {
      console.error('Sync database operation failed:', dbError);
    } finally {
      this.isSyncing = false;
    }
  }

  getPendingCount() {
    return dbService.getPendingCount();
  }
}

export const syncService = new SyncService();

export default api;
