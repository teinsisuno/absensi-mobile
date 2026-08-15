# PRD — Absensi Mobile App (React Native + Expo + SQLite)

## 1. Header Metadata

| Field | Nilai |
|-------|-------|
| Author | Sigit / Paijo |
| Project | Absensi Mobile — native mobile app untuk produk Absensi megakomsel.com |
| Fase | MVP Native Mobile App (Android + iOS) |
| Versi | v1.0 |
| Status | Draft |
| Tanggal | 2026-08-12 |
| Backend | Laravel 13 API (existing — `H:\laragon\www\absensi-app`) |
| Dependencies | Absensi API v0.4 (provisioning, SSO, auth, attendance, shifts, leave) |
| Target Model | DeepSeek v4 Flash |

---

## 2. Stack Decision

```
┌─────────────────────────────────────────────────────┐
│  MOBILE APP (React Native + Expo SDK 52+)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Screens │  │  Stores  │  │  Services        │  │
│  │  (UI)    │  │ (Zustand)│  │  (API + SQLite)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│         │             │               │              │
│         ▼             ▼               ▼              │
│  ┌──────────────────────────────────────────────┐   │
│  │  SQLite 3 (expo-sqlite) — local device only  │   │
│  │  • auth_token       • pending_attendance     │   │
│  │  • cached_employee  • offline_queue          │   │
│  │  • app_settings     • cached_schedules       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │
         │ HTTP (REST JSON)
         ▼
┌─────────────────────────────────────────────────────┐
│  BACKEND API (Laravel 13 — SUDAH ADA)               │
│  https://{slug}-absensi.megakomsel.com/api/v1       │
│  MySQL 8 — 1 tenant = 1 database                    │
└─────────────────────────────────────────────────────┘
```

### Kenapa stack ini benar?

| Komponen | Alasan |
|----------|--------|
| **React Native + Expo** | Satu codebase → Android + iOS. Expo SDK menyediakan modul native siap pakai: Camera, Location, LocalAuthentication, Notifications, FileSystem, SQLite. Tidak perlu tulis kode native Java/Kotlin/Swift |
| **SQLite 3 (expo-sqlite)** | Offline-first: karyawan tetap bisa clock in/out walau sinyal lemah. Data antrian disimpan lokal → auto-sync saat online. Bukan pengganti backend — murni cache & queue lokal |
| **Zustand** | State management ringan (~1KB), lebih sederhana dari Redux, cocok untuk model kecil seperti DeepSeek Flash |
| **React Navigation** | Routing standar React Native, mendukung nested navigator (auth flow vs main flow) |
| **TanStack React Query** | Mengelola API calls, caching, retry, dan optimistic updates. Bisa dipadukan dengan SQLite untuk offline-first |
| **expo-camera** | Ambil foto/video untuk face recognition dan selfie absensi |
| **expo-location** | GPS untuk validasi radius clock in/out |
| **expo-local-authentication** | Biometric login (fingerprint / face ID) sebagai alternatif PIN |
| **expo-notifications** | Push notification untuk approval, jadwal, pengumuman |

### Yang TIDAK dikerjakan di device

| Task | Dikerjakan di | Alasan |
|------|---------------|--------|
| Face recognition (matching) | **Server** (Laravel API) | face-api.js di Node/Nitro. Device hanya kirim foto/video, server yang mencocokkan. Lebih akurat & konsisten lintas device |
| Validasi GPS radius | **Server** (Laravel API) | Waktu server digunakan, formula haversine di backend, cegah manipulasi |
| Perhitungan jam kerja / keterlambatan | **Server** | Backend yang olah ScheduleSnapshot + Attendance → status tepat waktu / terlambat |
| Approval HR | **Web admin** (existing) | Tetap di web admin Nuxt4 yang sudah ada |

---

## 3. Executive Summary

Absensi Mobile adalah aplikasi **native Android + iOS** untuk karyawan melakukan clock in/out, mengajukan izin/cuti/sakit, melihat jadwal, dan fitur pendukung lainnya. Aplikasi ini adalah **client dari backend Laravel API yang sudah ada** — bukan pengganti backend. SQLite digunakan **hanya untuk penyimpanan lokal** (auth token, cache data, antrian offline).

**Offline-first**: Clock in/out tetap bisa dilakukan tanpa internet. Data disimpan di SQLite lokal → dikirim ulang otomatis saat koneksi pulih.

**Target**: karyawan toko/kurir/warehouse yang butuh absen cepat (≤ 3 tap). Bukan pengganti web admin (HR tetap pakai web untuk kelola karyawan, approve, dll).

---

## 4. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Absen dalam ≤ 3 tap | Jumlah tap dari login → clock in | ≤ 3 (login PIN → dashboard → tombol clock in) |
| Offline clock in | % absen tersimpan saat offline yang berhasil sync | > 99% |
| Install di kedua platform | APK + IPA tersedia | Android (Play Store) + iOS (TestFlight) |
| Face recognition akurat | % verifikasi wajah berhasil di percobaan pertama | > 90% |
| Sinkronisasi real-time | Delay data absen muncul di dashboard HR | < 5 detik setelah sync |

---

## 5. Arsitektur Offline-First

```
┌──────────────────────────────────────────────────┐
│                 MOBILE APP FLOW                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  [User] ──► Login PIN/biometric                   │
│      │                                            │
│      ▼                                            │
│  [Dashboard] ──► Data dari cache SQLite dulu      │
│      │           (tampil instan), lalu refresh     │
│      │           dari API di background            │
│      ▼                                            │
│  [Clock In/Out]                                    │
│      │                                            │
│      ├── ONLINE ──► POST /api/v1/attendance/*     │
│      │               → langsung tersimpan          │
│      │                                            │
│      └── OFFLINE ──► INSERT ke pending_attendance │
│                      di SQLite                     │
│                      → status "pending_sync"       │
│                      → notifikasi "Tersimpan,      │
│                        akan dikirim saat online"   │
│                                                   │
│  [Sync Service] — jalan saat app foreground        │
│      │  & saat koneksi pulih (NetInfo listener)    │
│      │                                            │
│      ├── Ambil semua pending_attendance            │
│      ├── Kirim satu-persatu ke API                 │
│      ├── Sukses → hapus dari pending, masuk cache  │
│      └── Gagal → tetap pending, retry nanti        │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Strategi Sinkronisasi

| Kondisi | Aksi |
|---------|------|
| App dibuka + online | Ambil data terbaru dari API, update cache SQLite, kirim pending queue |
| App dibuka + offline | Tampilkan data dari cache SQLite. Clock in/out → simpan ke pending queue |
| Koneksi pulih (offline→online) | NetInfo listener trigger sync: kirim pending queue, refresh dashboard |
| Sync gagal (server error) | Retry dengan exponential backoff (5s, 15s, 45s, 135s). Maks 10x, lalu tandai "butuh kirim ulang manual" |
| Konflik (data sudah ada di server) | Server lebih dipercaya. Data lokal yang duplikat → skip, hapus dari pending |

---

## 6. SQLite Database Schema (Local Device)

```sql
-- ============================================
-- Tabel 1: auth_token
-- Menyimpan token Sanctum untuk API requests
-- ============================================
CREATE TABLE IF NOT EXISTS auth_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,       -- 'superadmin','hr','employee'
    employee_id INTEGER,           -- null jika bukan karyawan
    employee_name TEXT,
    employee_position TEXT,
    employee_mobile_role TEXT,     -- 'karyawan','supervisor','management'
    tenant_slug TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Tabel 2: cached_employee
