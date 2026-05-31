import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { dbService } from '../services/database';
import { API_BASE_URL, API_KEY } from '../config';

// ── Main authenticated API instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

// Auto-retry once on 401 with refreshed token
let _isRefreshing = false;
let _pendingQueue = [];

const processQueue = (err, token = null) => {
  _pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  _pendingQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status !== 401 || orig._retry) return Promise.reject(err);
    orig._retry = true;

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        })
        .catch(Promise.reject);
    }

    _isRefreshing = true;
    try {
      const res = await api.post('/auth/refresh');
      const newToken = res.data.access_token;
      await SecureStore.setItemAsync('access_token', newToken);
      processQueue(null, newToken);
      orig.headers.Authorization = `Bearer ${newToken}`;
      return api(orig);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user_data');
      return Promise.reject(refreshErr);
    } finally {
      _isRefreshing = false;
    }
  }
);

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (identifier, password) =>
    api.post(
      '/auth/token',
      `username=${encodeURIComponent(identifier)}&password=${encodeURIComponent(password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),

  refresh: () => api.post('/auth/refresh'),

  me: () => api.get('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),

  register: (data) => api.post('/auth/register', data),

  sendOtp: (phone) => {
    const body = new URLSearchParams({ phone });
    return api.post('/auth/send-otp', body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },

  verifyOtp: (phone, code) => {
    const body = new URLSearchParams({ phone, code });
    return api.post('/auth/verify-otp', body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },

  forgotPasswordOtp: (phone) => {
    const body = new URLSearchParams({ phone });
    return api.post('/auth/forgot-password-otp', body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },

  searchCooperatives: (q) => api.get('/coop/cooperatives/search', { params: { q } }),

  validateCoopCode: (code) => api.get('/coop/cooperatives/validate-code', { params: { code } }),
};

// ── Farmer API ────────────────────────────────────────────────────────────────
export const farmerAPI = {
  getProfile: () => api.get('/farmer/profile'),
  updateProfile: (data) => api.put('/farmer/profile', data),

  getFarms: () => api.get('/farmer/farm'),
  getFarm: (farmId) => api.get(`/farmer/farm/${farmId}`),
  createFarm: (data) => api.post('/farmer/farm', data),

  getParcels: (farmId) => api.get(`/farmer/farm/${farmId}/parcels`),
  getParcel: (farmId, parcelId) => api.get(`/farmer/farm/${farmId}/parcels/${parcelId}`),

  getStats: () => api.get('/farmer/stats'),
  getNotifications: () => api.get('/farmer/notifications'),
  getDeliveries: () => api.get('/farmer/deliveries'),

  getDeforestationHistory: (farmId, parcelId) =>
    api.get(`/farmer/farm/${farmId}/deforestation-history`, { params: parcelId ? { parcel_id: parcelId } : {} }),

  getSatelliteHistory: (farmId) => api.get(`/farmer/farm/${farmId}/satellite-history`),
};

// ── EUDR API ──────────────────────────────────────────────────────────────────
export const eudrAPI = {
  getFarmCompliance: (farmId) => api.get(`/eudr/farm/${farmId}/compliance`),
  getFarmingAnalysis: (parcelId) => api.get(`/eudr/parcel/${parcelId}/farming-analysis`),
  triggerFarmingAnalysis: (parcelId) => api.post(`/eudr/parcel/${parcelId}/farming-analysis`),
};

// ── Cooperative Officer API ───────────────────────────────────────────────────
export const coopAPI = {
  getMe: () => api.get('/coop/me'),
  getStats: () => api.get('/coop/stats'),

  getFarmers: () => api.get('/coop/farmers'),
  getPendingFarmers: () => api.get('/coop/farmers/pending'),
  verifyFarmer: (userId) => api.put(`/coop/members/${userId}/verify`),

  getFarms: () => api.get('/coop/farms'),
  getPendingFarms: () => api.get('/coop/farms/pending'),

  getDeliveries: (params) => api.get('/coop/deliveries', { params }),
  createDelivery: (data) => api.post('/coop/deliveries', data),

  getBatches: () => api.get('/coop/batches'),
  createBatch: (data) => api.post('/coop/batches', data),
  getBatchTraceability: (batchId) => api.get(`/coop/batches/${batchId}/traceability`),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/dashboard/stats'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (userId) => api.post(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/unsuspend`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Farmers
  getAllFarmers: (params) => api.get('/admin/farmers', { params }),
  getPendingFarmers: () => api.get('/admin/farmers/pending'),
  verifyFarmer: (farmerId) => api.put(`/admin/farmers/${farmerId}/verify`),
  rejectFarmer: (farmerId, reason) => api.put(`/admin/farmers/${farmerId}/reject`, { reason }),

  // Compliance / EUDR
  getComplianceOverview: () => api.get('/admin/compliance/overview'),
  getDDSList: (params) => api.get('/admin/eudr/dds', { params }),
  approveDDS: (ddsId) => api.post(`/admin/eudr/dds/${ddsId}/approve`),
  rejectDDS: (ddsId, reason) => api.post(`/admin/eudr/dds/${ddsId}/reject`, { reason }),

  // Cooperatives
  getCooperatives: () => api.get('/admin/cooperatives'),
  createCooperative: (data) => api.post('/admin/cooperatives', data),
  updateCooperative: (coopId, data) => api.put(`/admin/cooperatives/${coopId}`, data),

  // ML
  getMLStatus: () => api.get('/admin/ml/status'),
  retrainML: (params) => api.post('/admin/ml/retrain', params),
  getMLLogs: () => api.get('/admin/ml/logs'),
};

