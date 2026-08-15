# Absensi Mobile

Aplikasi absensi mobile **Android + iOS** untuk karyawan megakomsel.com — client native dari backend Laravel API yang sudah ada, dibangun sesuai [PRD_ABSENSI_MOBILE.md](H:\laragon\www\portal-app\docs\PRD_ABSENSI_MOBILE.md).

## Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | React Native + Expo SDK 54 (min. PRD: SDK 52+) |
| Bahasa | TypeScript (strict) |
| State | Zustand + TanStack React Query |
| Navigasi | React Navigation (root stack → auth stack / bottom tabs + sub stack) |
| Database lokal | SQLite (`expo-sqlite`) — 8 tabel: auth_token, cached_employee, pending_attendance, cached_attendance, cached_schedules, cached_leave_requests, cached_announcements, app_settings |
| Offline-first | Queue `pending_attendance` + sync service dengan NetInfo listener & exponential backoff (5s/15s/45s/135s, maks 10x) |
| Kamera | `expo-camera` (selfie front + guide oval, video liveness) |
| GPS | `expo-location` (high accuracy, timeout 15 detik) |
| Biometrik | `expo-local-authentication` (fingerprint / Face ID) |
| Face embedding | TensorFlow.js (`@tensorflow/tfjs-react-native`, backend `rn-webgl` via `expo-gl`) + model `faceres` 128-d (vladmandic/human, ~7MB di-bundle offline) — embedding dihitung **di device** (mode client), matching Euclidean tetap **di server** |
| Foto selfie | Kompres JPEG 70% maks 800px + stamp overlay (nama, waktu, koordinat, label) via `react-native-view-shot` |

## Menjalankan

```bash
npm install
npx expo start          # Expo Go / development build
npx expo start --android
npm run typecheck       # verifikasi TypeScript
```

Build produksi (EAS):

```bash
npx eas build --platform android --profile preview   # APK internal
npm run build:android                                 # AAB produksi
npm run build:ios
```

## Alur Awal Pengguna

1. **Splash** — deteksi token & tenant di SQLite.
2. **Tenant** — input slug → `https://{slug}-absensi.megakomsel.com/api/v1` disimpan ke `app_settings`.
3. **Login** — tab PIN (keypad 6 digit, auto-submit) / tab Email / biometrik; 5x salah → lock 30 detik.
4. **Register → Atur PIN (4–6 digit) → Setup (kode unik HR) → Scan Wajah** — `face_enrolled` disimpan lokal; bisa dilewati dan di-scan ulang nanti dari Profil.
5. **Dashboard** — data dari cache SQLite dulu, lalu refresh dari API (pull-to-refresh).

## Arsitektur Offline-First

```text
[User] ──► Login ──► Dashboard (cache dulu, refresh background)
              │
              ▼
        [Clock In/Out]
              │
      ├─ ONLINE ─► POST /attendance/clock-* → simpan + refresh cache
      │
      └─ OFFLINE ─► INSERT pending_attendance (status pending)
                    └─ NetInfo pulih → SyncService kirim queue
                       sukses → hapus dari queue
                       gagal → retry backoff, maks 10x → status 'failed'
```

Retry dijadwalkan via kolom `next_retry_at` (tambahan kecil dari skema PRD agar backoff bertahan antar-sesi).

## Fitur per Role

- **karyawan**: Dashboard, Clock, Attendance, Profile + Izin/Cuti, Lembur, Jadwal, Kunjungan, Tugas, Pengumuman, Biodata/Dokumen, Ganti PIN, Scan Ulang Wajah, Settings.
- **supervisor**: semua menu karyawan (filter group jadwal disiapkan via `group_id`).
- **management**: Dashboard, Attendance, Profile + Tugas & Pengumuman; **tanpa tab Clock**.
- **superadmin/hr**: semua, clock in/out hanya jika punya record karyawan.

## Endpoint Backend yang Dipakai