-- Cache data profil karyawan yang sedang login
-- ============================================
CREATE TABLE IF NOT EXISTS cached_employee (
    id INTEGER PRIMARY KEY,        -- sama dengan employee_id di server
    name TEXT NOT NULL,
    photo TEXT,                    -- base64 atau file path lokal
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

-- ============================================
-- Tabel 3: pending_attendance (OFFLINE QUEUE)
-- Antrian clock in/out yang belum terkirim
-- ============================================
CREATE TABLE IF NOT EXISTS pending_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,            -- 'clock_in' | 'clock_out'
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    selfie_photo TEXT,             -- base64 foto selfie
    recorded_at TEXT NOT NULL,     -- waktu lokal device (ISO 8601)
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 10,
    last_error TEXT,
    status TEXT DEFAULT 'pending', -- 'pending' | 'syncing' | 'failed'
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Tabel 4: cached_attendance
-- Cache riwayat absensi (7 hari terakhir)
-- ============================================
CREATE TABLE IF NOT EXISTS cached_attendance (
    id INTEGER PRIMARY KEY,        -- sama dengan attendance.id di server
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    distance_meter REAL,
    selfie_photo TEXT,
    status TEXT,
    work_location_name TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Tabel 5: cached_schedules
-- Cache jadwal karyawan (30 hari ke depan)
-- ============================================
CREATE TABLE IF NOT EXISTS cached_schedules (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL,            -- YYYY-MM-DD
    shift_name TEXT,
    shift_start TEXT,              -- HH:MM
    shift_end TEXT,                -- HH:MM
    is_holiday INTEGER DEFAULT 0,
    is_leave INTEGER DEFAULT 0,
    is_permit INTEGER DEFAULT 0,
    status TEXT,
    UNIQUE(employee_id, date)
);

-- ============================================
-- Tabel 6: cached_leave_requests
-- Cache pengajuan izin/cuti/sakit
-- ============================================
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

-- ============================================
-- Tabel 7: cached_announcements
-- Cache pengumuman terbaru (maks 50)
-- ============================================
CREATE TABLE IF NOT EXISTS cached_announcements (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    published_at TEXT,
    created_at TEXT
);

-- ============================================
-- Tabel 8: app_settings
-- Pengaturan lokal device
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Default settings:
-- 'api_base_url' → 'https://{slug}-absensi.megakomsel.com/api/v1'
-- 'last_sync_at' → ISO 8601
-- 'offline_mode_enabled' → '1'
-- 'biometric_enabled' → '0'
-- 'pin_length' → '6'
-- 'theme' → 'teal'
```

---

## 7. Screen List & Navigation

```
Root Navigator (Stack)
│
├── [Auth Flow] — Stack Navigator
│   ├── SplashScreen        ← auto-detect token di SQLite
│   ├── TenantScreen        ← input/memilih tenant slug (pertama kali)
│   ├── RegisterScreen      ← email + nama + password
│   ├── SetPinScreen        ← PIN 4-6 digit (setelah register)
│   ├── SetupScreen         ← input kode unik HR
│   ├── SetupFaceScreen     ← scan wajah (video → kirim ke server)
│   ├── LoginScreen         ← PIN keypad + tab email/password
│   └── SsoScreen           ← handle deep link SSO dari Central
│
├── [Main Flow] — Bottom Tab Navigator
│   ├── DashboardScreen     ← tab 1: status hari ini, ringkasan
│   ├── ClockScreen         ← tab 2: halaman absen (kamera + GPS)
│   ├── AttendanceScreen    ← tab 3: riwayat absensi
│   └── ProfileScreen       ← tab 4: profil & menu lainnya
│
└── [Sub Screens] — Stack Navigator (push dari tab)
    ├── LeaveRequestScreen      ← form izin/cuti/sakit + riwayat
    ├── OvertimeRequestScreen   ← form pengajuan lembur
    ├── CalendarScreen          ← kalender jadwal
    ├── VisitScreen             ← kunjungan (selfie + GPS + keterangan)
    ├── VisitListScreen         ← daftar kunjungan
    ├── TaskListScreen          ← daftar tugas
    ├── TaskDetailScreen        ← detail tugas + update status
    ├── AnnouncementListScreen  ← daftar pengumuman
    ├── AnnouncementDetailScreen← detail pengumuman
    ├── ProfileDetailScreen     ← biodata lengkap + dokumen
    ├── DocumentViewerScreen    ← lihat dokumen (PDF/gambar)
    ├── FaceEnrollScreen        ← enroll ulang wajah
    ├── PinChangeScreen         ← ganti PIN
    └── SettingsScreen          ← pengaturan app
```

### Navigasi per Role

| Role | Tab yang tampil | Sub screen yang bisa diakses |
|------|-----------------|------------------------------|
| **karyawan** | Dashboard, Clock, Attendance, Profile | Leave, Overtime, Calendar, Visit, Tasks, Announcements, ProfileDetail, Documents, FaceEnroll, PinChange, Settings |
| **supervisor** | Dashboard, Clock, Attendance, Profile | Semua di atas + bisa filter jadwal per group |
| **management** | Dashboard, Attendance, Profile | Tasks (buat), Announcements (buat), ProfileDetail, Settings. **TIDAK bisa clock in/out** |
| **superadmin/hr** | Dashboard, Attendance, Profile | Semua — tapi clock in/out hanya jika punya record karyawan |

---

## 8. Screen Specifications

### 8.1 SplashScreen

```
┌──────────────────────────────┐
│                              │
│         [LOGO TEAL]          │
│      (scale-in anim)         │
│                              │
│    ◌ loading circle          │
│    (1.5 detik)               │
│                              │
└──────────────────────────────┘
```

**Logic:**
1. Cek `auth_token` di SQLite → jika ada & belum expired → langsung ke Dashboard
2. Cek `app_settings` untuk `api_base_url` → jika tidak ada → ke TenantScreen
3. Jika token tidak ada → ke LoginScreen
4. Jika token ada tapi expired → hapus token, ke LoginScreen

### 8.2 TenantScreen

```
┌──────────────────────────────┐
│  Pilih Tenant                │
│                              │
│  ┌────────────────────────┐  │
│  │ Nama Toko / Slug       │  │
│  │ contoh: tokoa          │  │
│  └────────────────────────┘  │
│                              │
│  [ Lanjutkan ]               │
│                              │
│  URL: {slug}-absensi.        │
│        megakomsel.com        │
└──────────────────────────────┘
```

**Input**: tenant slug → konstruksi `api_base_url` = `https://{slug}-absensi.megakomsel.com/api/v1`
**Simpan** ke `app_settings` table. Hanya muncul sekali (first launch).

### 8.3 LoginScreen

```
┌──────────────────────────────┐
│  [LOGO]                      │
│  Absensi                     │
│                              │
│  ┌───┬───┬───┐               │
│  │ Tab PIN │ Tab Email │     │
│  ├───┴───┴───┤               │
│  │            │               │
│  │  ┌──────────────────────┐ │
│  │  │ ● ● ● ● ● ● │        │ │
│  │  └──────────────────────┘ │
│  │            │               │
│  │  ┌───┬───┬───┐            │
│  │  │ 1 │ 2 │ 3 │            │
│  │  ├───┼───┼───┤            │
│  │  │ 4 │ 5 │ 6 │            │
│  │  ├───┼───┼───┤            │
│  │  │ 7 │ 8 │ 9 │            │
│  │  ├───┼───┼───┤            │
│  │  │ ⌫ │ 0 │ → │            │
│  │  └───┴───┴───┘            │
│                              │
│  Email: user@email.com       │
│  (prefill dari last login)   │
│                              │
│  [Login Biometrik] 🔐        │
│                              │
│  Belum punya akun? Daftar    │
└──────────────────────────────┘
```

**Tab PIN:**
- Keypad 0-9 + hapus
- Email terisi otomatis (dari `app_settings.last_email`)
- 6 digit → auto-submit ke `POST /api/v1/auth/pin-login`
- Gagal → getar + clear + pesan error
- 5x salah → pesan "Coba lagi dalam X detik"

**Tab Email:**
- Input email + password + tombol Login
- Submit ke `POST /api/v1/auth/login`

**Login Biometrik:**
- Cek `app_settings.biometric_enabled`
- Jika enabled → `expo-local-authentication` → fingerprint/face ID
- Dapat credential → `POST /api/v1/auth/webauthn/login`

**Setelah login sukses:**
1. Simpan token ke `auth_token` SQLite
2. Simpan user data ke `auth_token` SQLite
3. Jika user belum punya `employee_id` → arahkan ke SetupScreen
4. Jika user punya `employee_id` tapi belum enroll wajah → arahkan ke SetupFaceScreen
5. Jika semua lengkap → Dashboard

### 8.4 RegisterScreen

```
┌──────────────────────────────┐
│  Daftar Akun                 │
│                              │
│  Nama Lengkap                │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Email                       │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Password (min 8 karakter)   │
│  ┌────────────────────────┐  │
│  │ ●●●●●●●●              │  │
│  └────────────────────────┘  │
│                              │
│  [ Daftar ]                  │
│                              │
│  Sudah punya akun? Login     │
└──────────────────────────────┘
```

**Flow:**
1. `POST /api/v1/auth/register` → dapat token
2. Simpan token & user ke SQLite
3. Auto-navigate ke SetPinScreen

### 8.5 SetPinScreen

```
┌──────────────────────────────┐
│  Atur PIN                    │
│                              │
│  PIN 4-6 digit untuk         │
│  login cepat sehari-hari     │
│                              │
│  ┌──────────────────────────┐│
│  │  ● ● ● ● ● ●           ││
│  └──────────────────────────┘│
│                              │
│  ┌───┬───┬───┐               │
│  │ 1 │ 2 │ 3 │               │
│  ├───┼───┼───┤               │
│  │ 4 │ 5 │ 6 │               │
│  ├───┼───┼───┤               │
│  │ 7 │ 8 │ 9 │               │
│  ├───┼───┼───┤               │
│  │ ⌫ │ 0 │ → │               │
│  └───┴───┴───┘               │
│                              │
│  [ Simpan PIN ]              │
└──────────────────────────────┘
```

**Flow:**
1. User input PIN 4-6 digit
2. Konfirmasi PIN (input ulang)
3. `POST /api/v1/auth/set-pin` (pakai token dari register)
4. Sukses → SetupScreen

### 8.6 SetupScreen (Kode Unik)

```
┌──────────────────────────────┐
│  Pengaturan Awal             │
│                              │
│  Masukkan kode unik dari HR  │
│  ┌────────────────────────┐  │
│  │ KODE123                │  │
│  └────────────────────────┘  │
│                              │
│  ✅ Nama karyawan muncul:    │
│     Budi Santoso             │
│     Kasir - Toko Pusat       │
│                              │
│  ┌────────────────────────┐  │
│  │ 📷 Scan Wajah          │  │
│  │ (video liveness)       │  │
│  └────────────────────────┘  │
│                              │
│  [Simpan] (aktif setelah     │
│   kode valid + wajah scan)   │
└──────────────────────────────┘
```

**Flow:**
1. User input kode unik → `POST /api/v1/auth/verify-invite`
2. Sukses → tampilkan nama karyawan di bawah field
3. User klik "Scan Wajah" → navigasi ke SetupFaceScreen
4. Kembali dari SetupFaceScreen → tombol Simpan aktif
5. Klik Simpan → `POST /api/v1/auth/link-employee`
6. Sukses → simpan employee data ke SQLite → Dashboard

### 8.7 SetupFaceScreen

```
┌──────────────────────────────┐
│  Scan Wajah                  │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   [KAMERA PREVIEW]     │  │
│  │   (selfie camera)      │  │
│  │                        │  │
│  │   ┌──────────────┐     │  │
│  │   │ oval face     │     │  │
│  │   │ guide         │     │  │
│  │   └──────────────┘     │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Putar kepala perlahan       │
│  (kiri-kanan-atas-bawah)     │
│                              │
│  Progress: ████████░░ 80%    │
│                              │
│  [ Batal ]                   │
└──────────────────────────────┘
```

**Flow:**
1. `expo-camera` buka kamera depan (facingMode: front)
2. Rekam video pendek (5-10 detik) atau ambil beberapa frame
3. Tampilkan oval guide untuk posisi wajah
4. Instruksi: "Putar kepala perlahan" (liveness detection)
5. Kirim video/frames ke server → `POST /api/v1/face/enroll` (ENDPOINT BELUM ADA — perlu dibuat di backend)
6. Sukses → kembali ke SetupScreen dengan flag `face_enrolled = true`
7. Face recognition endpoint harus dibuat di Laravel API:
   - `POST /api/v1/face/enroll` — terima multipart video/frames → simpan template di `face_templates`
   - `POST /api/v1/face/verify` — terima foto → cocokkan dengan template → return `{ match: true/false, confidence: 0.95 }`

### 8.8 DashboardScreen

```
┌──────────────────────────────┐
│  Selamat Pagi, Budi          │
│                              │
│  ┌────────────────────────┐  │
│  │ Status Hari Ini        │  │
│  │ ● Sedang Bekerja       │  │
│  │                         │  │
│  │ Clock In  │ Clock Out  │  │
│  │ 08:00     │ --:--      │  │
│  │                         │  │
│  │ Lokasi: Toko Pusat      │  │
│  └────────────────────────┘  │
│                              │
│  ┌─────────┐ ┌─────────┐    │
│  │ ⏰      │ │ 📋      │    │
│  │ Absen   │ │ Izin/   │    │
│  │         │ │ Cuti     │    │
│  └─────────┘ └─────────┘    │
│  ┌─────────┐ ┌─────────┐    │
│  │ 📍      │ │ 📝      │    │
│  │ Kunjungan│ │ Tugas   │    │
│  └─────────┘ └─────────┘    │
│  ┌─────────┐ ┌─────────┐    │
│  │ 📅      │ │ 📢      │    │
│  │ Jadwal   │ │ Pengumuman│  │
│  └─────────┘ └─────────┘    │
│                              │
│  Riwayat Hari Ini            │
│  ┌────────────────────────┐  │
│  │ ✅ 08:00 - Clock In    │  │
│  │    Toko Pusat · 12m    │  │
│  │ 📸 [thumbnail selfie]  │  │
│  └────────────────────────┘  │
│                              │
│  [🏠] [⏰] [📊] [👤]        │  ← Bottom Tab
└──────────────────────────────┘
```

**Data loading:**
1. **Pertama**: tampilkan dari SQLite cache (`cached_attendance`, `cached_schedules`)
2. **Background**: fetch dari API → update cache
3. **Pull-to-refresh**: fetch ulang dari API
4. **Offline**: tetap tampilkan data cache, tampilkan banner "Offline"

**Menu grid berubah berdasarkan role:**
- karyawan: Absen, Izin/Cuti, Kunjungan, Tugas, Jadwal, Pengumuman
- supervisor: Absen, Izin/Cuti, Kunjungan, Tugas, Jadwal, Pengumuman (+ menu Group di Profile)
- management: tanpa Absen — diganti Monitoring, Task, Pengumuman

### 8.9 ClockScreen

```
┌──────────────────────────────┐
│  ← Kembali    Absensi        │
│                              │
│  ┌────────────────────────┐  │
│  │ 📍 Toko Pusat          │  │
│  │ Radius 100m · ✅ Dalam │  │
│  │ Area                   │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   [KAMERA PREVIEW]     │  │
│  │   (selfie camera)      │  │
│  │   dengan overlay       │  │
│  │   lingkaran + animasi  │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Posisikan wajah di tengah   │
│                              │
│  ┌────────────────────────┐  │
│  │  CLOCK IN SEKARANG     │  │ ← tombol besar, warna teal
│  └────────────────────────┘  │  (atau CLOCK OUT, warna merah)
│                              │
│  Waktu server: 14:30:00      │
└──────────────────────────────┘
```

**Flow Clock In:**
1. Buka kamera (`expo-camera`, facingMode: front)
2. Ambil GPS (`expo-location`, highAccuracy: true)
3. User tapping tombol → ambil foto (capturePhoto)
4. Stamp foto dengan overlay: nama, waktu, koordinat, label "CLOCK IN"
5. Kompres JPEG 70%, max 800px lebar
6. Kirim ke API: `POST /api/v1/attendance/clock-in`
   ```json
   {
     "latitude": -6.2088,
     "longitude": 106.8456,
     "selfie_photo": "data:image/jpeg;base64,..."
   }
   ```
7. **Jika offline** → simpan ke `pending_attendance` SQLite
8. Sukses → notifikasi "Clock In berhasil (jarak 12m)" → kembali ke Dashboard setelah 2 detik

**Flow Clock Out:** Sama, tapi endpoint `POST /api/v1/attendance/clock-out`

**Status clock in/out:**
- Cek sesi terbuka dari `GET /api/v1/attendance/me?date=today`
- Record terakhir `clock_in` → tampilkan tombol "Clock Out"
- Record terakhir `clock_out` atau kosong → tampilkan tombol "Clock In"

### 8.10 AttendanceScreen

```
┌──────────────────────────────┐
│  Riwayat Absensi             │
│                              │
│  ┌───┬───┬───┬───┬───┬───┐   │
│  │ S │ S │ R │ K │ J │ S │   │  ← Week strip, tap ganti tanggal
│  │ 8 │ 9 │10 │11 │12 │13 │   │
│  └───┴───┴───┴───┴───┴───┘   │
│                              │
│  📊 Bulan Ini                │
│  Hadir: 8  │ Izin: 1 │ ...  │
│  Telat: 2  │ Alpha: 0 │     │
│                              │
│  ┌────────────────────────┐  │
│  │ 12 Agustus 2026        │  │
│  │ ✅ 08:00 Clock In      │  │
│  │    Toko Pusat · 12m    │  │
│  │    [thumb selfie]      │  │
│  │ ✅ 17:00 Clock Out     │  │
│  │    Toko Pusat · 8m     │  │
│  │    [thumb selfie]      │  │
│  ├────────────────────────┤  │
│  │ 11 Agustus 2026        │  │
│  │ ⚠️ 08:30 Clock In     │  │
│  │    Toko Pusat · 15m    │  │
│  │    (Terlambat 30 menit)│  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Data:** `GET /api/v1/attendance/me?date=YYYY-MM-DD` + cache di SQLite

### 8.11 LeaveRequestScreen

```
┌──────────────────────────────┐
│  Pengajuan                   │
│                              │
│  ┌───┬───┬───┐               │
│  │Izin│Cuti│Sakit│           │  ← tab jenis
│  └───┴───┴───┘               │
│                              │
│  Tanggal Mulai               │
│  ┌────────────────────────┐  │
│  │ 2026-08-15             │  │
│  └────────────────────────┘  │
│                              │
│  Tanggal Selesai             │
│  ┌────────────────────────┐  │
│  │ 2026-08-15             │  │
│  └────────────────────────┘  │
│                              │
│  Alasan                      │
│  ┌────────────────────────┐  │
│  │ Ada keperluan keluarga │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Lampiran (opsional)         │
│  📎 [Pilih File]             │
│                              │
│  [ Kirim Pengajuan ]         │
│                              │
│  ─── Riwayat ─────────────── │
│  ┌────────────────────────┐  │
│  │ ⏳ Izin - 12 Agustus   │  │
│  │    Pending         [X] │  │ ← batalkan
│  │ ✅ Cuti - 5 Agustus    │  │
│  │    Disetujui           │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**API:**
- `GET /api/v1/leave-requests/me` — riwayat
- `POST /api/v1/leave-requests` — buat baru
- `POST /api/v1/leave-requests/{id}/cancel` — batalkan

### 8.12 OvertimeRequestScreen

```
┌──────────────────────────────┐
│  Pengajuan Lembur            │
│                              │
│  Tanggal                     │
│  ┌────────────────────────┐  │
│  │ 2026-08-15             │  │
│  └────────────────────────┘  │
│                              │
│  Jam Mulai      Jam Selesai  │
│  ┌──────────┐  ┌──────────┐  │
│  │ 18:00    │  │ 21:00    │  │
│  └──────────┘  └──────────┘  │
│                              │
│  Alasan                      │
│  ┌────────────────────────┐  │
│  │ Menyelesaikan laporan  │  │
│  └────────────────────────┘  │
│                              │
│  [ Kirim Pengajuan ]         │
│                              │
│  ─── Riwayat ─────────────── │
│  (sama seperti leave)        │
└──────────────────────────────┘
```

> **Catatan**: Backend endpoint overtime BELUM ADA. Perlu dibuat: `POST /api/v1/overtime-requests`, `GET /api/v1/overtime-requests/me`, `POST /api/v1/overtime-requests/{id}/cancel`.

### 8.13 CalendarScreen

```
┌──────────────────────────────┐
│  Jadwal Kerja                │
│                              │
│  ◀ Agustus 2026 ▶           │
│                              │
│  ┌───┬───┬───┬───┬───┬───┐   │
│  │Mg │Sn │Sl │Rb │Km │Jm │   │
│  ├───┼───┼───┼───┼───┼───┤   │
│  │   │   │   │   │   │ 1 │   │
│  │   │   │   │   │   │ P │   │
│  ├───┼───┼───┼───┼───┼───┤   │
│  │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │   │
│  │ M │ P │ P │ P │ P │ L │   │ ← M=Masuk, P=Pagi, L=Libur
│  ├───┼───┼───┼───┼───┼───┤   │
│  │ ...                        │
│  └───┴───┴───┴───┴───┴───┘   │
│                              │
│  ┌────────────────────────┐  │
│  │ 5 Agustus 2026         │  │
│  │ Shift Pagi: 08:00-17:00│  │
│  │ Check-in: 07:00-09:00  │  │
│  │ Toleransi: 15 menit    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Data:** `GET /api/v1/schedule-snapshots/me?from=YYYY-MM-01&to=YYYY-MM-31`
**Supervisor:** bisa pilih group via dropdown → `GET /api/v1/schedule-snapshots/me?group_id=N`

### 8.14 VisitScreen

```
┌──────────────────────────────┐
│  Kunjungan Baru              │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   [KAMERA PREVIEW]     │  │
│  │   (selfie camera)      │  │
│  │                        │  │
│  └────────────────────────┘  │
│  [Ambil Foto]                │
│                              │
│  📍 Koordinat (auto-detect)  │
│  -6.208800, 106.845600       │
│                              │
│  Keterangan                  │
│  ┌────────────────────────┐  │
│  │ Kunjungan ke toko      │  │
│  │ cabang baru            │  │
│  └────────────────────────┘  │
│                              │
│  [ Simpan Kunjungan ]        │
└──────────────────────────────┘
```

> **Catatan**: Backend endpoint visits BELUM ADA. Perlu dibuat: `POST /api/v1/visits`, `GET /api/v1/visits/me`.

### 8.15 TaskListScreen & TaskDetailScreen

```
┌──────────────────────────────┐
│  Tugas                       │
│                              │
│  ┌───┬───────┬───┐           │
│  │Pending│Proses│Selesai│    │
│  └───┴───────┴───┘           │
│                              │
│  ┌────────────────────────┐  │
│  │ ⬜ Stok Opname          │  │
│  │   Due: 15 Agustus       │  │
│  │   Dari: HR              │  │
│  ├────────────────────────┤  │
│  │ ✅ Bersihkan Gudang     │  │
│  │   Selesai: 10 Agustus   │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Task Detail:**
```
┌──────────────────────────────┐
│  Stok Opname                 │
│                              │
│  Dari: HR (Bpk. Ahmad)       │
│  Deadline: 15 Agustus 2026   │
│                              │
│  Deskripsi:                  │
│  Lakukan opname seluruh      │
│  stok di gudang utama.       │
│  Hasil dilaporkan ke HR.     │
│                              │
│  Status:                     │
│  ◉ Pending                   │
│  ◉ In Progress               │
│  ◉ Done                      │
│                              │
│  [ Update Status ]           │
└──────────────────────────────┘
```

> **Catatan**: Backend endpoint tasks BELUM ADA. Perlu dibuat: `GET /api/v1/tasks`, `PUT /api/v1/tasks/{id}/status`.

### 8.16 AnnouncementListScreen & DetailScreen

```
┌──────────────────────────────┐
│  Pengumuman                  │
│                              │
│  ┌────────────────────────┐  │
│  │ 📌 Perubahan Jam Kerja │  │
│  │    12 Agustus 2026     │  │
│  │    Mulai minggu depan,  │  │
│  │    shift pagi maju...   │  │
│  ├────────────────────────┤  │
│  │ 📌 Libur Nasional       │  │
│  │    10 Agustus 2026     │  │
│  │    Dalam rangka...      │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

> **Catatan**: Backend endpoint announcements BELUM ADA. Perlu dibuat: `GET /api/v1/announcements`.

### 8.17 ProfileScreen

```
┌──────────────────────────────┐
│  ┌────┐                      │
│  │Foto│ Budi Santoso         │
│  └────┘ Kasir                │
│         Toko Pusat           │
│                              │
│  ─── Menu ────────────────   │
│  👤 Biodata & Dokumen    >   │
│  📅 Jadwal Saya          >   │
│  📊 Rekap Absensi        >   │
│  🔐 Ganti PIN            >   │
│  😊 Scan Ulang Wajah     >   │
│  🔔 Notifikasi           >   │
│  ⚙️ Pengaturan           >   │
│                              │
│  ─── App ────────────────    │
│  ℹ️ Versi 1.0.0             │
│  🚪 Keluar                   │
└──────────────────────────────┘
```

---

## 9. API Integration

### Base URL
```
https://{tenant-slug}-absensi.megakomsel.com/api/v1
```
Disimpan di `app_settings.api_base_url`. Diubah via TenantScreen.

### Auth Header
Setiap request (kecuali register, login, SSO) menyertakan:
```
Authorization: Bearer <token>
```
Token disimpan di `auth_token` SQLite.

### Network Layer (Service Pattern)

```typescript
// services/api.ts — central API client

const API_TIMEOUT = 15000; // 15 detik

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any,
  options?: { timeout?: number }
): Promise<T> {
  // 1. Ambil base_url + token dari SQLite
  const baseUrl = await getSetting('api_base_url');
  const token = await getAuthToken();

  // 2. Buat request dengan AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout || API_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new ApiError(response.status, error.message, error);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(0, 'Koneksi timeout. Coba lagi.');
    }
    throw new ApiError(0, 'Tidak ada koneksi. Data akan disimpan lokal.');
  }
}
```

---

## 10. Offline Sync Service

```typescript
// services/sync.ts

