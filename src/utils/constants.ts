export const APP_NAME = 'Absensi';
export const APP_VERSION = '1.0.0';

export const API_TIMEOUT = 15000;
export const PIN_LENGTH = 6;
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

export const SELFIE_MAX_WIDTH = 800;
export const SELFIE_QUALITY = 0.7;

export const GPS_TIMEOUT_MS = 15000;
export const GPS_ACCURACY = 'high';

export const SYNC_BATCH_SIZE = 20;
export const SYNC_MAX_RETRIES = 10;
export const SYNC_BACKOFF_SECONDS = [5, 15, 45, 135];

export const ATTENDANCE_CACHE_DAYS = 7;
export const SCHEDULE_CACHE_DAYS = 30;
export const ANNOUNCEMENT_CACHE_LIMIT = 50;

export const DEFAULT_SETTINGS: Record<string, string> = {
  api_base_url: '',
  last_sync_at: '',
  offline_mode_enabled: '1',
  biometric_enabled: '0',
  pin_length: String(PIN_LENGTH),
  theme: 'teal',
  last_email: '',
};

export const OFFLINE_PENDING_NOTICE =
  'Tersimpan, akan dikirim saat online';

