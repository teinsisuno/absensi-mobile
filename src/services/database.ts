import * as SQLite from 'expo-sqlite';
import { DEFAULT_SETTINGS } from '../utils/constants';

const DB_NAME = 'absensi.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Tabel 1: auth_token
CREATE TABLE IF NOT EXISTS auth_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    employee_id INTEGER,
    employee_name TEXT,
    employee_position TEXT,
    employee_mobile_role TEXT,
    tenant_slug TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabel 2: cached_employee
CREATE TABLE IF NOT EXISTS cached_employee (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    photo TEXT,
    position TEXT,
    mobile_role TEXT,
    work_location_id INTEGER,
    work_location_name TEXT,
    shift_id INTEGER,
    shift_name TEXT,
    status TEXT,
    nik TEXT,
    phone TEXT,
    address TEXT,
    updated_at TEXT
);

-- Tabel 3: pending_attendance (OFFLINE QUEUE)
CREATE TABLE IF NOT EXISTS pending_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    selfie_photo TEXT,
    recorded_at TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 10,
    last_error TEXT,
    next_retry_at TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabel 4: cached_attendance
CREATE TABLE IF NOT EXISTS cached_attendance (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    distance_meter REAL,
    selfie_photo TEXT,
    status TEXT,
    is_late INTEGER DEFAULT 0,
    late_minutes INTEGER,
    work_location_name TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
);

-- Tabel 5: cached_schedules
CREATE TABLE IF NOT EXISTS cached_schedules (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    shift_name TEXT,
    shift_start TEXT,
    shift_end TEXT,
    is_holiday INTEGER DEFAULT 0,
    is_leave INTEGER DEFAULT 0,
    is_permit INTEGER DEFAULT 0,
    status TEXT,
    UNIQUE(employee_id, date)
);

-- Tabel 6: cached_leave_requests
CREATE TABLE IF NOT EXISTS cached_leave_requests (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    attachment TEXT,
    status TEXT,
    approved_by_name TEXT,
    approved_at TEXT,
    approval_notes TEXT,
    updated_at TEXT
);

-- Tabel 7: cached_announcements
CREATE TABLE IF NOT EXISTS cached_announcements (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    published_at TEXT,
    created_at TEXT
);

-- Tabel 8: app_settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`);

  // Seed default settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
      key,
      value
    );
  }
}

// ---------- app_settings ----------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export async function getBaseUrl(): Promise<string> {
  return (await getSetting('api_base_url')) ?? '';
}

export async function setBaseUrl(url: string): Promise<void> {
  await setSetting('api_base_url', url);
}

// ---------- auth_token ----------

export async function saveAuthToken(input: {
  token: string;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  employeeId?: number | null;
  employeeName?: string | null;
  employeePosition?: string | null;
  employeeMobileRole?: string | null;
  tenantSlug?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM auth_token');
  await db.runAsync(
    `INSERT INTO auth_token (
       token, user_id, user_name, user_email, user_role,
       employee_id, employee_name, employee_position, employee_mobile_role, tenant_slug
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.token,
    input.userId,
    input.userName,
    input.userEmail,
    input.userRole,
    input.employeeId ?? null,
    input.employeeName ?? null,
    input.employeePosition ?? null,
    input.employeeMobileRole ?? null,
    input.tenantSlug ?? null
  );
}

export async function getAuthToken(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ token: string }>(
    'SELECT token FROM auth_token LIMIT 1'
  );
  return row?.token ?? null;
}

export async function getAuthRow(): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  return (await db.getFirstAsync('SELECT * FROM auth_token LIMIT 1')) ?? null;
}

export async function getCurrentEmployeeId(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ employee_id: number | null }>(
    'SELECT employee_id FROM auth_token LIMIT 1'
  );
  return row?.employee_id ?? null;
}

export async function clearAuthToken(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM auth_token');
}

// ---------- cached_employee ----------

