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
  }

  async checkConnectivity() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      // isInternetReachable is true if internet access is available
      // isConnected is true if the device is connected to a network (Wi-Fi, Cellular, etc.)
      this.isOnline = networkState.isConnected && networkState.isInternetReachable !== false;
      return this.isOnline;
    } catch (e) {
      this.isOnline = false;
      return false;
    }
  }

  async startAutoSync() {
    // Initial check
    setTimeout(() => this.syncPending(), 2000);

    // Background interval
    setInterval(async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const isOnline = networkState.isConnected && networkState.isInternetReachable !== false;

        if (isOnline && !this.isSyncing) {
          await this.syncPending();
        }
      } catch (e) {
        console.warn('Auto-sync check failed:', e);
      }
    }, 30000); // 30 seconds
  }

  async syncPending() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = await dbService.getQueue(null, 'pending');
      if (pending.length === 0) return;

      const captures = pending.map((r) => ({
        farm_id: r.farm_id,                         // UUID string — backend PolygonCaptureCreate.farm_id: str
        polygon_coordinates: r.polygon_coordinates, // already parsed [{lat,lng}]
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
        // BatchSyncRequest expects { captures: [...] }
        const response = await polygonAPI.syncBatch({ captures });
        if (response.data?.synced > 0) {
          for (const c of pending) {
            await dbService.updateSyncStatus(c.id, 'synced');
          }
        }
      } catch (error) {
        for (const c of pending) {
          await dbService.updateSyncStatus(c.id, 'failed', error.message);
        }
      }
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
