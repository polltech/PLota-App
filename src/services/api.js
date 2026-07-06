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
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

// ── Session-expired callback (set by AuthContext) ─────────────────────────────
// Called when a 401 cannot be recovered — triggers proper React logout.
let _onSessionExpired = null;
export function onSessionExpired(callback) { _onSessionExpired = callback; }

// ── 401 retry with token refresh ──────────────────────────────────────────────
let _isRefreshing = false;
let _pendingQueue = [];

const processQueue = (err, token = null) => {
  _pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  _pendingQueue = [];
};

const _doLogout = async () => {
  try { await SecureStore.deleteItemAsync('access_token'); } catch (_) {}
  try { await SecureStore.deleteItemAsync('user_data'); } catch (_) {}
  if (_onSessionExpired) _onSessionExpired();
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;

    // Only handle 401; skip if already retried or if this IS an auth endpoint
    // (prevents the refresh/login calls themselves from re-entering)
    const isAuthEndpoint =
      orig?.url?.includes('/auth/token') ||
      orig?.url?.includes('/auth/refresh');

    // Normalize FastAPI validation errors: detail can be an array of objects.
    // Convert it to a plain string so any Alert.alert(msg) call gets a string.
    if (err.response?.data?.detail != null && typeof err.response.data.detail !== 'string') {
      const d = err.response.data.detail;
      err.response.data.detail = Array.isArray(d)
        ? d.map(x => (typeof x === 'object' ? (x.msg || JSON.stringify(x)) : String(x))).join(', ')
        : String(d);
    }

    if (err.response?.status !== 401 || orig?._retry || isAuthEndpoint) {
      return Promise.reject(err);
    }

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
      // Attempt sliding-window refresh (token still in SecureStore is sent by request interceptor)
      const res = await api.post('/auth/refresh');
      const newToken = res.data.access_token;
      await SecureStore.setItemAsync('access_token', newToken);
      processQueue(null, newToken);
      orig.headers.Authorization = `Bearer ${newToken}`;
      return api(orig);
    } catch (_refreshErr) {
      // Refresh failed — token is genuinely invalid, log the user out cleanly
      processQueue(_refreshErr, null);
      await _doLogout();
      return Promise.reject(_refreshErr);
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

  resetPassword: (token, newPassword, confirmPassword) => {
    const body = new URLSearchParams({ token, new_password: newPassword, confirm_password: confirmPassword });
    return api.post('/auth/reset-password', body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },

  // Send both `code` (original param) and `q` (new param) so it works regardless of backend version
  searchCooperatives: (term) => api.get('/coop/cooperatives/search', { params: { code: term, q: term } }),

  validateCoopCode: (code) => api.get('/coop/cooperatives/validate-code', { params: { code } }),

  checkField: (field, value) => api.get('/auth/check-field', { params: { field, value } }),
};

// ── Farmer API ────────────────────────────────────────────────────────────────
export const farmerAPI = {
  getProfile: () => api.get('/farmer/profile'),
  updateProfile: (data) => api.put('/farmer/profile', data),

  getFarms: () => api.get('/farmer/farm'),
  getFarm: (farmId) => api.get(`/farmer/farm/${farmId}`),
  createFarm: (data) => api.post('/farmer/farm', data),
  captureFarmForFarmer: (farmerId, data) => api.post(`/farmer/farm/capture/${farmerId}`, data),
  listCooperativeFarmers: () => api.get('/farmer/cooperative/farmers'),
  updateFarm: (farmId, data) => api.patch(`/farmer/farm/${farmId}`, data),
  acknowledgeUpdate: (farmId) => api.patch(`/farmer/farm/${farmId}/acknowledge-update`),

  getParcels: (farmId) => api.get(`/farmer/farm/${farmId}/parcels`),
  getParcel: (farmId, parcelId) => api.get(`/farmer/farm/${farmId}/parcels/${parcelId}`),

  getStats: () => api.get('/farmer/stats'),
  getNotifications: () => api.get('/farmer/notifications'),
  markNotificationRead: (id) => api.patch(`/farmer/notifications/${id}/read`),
  getDeliveries: () => api.get('/farmer/deliveries'),
  getMembership: () => api.get('/auth/me/membership'),

  getDeforestationHistory: (farmId, parcelId) =>
    api.get(`/farmer/farm/${farmId}/deforestation-history`, { params: parcelId ? { parcel_id: parcelId } : {} }),

  getSatelliteHistory: (farmId) => api.get(`/farmer/farm/${farmId}/satellite-history`),

  getDocuments: (farmId) => api.get('/farmer/documents', farmId ? { params: { farm_id: farmId } } : {}),

  getComplianceOverview: () => api.get('/farmer/stats'),

  getPayments:       () => api.get('/farmer/payments'),
  requestWithdrawal: (data) => api.post('/farmer/wallet/withdraw', data),
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

  // Delivery Agents (staff)
  getStaff: () => api.get('/coop/staff'),
  createStaff: (data) => api.post('/coop/staff', data),

  getFarmers: () => api.get('/coop/farmers'),
  getPendingFarmers: () => api.get('/coop/farmers/pending'),
  verifyFarmer: (userId) => api.put(`/coop/members/${userId}/verify`),

  getFarms: () => api.get('/coop/farms'),
  getPendingFarms: () => api.get('/coop/farms/pending'),

  getDeliveries: (params) => api.get('/coop/deliveries', { params }),
  getDelivery: (id) => api.get(`/coop/deliveries/${id}`),
  createDelivery: (data) => api.post('/coop/deliveries', data),
  updateDeliveryStatus: (id, status, notes) => api.patch(`/coop/deliveries/${id}/status`, { status, notes }),
  addProcessingStep: (id, data) => api.post(`/coop/deliveries/${id}/processing`, data),
  getProcessingLog: (id) => api.get(`/coop/deliveries/${id}/processing`),

  getReadyForBatching: () => api.get('/coop/deliveries?status_filter=ready_for_batching'),
  getBatches: () => api.get('/coop/batches'),
  getBatch: (id) => api.get(`/coop/batches/${id}`),
  createBatch: (data) => api.post('/coop/batches', data),
  getBatchTraceability: (batchId) => api.get(`/coop/batches/${batchId}/traceability`),
  releaseBatch: (id, notes) => api.post(`/coop/batches/${id}/release`, { notes }),
  updateBatchStatus: (id, status) => api.patch(`/coop/batches/${id}/status`, { status }),
  addBatchLabResults: (id, data) => api.post(`/coop/batches/${id}/lab-results`, data),

  requestUpdate: (userId, issue) => api.patch(`/coop/farmers/${userId}/request-update`, { issue }),

  getConsignments: () => api.get('/coop/consignments'),
  getConsignment: (id) => api.get(`/coop/consignments/${id}`),
  createConsignment: (data) => api.post('/coop/consignments', data),

  getPendingFarms: () => api.get('/coop/farms/pending'),
  getPendingFarmers: () => api.get('/coop/farmers/pending'),

  // Staff management
  deleteStaff:     (id) => api.delete(`/coop/staff/${id}`),
  deactivateStaff: (id) => api.patch(`/coop/staff/${id}/deactivate`),
  activateStaff:   (id) => api.patch(`/coop/staff/${id}/activate`),

  // Payment apportionment (finance admin)
  getBatchApportionment:    (batchId, rate, anonymise = false) =>
    api.get(`/coop/batches/${batchId}/apportionment`, { params: { rate, anonymise } }),
  submitBatchApportionment: (batchId, rateKesPerKg) =>
    api.post(`/coop/batches/${batchId}/apportionment`, { rate_kes_per_kg: rateKesPerKg }),

  // Farm detail + approval (coop officer)
  getFarm: (id) => api.get(`/coop/farms/${id}`),
  approveFarm: (id, reason) => api.patch(`/coop/farms/${id}/approve` + (reason ? `?reason=${encodeURIComponent(reason)}` : '')),
  rejectFarm:  (id, reason) => api.patch(`/coop/farms/${id}/reject`  + (reason ? `?reason=${encodeURIComponent(reason)}` : '')),
  requestFarmUpdate: (farmId, issue) => api.patch(`/coop/farms/${farmId}/request-update`, { issue }),

  // Farmer approval (coop officer)
  approveFarmer: (userId, reason) => api.patch(`/coop/farmers/${userId}/approve` + (reason ? `?reason=${encodeURIComponent(reason)}` : '')),
  rejectFarmer:  (userId, reason) => api.post(`/coop/members/${userId}/reject`, { reason }),

  // Per-cooperative farm auto-approval (same SystemConfig keys as admin global config)
  // Fields: coop_status (bool), coop_eudr (bool)
  getCoopAutoApproval: ()     => api.get('/coop/settings/farm-auto-approval'),
  setCoopAutoApproval: (data) => api.patch('/coop/settings/farm-auto-approval', data),
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

// ── Polygon capture & mobile provisioning (same authenticated instance) ──────
// Using `api` so Bearer token is sent automatically — farms are created under
// the logged-in user's account in the web app database.
export const polygonAPI = {
  getFarm: (farmId) => api.get(`/farms/${farmId}`),
  submit: (data) => api.post('/parcels/polygon', data),
  syncBatch: (body) => api.post('/sync/batch', body),
};

export const mobileAPI = {
  setup: () => api.post('/mobile/setup', {}),
  createFarm: (data) => api.post('/mobile/farms/create', data),
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
    this._listeners = [];        // { event, fn }
    this._lastOnline = true;
  }

  // Subscribe to events: 'online'|'offline'|'sync-start'|'sync-done'|'sync-error'
  on(event, fn) {
    this._listeners.push({ event, fn });
    return () => { this._listeners = this._listeners.filter(l => l.fn !== fn); };
  }

  _emit(event, data) {
    this._listeners.forEach(l => { if (l.event === event) l.fn(data); });
  }

  async checkConnectivity() {
    const wasOnline = this._lastOnline;
    this.isOnline = await checkOnline();
    this._lastOnline = this.isOnline;

    if (!wasOnline && this.isOnline) {
      // Just came back online — sync immediately
      this._emit('online', null);
      this.syncPending().catch(() => {});
    } else if (wasOnline && !this.isOnline) {
      this._emit('offline', null);
    }
    return this.isOnline;
  }

  async startAutoSync() {
    if (this.autoSyncStarted) return;
    this.autoSyncStarted = true;

    // Initial sync attempt after 5s
    setTimeout(() => { this.syncPending().catch(() => {}); }, 5000);

    // Poll connectivity every 10s — triggers immediate sync on reconnect
    setInterval(async () => {
      try { await this.checkConnectivity(); } catch (_) {}
    }, 10000);
  }

  async syncPending() {
    if (this.isSyncing) return;
    if (!dbService.db) return;
    if (!(await checkOnline())) return;

    this.isSyncing = true;
    this._emit('sync-start', null);
    try {
      const pending = await dbService.getQueue(null, 'pending');
      if (!pending || pending.length === 0) {
        this._emit('sync-done', { synced: 0 });
        return;
      }

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

      const res = await polygonAPI.syncBatch({ captures });
      const synced = res.data?.synced ?? 0;
      if (synced > 0) {
        for (const c of pending) await dbService.updateSyncStatus(c.id, 'synced');
      }
      this._emit('sync-done', { synced });
    } catch (e) {
      const pending = await dbService.getQueue(null, 'pending').catch(() => []);
      for (const c of pending) await dbService.updateSyncStatus(c.id, 'failed', e.message);
      this._emit('sync-error', { error: e.message });
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