export async function saveCachedEmployee(employee: {
  id: number;
  name: string;
  photo?: string | null;
  position?: string | null;
  mobileRole?: string | null;
  workLocationId?: number | null;
  workLocationName?: string | null;
  shiftId?: number | null;
  shiftName?: string | null;
  status?: string | null;
  nik?: string | null;
  phone?: string | null;
  address?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_employee (
       id, name, photo, position, mobile_role, work_location_id, work_location_name,
       shift_id, shift_name, status, nik, phone, address, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    employee.id,
    employee.name,
    employee.photo ?? null,
    employee.position ?? null,
    employee.mobileRole ?? null,
    employee.workLocationId ?? null,
    employee.workLocationName ?? null,
    employee.shiftId ?? null,
    employee.shiftName ?? null,
    employee.status ?? null,
    employee.nik ?? null,
    employee.phone ?? null,
    employee.address ?? null,
    new Date().toISOString()
  );
}

export async function getCachedEmployee(
  employeeId: number
): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  return (
    (await db.getFirstAsync(
      'SELECT * FROM cached_employee WHERE id = ?',
      employeeId
    )) ?? null
  );
}

// cached_employee sengaja single-row (INSERT OR REPLACE oleh id) dan hanya ditulis
// saat akun aktif me-link karyawan. Dibersihkan oleh clearAllData (Ganti Akun) DAN
// logout biasa — supaya recovery di hydrate tidak pernah menempelkan karyawan milik
// akun lama ke akun baru yang login di perangkat yang sama.
export async function clearCachedEmployee(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cached_employee');
}

// Dipakai hydrate untuk memulihkan link yang sempat ter-wipe oleh login baru.
export async function getAnyCachedEmployee(): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  return (await db.getFirstAsync('SELECT * FROM cached_employee LIMIT 1')) ?? null;
}

// ---------- pending_attendance ----------

export async function insertPendingAttendance(input: {
  employeeId: number;
  type: string;
  latitude: number;
  longitude: number;
  selfiePhoto?: string | null;
  recordedAt: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO pending_attendance (
       employee_id, type, latitude, longitude, selfie_photo, recorded_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.employeeId,
    input.type,
    input.latitude,
    input.longitude,
    input.selfiePhoto ?? null,
    input.recordedAt
  );
  return result.lastInsertRowId;
}

export async function getPendingAttendance(
  limit = 20
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM pending_attendance
     WHERE status = 'pending'
     ORDER BY created_at ASC, id ASC
     LIMIT ?`,
    limit
  );
}

export async function getFailedAttendance(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM pending_attendance
     WHERE status = 'failed'
     ORDER BY created_at DESC`
  );
}

export async function countPendingAttendance(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM pending_attendance WHERE status IN ('pending', 'syncing', 'failed')"
  );
  return row?.count ?? 0;
}

