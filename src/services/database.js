import * as SQLite from 'expo-sqlite';

const DB_NAME = 'plotra_capture.db';
const DB_VERSION = 1;

class DatabaseService {
  db = null;
  _initPromise = null;

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    try {
      if (this.db) return;
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('Database initialized and ready');
    } catch (e) {
      console.error('DB init error:', e);
      this._initPromise = null; // Allow retry on failure
      throw e;
    }
  }

  async createTables() {
    if (!this.db) return;

    // Use a single transaction for schema setup
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS polygon_captures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id TEXT NOT NULL,
        parcel_name TEXT,
        polygon_coordinates TEXT NOT NULL,
        area_ha REAL NOT NULL,
        perimeter_meters REAL,
        points_count INTEGER NOT NULL,
        captured_at TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        sync_attempts INTEGER DEFAULT 0,
        last_sync_error TEXT,
        device_id TEXT NOT NULL,
        accuracy_m REAL,
        agent_id TEXT,
        notes TEXT,
        topology_validated BOOLEAN DEFAULT 0,
        validation_warnings TEXT,
        device_info TEXT,
        synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_polygon_status ON polygon_captures(sync_status);
      CREATE INDEX IF NOT EXISTS idx_polygon_farm ON polygon_captures(farm_id);
    `);

    // Safe migration check
    try {
      const tableInfo = await this.db.getAllAsync("PRAGMA table_info(polygon_captures)");
      const hasSyncedAt = tableInfo.some(col => col.name === 'synced_at');
      if (!hasSyncedAt) {
        await this.db.execAsync(`ALTER TABLE polygon_captures ADD COLUMN synced_at TEXT;`);
      }
    } catch (err) {
      console.warn('Migration check failed:', err);
    }
  }

  async savePolygonCapture(capture) {
    if (!this.db) throw new Error('Database not initialized');
    const {
      farmId,
      parcelName,
      polygonCoords,  // array of {latitude, longitude}
      areaHectares,
      perimeterMeters,
      pointsCount,
      capturedAt,
      deviceInfo,
      notes,
      topologyValidated,
      validationWarnings,
      accuracyM,
    } = capture;

    // URS format: polygon_coordinates as array of {lat, lng} objects
    const polygonCoordinates = polygonCoords.map(p => ({
      lat: p.latitude,
      lng: p.longitude
    }));

    // Get device ID (persisted)
    const deviceId = deviceInfo?.device_id || `android-${Date.now()}`;

    const result = await this.db.runAsync(
      `INSERT INTO polygon_captures
       (farm_id, parcel_name, polygon_coordinates, area_ha, perimeter_meters,
        points_count, captured_at, uploaded_at, sync_status,
        device_id, accuracy_m, agent_id, notes, topology_validated, validation_warnings, device_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, ?, ?)`,
      [
        farmId,
        parcelName || null,
        JSON.stringify(polygonCoordinates),
        areaHectares,
        perimeterMeters || null,
        pointsCount,
        capturedAt || new Date().toISOString(),
        new Date().toISOString(),
        deviceId,
        accuracyM || null,
        notes || null,
        topologyValidated ? 1 : 0,
        JSON.stringify(validationWarnings || []),
        JSON.stringify(deviceInfo || {}),
      ]
    );

    return result.lastInsertRowId;
  }

  async getQueue(farmId = null, status = null) {
    if (!this.db) return [];
    let query = 'SELECT * FROM polygon_captures';
    const params = [];

    if (farmId || status) {
      query += ' WHERE';
      const conditions = [];
      if (farmId) {
        conditions.push('farm_id = ?');
        params.push(farmId);
      }
      if (status) {
        conditions.push('sync_status = ?');
        params.push(status);
      }
      query += ' ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

     const rows = await this.db.getAllAsync(query, params);
     return rows.map(row => {
       let polygon_coordinates = [];
       let device_info = {};
       let validation_warnings = [];
       try { polygon_coordinates = JSON.parse(row.polygon_coordinates) || []; } catch (_) {}
       try { device_info = row.device_info ? JSON.parse(row.device_info) : {}; } catch (_) {}
       try { validation_warnings = row.validation_warnings ? JSON.parse(row.validation_warnings) : []; } catch (_) {}
       return { ...row, polygon_coordinates, device_info, validation_warnings };
     });
  }

  async getCapture(id) {
    if (!this.db) return null;
     const row = await this.db.getFirstAsync(
       'SELECT * FROM polygon_captures WHERE id = ?',
       [id]
     );
     if (row) {
       let polygon_coordinates = [];
       let device_info = {};
       let validation_warnings = [];
       try { polygon_coordinates = JSON.parse(row.polygon_coordinates) || []; } catch (_) {}
       try { device_info = row.device_info ? JSON.parse(row.device_info) : {}; } catch (_) {}
       try { validation_warnings = row.validation_warnings ? JSON.parse(row.validation_warnings) : []; } catch (_) {}
       return { ...row, polygon_coordinates, device_info, validation_warnings };
     }
     return null;
   }

  async updateSyncStatus(id, status, error = null) {
    if (!this.db) return;
    const fields = ['sync_status = ?', 'sync_attempts = sync_attempts + 1'];
    const params = [status];

    if (status === 'synced') {
      fields.push('synced_at = datetime("now")');
    }
    if (error) {
      fields.push('last_sync_error = ?');
      params.push(error);
    }
    params.push(id); // id must be last — it binds the WHERE clause

    await this.db.runAsync(
      `UPDATE polygon_captures SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  async deleteCapture(id) {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM polygon_captures WHERE id = ?', [id]);
  }

  getPendingCount() {
    if (!this.db) return Promise.resolve({ count: 0 });
    return this.db.getFirstAsync(
      "SELECT COUNT(*) as count FROM polygon_captures WHERE sync_status = 'pending'"
    );
  }
}

export const dbService = new DatabaseService();