class SyncService {
  private isSyncing = false;
  private netInfoUnsubscribe: (() => void) | null = null;

  // Panggil saat app start
  async start() {
    // Listener koneksi (expo-net-info atau @react-native-community/netinfo)
    // Saat online → syncPendingQueue()
    // Saat offline → no-op
  }

  // Kirim semua antrian pending
  async syncPendingQueue(): Promise<SyncResult> {
    if (this.isSyncing) return { skipped: true };
    this.isSyncing = true;

    try {
      const pending = await db.getAllAsync(
        `SELECT * FROM pending_attendance
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT 20`
      );

      let success = 0;
      let failed = 0;

      for (const item of pending) {
        try {
          await db.runAsync(
            `UPDATE pending_attendance SET status = 'syncing' WHERE id = ?`,
            [item.id]
          );

          await apiRequest('POST', `/attendance/clock-${item.type}`, {
            latitude: item.latitude,
            longitude: item.longitude,
            selfie_photo: item.selfie_photo,
          });

          // Sukses → hapus dari pending, simpan ke cache
          await db.runAsync(
            `DELETE FROM pending_attendance WHERE id = ?`,
            [item.id]
          );
          success++;
        } catch (error) {
          const newRetry = (item.retry_count || 0) + 1;
          await db.runAsync(
            `UPDATE pending_attendance
             SET status = ?, retry_count = ?, last_error = ?
             WHERE id = ?`,
            [newRetry >= item.max_retries ? 'failed' : 'pending',
             newRetry,
             (error as Error).message,
             item.id]
          );
          failed++;
        }
      }

      await this.updateLastSync();
      return { success, failed };
    } finally {
      this.isSyncing = false;
    }
  }