export async function updatePendingStatus(
  id: number,
  status: string,
  retryCount: number,
  lastError?: string | null,
  nextRetryAt?: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE pending_attendance
     SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?
     WHERE id = ?`,
    status,
    retryCount,
    lastError ?? null,
    nextRetryAt ?? null,
    id
  );
}

export async function deletePendingAttendance(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_attendance WHERE id = ?', id);
}

// ---------- cached_attendance ----------

export async function replaceCachedAttendance(
  employeeId: number,
  records: Array<{
    id: number;
    type: string;
    recordedAt: string;
    latitude?: number | null;
    longitude?: number | null;
    distanceMeter?: number | null;
    selfiePhoto?: string | null;
    status?: string | null;
    isLate?: boolean;
    lateMinutes?: number | null;
    workLocationName?: string | null;
  }>
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_attendance WHERE employee_id = ?', employeeId);
    for (const item of records) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_attendance (
           id, employee_id, type, recorded_at, latitude, longitude,
           distance_meter, selfie_photo, status, is_late, late_minutes, work_location_name
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        employeeId,
        item.type,
        item.recordedAt,
        item.latitude ?? null,
        item.longitude ?? null,
        item.distanceMeter ?? null,
        item.selfiePhoto ?? null,
        item.status ?? null,
        item.isLate ? 1 : 0,
        item.lateMinutes ?? null,
        item.workLocationName ?? null
      );
    }
  });
}

export async function getCachedAttendance(
  employeeId: number,
  fromDate?: string,
  toDate?: string
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (fromDate && toDate) {
    return db.getAllAsync(
      `SELECT * FROM cached_attendance
       WHERE employee_id = ? AND substr(recorded_at, 1, 10) BETWEEN ? AND ?
       ORDER BY recorded_at DESC`,
      employeeId,
      fromDate,
      toDate
    );
  }
  return db.getAllAsync(
    'SELECT * FROM cached_attendance WHERE employee_id = ? ORDER BY recorded_at DESC',
    employeeId
  );
}

// ---------- cached_schedules ----------

export async function replaceCachedSchedules(
  employeeId: number,
  schedules: Array<{
    id: number;
    date: string;
    shiftName?: string | null;
    shiftStart?: string | null;
    shiftEnd?: string | null;
    isHoliday?: boolean;
    isLeave?: boolean;
    isPermit?: boolean;
    status?: string | null;
  }>
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_schedules WHERE employee_id = ?', employeeId);
    for (const item of schedules) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_schedules (
           id, employee_id, date, shift_name, shift_start, shift_end,
           is_holiday, is_leave, is_permit, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        employeeId,
        item.date,
        item.shiftName ?? null,
        item.shiftStart ?? null,
        item.shiftEnd ?? null,
        item.isHoliday ? 1 : 0,
        item.isLeave ? 1 : 0,
        item.isPermit ? 1 : 0,
        item.status ?? null
      );
    }
  });
}

export async function getCachedSchedules(
  employeeId: number,
  fromDate: string,
  toDate: string
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM cached_schedules
     WHERE employee_id = ? AND date BETWEEN ? AND ?
     ORDER BY date ASC`,
    employeeId,
    fromDate,
    toDate
  );
}

// ---------- cached_leave_requests ----------

export async function replaceCachedLeaveRequests(
  employeeId: number,
  requests: Array<{
    id: number;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
    attachment?: string | null;
    status: string;
    approvedByName?: string | null;
    approvedAt?: string | null;
    approvalNotes?: string | null;
    updatedAt?: string | null;
  }>
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_leave_requests WHERE employee_id = ?', employeeId);
    for (const item of requests) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_leave_requests (
           id, employee_id, type, start_date, end_date, reason, attachment,
           status, approved_by_name, approved_at, approval_notes, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        employeeId,
        item.type,
        item.startDate,
        item.endDate,
        item.reason ?? null,
        item.attachment ?? null,
        item.status,
        item.approvedByName ?? null,
        item.approvedAt ?? null,
        item.approvalNotes ?? null,
        item.updatedAt ?? null
      );
    }
  });
}

export async function getCachedLeaveRequests(
  employeeId: number
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM cached_leave_requests WHERE employee_id = ? ORDER BY start_date DESC, id DESC',
    employeeId
  );
}

// ---------- cached_announcements ----------

export async function replaceCachedAnnouncements(
  items: Array<{
    id: number;
    title: string;
    body: string;
    publishedAt?: string | null;
    createdAt?: string | null;
  }>
): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_announcements');
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_announcements (id, title, body, published_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        item.id,
        item.title,
        item.body,
        item.publishedAt ?? null,
        item.createdAt ?? null
      );
    }
  });
}

export async function getCachedAnnouncements(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM cached_announcements ORDER BY COALESCE(published_at, created_at) DESC'
  );
}

// ---------- maintenance ----------

export async function clearAppCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM cached_attendance;
    DELETE FROM cached_schedules;
    DELETE FROM cached_leave_requests;
    DELETE FROM cached_announcements;
    DELETE FROM pending_attendance;
  `);
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM auth_token;
    DELETE FROM cached_employee;
    DELETE FROM cached_attendance;
    DELETE FROM cached_schedules;
    DELETE FROM cached_leave_requests;
    DELETE FROM cached_announcements;
    DELETE FROM pending_attendance;
    DELETE FROM app_settings;
  `);
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      key,
      value
    );
  }
}