Auth: `login`, `pin-login`, `webauthn/login`, `register`, `set-pin`, `change-pin`, `verify-invite`, `link-employee`, `logout`.
Inti: `attendance/clock-in`, `attendance/clock-out`, `attendance/me`, `schedule-snapshots/me`.
Pengajuan: `leave-requests/*` (me, create, cancel), `overtime-requests/*`.
Pendukung: `visits/*`, `tasks/*`, `announcements`, `face/enroll` (mode client), `face/verify`, `me`, `me/documents`.

> Semua endpoint di atas SUDAH tersedia di backend (H:\laragon\www\absensi-app, routes/tenant.php). Face enrollment: device menghitung embedding 128-d (TensorFlow.js, `services/faceEmbedding.ts`) → kirim JSON ke `/face/enroll` dengan mode `client`; server menyimpan template & memverifikasi dengan jarak Euclidean (threshold 0.6).

## Struktur Project

```text
src/
├── navigation/   RootNavigator, AuthNavigator, MainTabNavigator, SubNavigator
├── screens/      26 screen (Splash, Tenant, Login, Register, SetPin, Setup, SetupFace,
│                 Sso, Dashboard, Clock, Attendance, Profile + 15 sub screen)
├── components/   16 komponen reusable (PinKeypad, CameraPreview, GpsStatusCard,
│                 StatusBadge, CalendarStrip, MonthCalendar, OfflineBanner, dll)
├── services/     api.ts (fetch wrapper), database.ts (SQLite), sync.ts, photo.ts
├── stores/       auth, attendance, schedule, app (Zustand)
├── hooks/        9 custom hooks (useAuth, useAttendance, useLocation, useCamera, dll)
├── types/        api, models, navigation
├── utils/        constants, formatters, validators, storage
└── theme/        colors (teal #0f766e), typography, spacing
```

## Keputusan Implementasi (deviasi kecil dari PRD)

- **Expo SDK 54** (PRD mensyaratkan SDK 52+; diturunkan dari 57 ke 54 — RN 0.81.5, React 19.1.0) — semua API dipakai sesuai dokumentasi versi 54 (`CameraView` mode `picture`/`video`, `openDatabaseAsync`, `ImageManipulator.manipulate()`).
- **Face recognition (2026-08)**: embedding dihitung di device dengan TensorFlow.js (`rn-webgl` via `expo-gl`) + model `faceres` 128-d dari vladmandic/human. Model **di-load dari server** `{origin}/models/face-embed/faceres.{json,bin}` (backend serve dari `public/models/face-embed/`), di-download sekali lalu di-cache di `documentDirectory/models/face-embed/` — app online-first, transaksi tetap butuh internet. `SetupFaceScreen` & `FaceEnrollScreen` ambil foto selfie → crop persegi tengah (guide oval) → resize 224x224 → embedding 128-d → `POST /face/enroll` `{ template: JSON, mode: 'client' }`. Matching (Euclidean, threshold 0.6) tetap di server via `FaceRecognitionService`. Model di-load sekali (singleton) & di-dispose saat clear cache.
- **`@react-native-async-storage/async-storage`** menggantikan `react-native-mmkv` agar tetap jalan di Expo Go (PRD sendiri menyebut AsyncStorage di utils/storage).
- **Push notification** sengaja belum diimplementasikan (butuh Firebase) — sesuai catatan "bisa di-skip dulu" di PRD; menu Notifikasi menampilkan placeholder.
- **Stamp selfie** di-render sebagai overlay + `react-native-view-shot` (bundled di Expo Go).
- Kolom tambahan `next_retry_at` di `pending_attendance` untuk backoff yang bertahan.
- `face_enrolled` disimpan di `app_settings` sebagai flag lokal (bukan otoritatif — server punya `GET /face/status`); alur tetap bisa dilewati dan di-scan ulang dari Profil.

## Verifikasi

- `npx tsc --noEmit` — 0 error
- `npx expo-doctor` — 20/20 check lolos
- `npx expo export --platform android` — bundle sukses (1886 modul)