  // Panggil setelah setiap aksi yang mengubah data
  async refreshCache() {
    try {
      // Refresh attendance cache (7 hari terakhir)
      const attendance = await apiRequest('GET', '/attendance/me');
      await db.runAsync(`DELETE FROM cached_attendance WHERE employee_id = ?`, [employeeId]);
      for (const item of attendance.data) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_attendance (...) VALUES (...)`,
          [...]
        );
      }

      // Refresh schedules (30 hari)
      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const to = new Date(today.getTime() + 30*86400000).toISOString().slice(0, 10);
      const schedules = await apiRequest('GET', `/schedule-snapshots/me?from=${from}&to=${to}`);
      // ... update cached_schedules

      // Refresh leave requests
      const leaves = await apiRequest('GET', '/leave-requests/me');
      // ... update cached_leave_requests

      await this.updateLastSync();
    } catch {
      // Offline — no-op, data cache tetap bisa dipakai
    }
  }

  private async updateLastSync() {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_sync_at', ?)`,
      [new Date().toISOString()]
    );
  }
}
```

---

## 11. Komponen yang Perlu Dibuat Ulang

### Reusable Components

| Komponen | Deskripsi | Dipakai di |
|----------|-----------|------------|
| `PinKeypad` | Keypad PIN 0-9, hapus, submit. Animasi getar saat salah | LoginScreen, SetPinScreen |
| `CameraPreview` | Kamera selfie dengan overlay guide (oval face / lingkaran) | ClockScreen, SetupFaceScreen, VisitScreen |
| `GpsStatusCard` | Status GPS: lokasi, radius, indikator dalam/luar area | ClockScreen |
| `StatusBadge` | Badge status: Hadir/Izin/Sakit/Alpha, Pending/Disetujui/Ditolak | AttendanceScreen, LeaveRequestScreen |
| `CalendarStrip` | Horizontal scroll strip 7 hari, tap ganti tanggal | AttendanceScreen |
| `MonthCalendar` | Grid kalender bulanan dengan marker shift/libur | CalendarScreen |
| `MenuItem` | Row menu dengan icon + teks + chevron | ProfileScreen |
| `OfflineBanner` | Banner kuning "Anda sedang offline" di atas layar | Semua screen |
| `EmptyState` | Ilustrasi + teks "Belum ada data" | Semua list screen |
| `LoadingOverlay` | Overlay loading dengan spinner | Semua screen |
| `SelfieThumbnail` | Thumbnail foto selfie kecil (bisa di-tap untuk fullscreen) | AttendanceScreen, DashboardScreen |

### Custom Hooks

| Hook | Fungsi |
|------|--------|
| `useAuth()` | Login, logout, register, setPin, cek status auth dari SQLite |
| `useAttendance()` | Clock in/out, riwayat, status sesi (online + offline queue) |
| `useLocation()` | GPS: getCurrentPosition, watchPosition, cek radius |
| `useCamera()` | Kamera: buka/tutup, ambil foto, rekam video, kompres |
| `useNetwork()` | Cek status koneksi (online/offline), listener perubahan |
| `useOfflineSync()` | Trigger sync, status pending, retry failed |
| `useBiometric()` | Cek ketersediaan biometrik, authenticate |
| `useApi()` | Wrapper fetch dengan token, timeout, error handling |
| `useCache()` | Baca/tulis SQLite cache |

---

## 12. Backend Endpoints yang Perlu Dibuat (Gap)

Sebelum mobile app bisa fitur-complete, endpoint berikut HARUS dibuat di Laravel API:

### Critical (harus ada sebelum mobile app rilis)

| # | Endpoint | Deskripsi | Status |
|---|----------|-----------|--------|
| 1 | `POST /api/v1/face/enroll` | Terima video/frames → simpan embedding ke `face_templates` | ❌ BELUM |
| 2 | `POST /api/v1/face/verify` | Terima foto → cocokkan dengan template → `{match, confidence}` | ❌ BELUM |
| 3 | `POST /api/v1/leave-requests/{id}/approve` | HR approve pengajuan | ❌ BELUM |
| 4 | `POST /api/v1/leave-requests/{id}/reject` | HR reject pengajuan | ❌ BELUM |
| 5 | Model + migration `overtime_requests` | Tabel lembur | ❌ BELUM |
| 6 | `POST /api/v1/overtime-requests` | Karyawan buat pengajuan lembur | ❌ BELUM |
| 7 | `GET /api/v1/overtime-requests/me` | Karyawan lihat riwayat lembur | ❌ BELUM |
| 8 | `GET /api/v1/attendance/export` | Export Excel/CSV | ❌ BELUM |

### Should (perlu segera setelah critical)

| # | Endpoint | Deskripsi | Status |
|---|----------|-----------|--------|
| 9 | Model + migration `visits` | Tabel kunjungan | ❌ BELUM |
| 10 | `POST /api/v1/visits` | Karyawan buat kunjungan | ❌ BELUM |
| 11 | `GET /api/v1/visits/me` | Karyawan lihat riwayat kunjungan | ❌ BELUM |
| 12 | Model + migration `tasks` | Tabel tugas | ❌ BELUM |
| 13 | `GET /api/v1/tasks/me` | Karyawan lihat tugas sendiri | ❌ BELUM |
| 14 | `PUT /api/v1/tasks/{id}/status` | Karyawan update status tugas | ❌ BELUM |
| 15 | Model + migration `announcements` | Tabel pengumuman | ❌ BELUM |
| 16 | `GET /api/v1/announcements` | List pengumuman | ❌ BELUM |
| 17 | `GET /api/v1/me` | Biodata karyawan + employee submodules | ❌ BELUM |
| 18 | `GET /api/v1/me/documents` | Dokumen karyawan | ❌ BELUM |
| 19 | Model + migration `settings` (per-tenant) | Konfigurasi tenant | ❌ BELUM |
| 20 | Tambah kolom `face_verified` + `face_mode` ke `attendances` | Migration | ❌ BELUM |

---

## 13. Project Structure

```
absensi-mobile/
├── app.json                        # Expo config
├── App.tsx                         # Root component + navigation container
├── package.json
├── tsconfig.json
├── babel.config.js
├── eas.json                        # EAS Build config
│
├── assets/
│   ├── icon.png                    # App icon 1024x1024
│   ├── splash.png                  # Splash screen 1284x2778
│   ├── adaptive-icon.png           # Android adaptive icon
│   ├── logo-teal.png               # Logo untuk splash screen
│   └── fonts/
│       └── Inter-Variable.ttf      # Font utama
│
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Auth vs Main flow switch
│   │   ├── AuthNavigator.tsx       # Stack: Splash → Tenant → Login → Register → Setup
│   │   ├── MainTabNavigator.tsx    # Bottom tabs: Dashboard, Clock, Attendance, Profile
│   │   └── SubNavigator.tsx        # Stack: Leave, Overtime, Calendar, Visit, Tasks, dll
│   │
│   ├── screens/
│   │   ├── SplashScreen.tsx
│   │   ├── TenantScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── SetPinScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   ├── SetupFaceScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ClockScreen.tsx
│   │   ├── AttendanceScreen.tsx
│   │   ├── LeaveRequestScreen.tsx
│   │   ├── OvertimeRequestScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── VisitScreen.tsx
│   │   ├── VisitListScreen.tsx
│   │   ├── TaskListScreen.tsx
│   │   ├── TaskDetailScreen.tsx
│   │   ├── AnnouncementListScreen.tsx
│   │   ├── AnnouncementDetailScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ProfileDetailScreen.tsx
│   │   ├── DocumentViewerScreen.tsx
│   │   ├── FaceEnrollScreen.tsx
│   │   ├── PinChangeScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── components/
│   │   ├── PinKeypad.tsx
│   │   ├── CameraPreview.tsx
│   │   ├── GpsStatusCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CalendarStrip.tsx
│   │   ├── MonthCalendar.tsx
│   │   ├── MenuItem.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingOverlay.tsx
│   │   └── SelfieThumbnail.tsx
│   │
│   ├── services/
│   │   ├── api.ts                  # HTTP client (fetch wrapper + token + timeout)
│   │   ├── database.ts             # SQLite initialization + helpers
│   │   ├── sync.ts                 # Offline sync service
│   │   └── photo.ts                # Foto: capture, kompres, stamp overlay
│   │
│   ├── stores/                     # Zustand stores
│   │   ├── authStore.ts            # Auth state (token, user, employee)
│   │   ├── attendanceStore.ts      # Riwayat absensi + status sesi
│   │   ├── scheduleStore.ts        # Cache jadwal
│   │   └── appStore.ts             # Settings, network status, sync status
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAttendance.ts
│   │   ├── useLocation.ts
│   │   ├── useCamera.ts
│   │   ├── useNetwork.ts
│   │   ├── useOfflineSync.ts
│   │   ├── useBiometric.ts
│   │   ├── useApi.ts
│   │   └── useCache.ts
│   │
│   ├── types/
│   │   ├── api.ts                  # API response types
│   │   ├── models.ts              # User, Employee, Attendance, dll
│   │   └── navigation.ts          # Navigation param types
│   │
│   ├── utils/
│   │   ├── constants.ts            # Colors, sizes, API paths
│   │   ├── formatters.ts           # Date, time, currency formatters
│   │   ├── validators.ts           # Form validation
│   │   └── storage.ts              # AsyncStorage wrapper (untuk non-SQLite data)
│   │
│   └── theme/
│       ├── colors.ts               # Teal palette (#0f766e primary)
│       ├── typography.ts           # Font sizes & weights
│       └── spacing.ts              # Spacing scale
```

---

## 14. Dependencies (package.json)

```json
{
  "name": "absensi-mobile",
  "version": "1.0.0",
  "main": "App.tsx",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build:android": "eas build --platform android --profile production",
    "build:ios": "eas build --platform ios --profile production",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-camera": "~16.0.0",
    "expo-location": "~18.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-file-system": "~18.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linking": "~7.0.0",
    "expo-haptics": "~14.0.0",
    "expo-constants": "~17.0.0",
    "expo-device": "~7.0.0",
    "expo-updates": "~0.26.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "date-fns": "^3.0.0",
    "react-native-mmkv": "^3.0.0",
    "@react-native-community/netinfo": "^11.0.0",
    "react-native-toast-message": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "~18.3.0",
    "jest": "^29.0.0",
    "jest-expo": "~52.0.0",
    "@testing-library/react-native": "^12.0.0"
  }
}
```

---

## 15. Tema & Design Tokens

### Colors (Teal Palette — selaras dengan PWA existing)

```typescript
// theme/colors.ts
export const Colors = {
  primary: {
    50:  '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',  // ← primary main
    700: '#0f766e',  // ← primary dark (sama dengan theme_color PWA)
    800: '#115e59',
    900: '#134e4a',
  },
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  purple:  '#8b5cf6',
  white:   '#ffffff',
  black:   '#000000',
  // Clock screen dark mode
  dark: {
    bg:      '#111827',
    surface: '#1f2937',
    text:    '#f9fafb',
    muted:   '#9ca3af',
  }
};
```

### Typography
```typescript
export const Typography = {
  h1:      { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2:      { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3:      { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body:    { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold:{ fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  small:   { fontSize: 10, fontWeight: '500' as const, lineHeight: 14 },
};
```

---

## 16. Rencana Implementasi (Urutan Pengerjaan)

### Fase 1: Setup & Auth (kerjakan dulu)
1. `npx create-expo-app absensi-mobile --template blank-typescript`
2. Install dependencies
3. Setup SQLite database (init schema)
4. Setup navigation (Root, Auth, Main, Sub)
5. SplashScreen (cek token → decide route)
6. TenantScreen (input slug → save base URL)
7. LoginScreen (PIN keypad + tab email + biometric)
8. RegisterScreen
9. SetPinScreen
10. SetupScreen + SetupFaceScreen (kode unik + scan wajah)
11. Auth store (Zustand + SQLite persistence)

### Fase 2: Core (absensi)
12. DashboardScreen (status hari ini, menu grid, riwayat)
13. ClockScreen (kamera + GPS + clock in/out)
14. AttendanceScreen (riwayat + calendar strip)
15. Offline sync service
16. API service (fetch wrapper + error handling)
17. Attendance store

### Fase 3: Pengajuan
18. LeaveRequestScreen (form + riwayat + batalkan)
19. OvertimeRequestScreen (form + riwayat)
20. CalendarScreen (jadwal dari schedule-snapshots)

### Fase 4: Fitur Pendukung
21. VisitScreen + VisitListScreen
22. TaskListScreen + TaskDetailScreen
23. AnnouncementListScreen + AnnouncementDetailScreen
24. ProfileScreen + ProfileDetailScreen
25. DocumentViewerScreen
26. SettingsScreen (ganti PIN, biometrik, face enroll ulang, hapus cache)

### Fase 5: Polish & Release
27. Push notifications (expo-notifications)
28. Splash screen native (expo-splash-screen)
29. App icon & branding
30. EAS Build config (Android + iOS)
31. Testing (jest + React Native Testing Library)
32. Play Store + TestFlight submission

---

## 17. Prioritas Backend yang HARUS Dibuat Sebelum Mobile App

**Fase 1-2 mobile app bisa dikerjakan paralel dengan ini:**
- `POST /api/v1/face/enroll` + `POST /api/v1/face/verify` — CRITICAL
- Tambah kolom `face_verified` + `face_mode` ke `attendances` — CRITICAL
- `POST /leave-requests/{id}/approve` + `/reject` — untuk Phase 3

**Fase 3 mobile app butuh:**
- Model + migration + CRUD `overtime_requests` — untuk fitur lembur
- `GET /overtime-requests/me` + `POST /overtime-requests`

**Fase 4 mobile app butuh:**
- Model + migration + API untuk `visits`, `tasks`, `announcements`
- `GET /me` + `GET /me/documents`

---

## 18. Catatan untuk DeepSeek v4 Flash

### Yang bisa dikerjakan model kecil sekalipun:
1. **Setup project** — `create-expo-app` + install deps
2. **SQLite schema** — CREATE TABLE statements di atas tinggal copy-paste
3. **Screens UI** — setiap screen sudah ada layout detailnya
4. **Navigation** — struktur navigator sudah ditentukan
5. **API client** — fetch wrapper sederhana
6. **Komponen reusable** — PinKeypad, StatusBadge, dll

### Yang perlu perhatian ekstra:
1. **Offline sync** — pastikan queue + retry logic benar. Gunakan `NetInfo` listener
2. **Face recognition** — device hanya kirim foto/video. Server yang proses. Jangan coba jalanin TF.js di React Native
3. **GPS accuracy** — `expo-location` dengan `LocationAccuracy.High`. Timeout 15 detik. Fallback: izinkan absen tanpa GPS dengan flag
4. **Foto selfie** — harus di-stamp dengan overlay (waktu, koordinat, label). Gunakan `expo-image-manipulator` atau canvas
5. **SQLite di Expo** — gunakan `expo-sqlite` API terbaru (async/await), bukan yang legacy

### Yang bisa di-skip dulu:
- Push notifications (butuh Firebase setup)
- EAS Build (fokus development dulu)
- Testing (tulis setelah fitur stabil)
- iOS-specific handling (fokus Android dulu)

---

## Perubahan dari PRD Sebelumnya (Web App)

- **v1.0 (2026-08-12):** PRD pertama untuk mobile app native.
  - Stack: React Native + Expo SDK 52 + SQLite 3
  - Arsitektur: offline-first dengan SQLite sebagai cache & queue lokal, backend Laravel API tetap (tidak diganti)
  - Semua screen dispesifikasikan dengan layout + flow detail
  - 8 tabel SQLite untuk penyimpanan lokal
  - Sync service untuk offline→online
  - 19 komponen reusable + 9 custom hooks
  - 20 endpoint backend yang perlu dibuat sebelum mobile app rilis
  - Backend gap analysis dari PRD web v0.4