// ── Satellite API ─────────────────────────────────────────────────────────────
export const satelliteAPI = {
  getIndices: (parcelId) => api.get(`/satellite/indices/${parcelId}`),
  getHistory: (parcelId) => api.get(`/satellite/history/${parcelId}`),
  getEudrCheck: (parcelId) => api.get(`/satellite/eudr/${parcelId}`),
};

// ── Mobile provisioning API (no auth required) ────────────────────────────────
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
  timeout: 20000,
});

export const polygonAPI = {
  getFarm: (farmId) => publicApi.get(`/farms/${farmId}`),
  submit: (data) => publicApi.post('/parcels/polygon', data),
  syncBatch: (body) => publicApi.post('/sync/batch', body),
};

export const mobileAPI = {
  setup: () => publicApi.post('/mobile/setup', {}),
  createFarm: (data) => publicApi.post('/mobile/farms/create', data),
};

// ── Device ID helper ──────────────────────────────────────────────────────────
export async function getDeviceId() {
  try {
    const stored = await AsyncStorage.getItem('device_id');
    if (stored) return stored;
    const deviceId = Device.deviceId || `android-${Date.now()}`;
    await AsyncStorage.setItem('device_id', deviceId);
    return deviceId;
  } catch (_) {
    return 'unknown-device';
  }
}

// ── Connectivity helper ───────────────────────────────────────────────────────
export async function checkOnline() {
  try {
    const s = await Network.getNetworkStateAsync();
    return s.isConnected && s.isInternetReachable !== false;
  } catch (_) {
    return false;
  }
}

// ── Sync Service ──────────────────────────────────────────────────────────────
export class SyncService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.autoSyncStarted = false;
  }

  async checkConnectivity() {
    this.isOnline = await checkOnline();
    return this.isOnline;
  }

  async startAutoSync() {
    if (this.autoSyncStarted) return;
    this.autoSyncStarted = true;

    setTimeout(() => {
      this.syncPending().catch((e) => console.warn('Initial sync failed:', e));
    }, 5000);

    setInterval(async () => {
      try {
        if (this.isSyncing) return;
        if (await checkOnline()) await this.syncPending();
      } catch (e) {
        console.warn('Auto-sync error:', e);
      }
    }, 45000);
  }

  async syncPending() {
    if (this.isSyncing) return;
    if (!dbService.db) return;

    this.isSyncing = true;
    try {
      const pending = await dbService.getQueue(null, 'pending');
      if (!pending || pending.length === 0) return;

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
        const res = await polygonAPI.syncBatch({ captures });
        if (res.data?.synced > 0) {
          for (const c of pending) await dbService.updateSyncStatus(c.id, 'synced');
        }
      } catch (e) {
        for (const c of pending) await dbService.updateSyncStatus(c.id, 'failed', e.message);
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
