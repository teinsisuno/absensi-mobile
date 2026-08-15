import { API_TIMEOUT } from '../utils/constants';
import { getAuthToken, getBaseUrl } from './database';
import type { ApiEnvelope, ApiErrorPayload } from '../types/api';

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  formData?: FormData;
}

/**
 * Central API client — baca base_url + token dari SQLite,
 * timeout 15 detik via AbortController.
 */
export async function apiRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  if (!baseUrl) {
    throw new ApiError(0, 'Base URL belum diatur. Masukkan tenant slug dulu.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeout ?? API_TIMEOUT
  );

  let headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  let bodyInit: BodyInit | undefined;
  if (options?.formData) {
    bodyInit = options.formData;
  } else if (body != null) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: bodyInit,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let json: ApiEnvelope<T> | null = null;
    try {
      json = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        json?.message || 'Terjadi kesalahan pada server.',
        (json as ApiErrorPayload) ?? undefined
      );
    }

    return json as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(0, 'Koneksi timeout. Coba lagi.');
    }
    throw new ApiError(0, 'Tidak ada koneksi. Data akan disimpan lokal.');
  }
}

/**
 * Ambil payload `data` dari envelope API Laravel, fallback ke response utuh.
 */
export function getData<T>(response: unknown): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    (response as ApiEnvelope<T>).data !== undefined
  ) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

// ---------- Auth endpoints ----------

export interface PinLoginPayload {
  email: string;
  pin: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('POST', '/auth/login', { email, password }),

  pinLogin: (payload: PinLoginPayload) =>
    apiRequest('POST', '/auth/pin-login', payload),

  webauthnLogin: () => apiRequest('POST', '/auth/webauthn/login', {}),

  register: (payload: { name: string; email: string; password: string }) =>
    apiRequest('POST', '/auth/register', payload),

  setPin: (pin: string) => apiRequest('POST', '/auth/set-pin', { pin }),

  changePin: (currentPin: string, newPin: string) =>
    apiRequest('POST', '/auth/change-pin', { current_pin: currentPin, new_pin: newPin }),

  verifyInvite: (code: string) =>
    apiRequest('POST', '/auth/verify-invite', { code }),

  linkEmployee: (code: string) =>
    apiRequest('POST', '/auth/link-employee', { code }),

  logout: () => apiRequest('POST', '/auth/logout'),
};

// ---------- Attendance endpoints ----------

export const attendanceApi = {
  clockIn: (payload: {
    latitude: number;
    longitude: number;
    selfie_photo?: string;
    force?: boolean;
  }) => apiRequest('POST', '/attendance/clock-in', payload),

  clockOut: (payload: {
    latitude: number;
    longitude: number;
    selfie_photo?: string;
    force?: boolean;
  }) => apiRequest('POST', '/attendance/clock-out', payload),

  me: (date?: string) =>
    apiRequest('GET', date ? `/attendance/me?date=${encodeURIComponent(date)}` : '/attendance/me'),
};

// ---------- Schedule endpoints ----------

export const scheduleApi = {
  me: (from: string, to: string) =>
    apiRequest('GET', `/schedule-snapshots/me?from=${from}&to=${to}`),
};

// ---------- Leave & Overtime endpoints ----------

export const leaveApi = {
  me: () => apiRequest('GET', '/leave-requests/me'),
  create: (payload: {
    type: string;
    start_date: string;
    end_date: string;
    reason?: string;
    attachment?: string | null;
  }) => apiRequest('POST', '/leave-requests', payload),
  cancel: (id: number) => apiRequest('POST', `/leave-requests/${id}/cancel`),
};

export const overtimeApi = {
  me: () => apiRequest('GET', '/overtime-requests/me'),
  create: (payload: {
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }) => apiRequest('POST', '/overtime-requests', payload),
  cancel: (id: number) => apiRequest('POST', `/overtime-requests/${id}/cancel`),
};

// ---------- Visit, Task, Announcement endpoints ----------

export const visitApi = {
  me: () => apiRequest('GET', '/visits/me'),
  create: (payload: {
    latitude: number;
    longitude: number;
    selfie_photo?: string;
    note?: string;
  }) => apiRequest('POST', '/visits', payload),
};

export const taskApi = {
  me: () => apiRequest('GET', '/tasks/me'),
  updateStatus: (id: number, status: string) =>
    apiRequest('PUT', `/tasks/${id}/status`, { status }),
};

export const announcementApi = {
  list: () => apiRequest('GET', '/announcements'),
};

// ---------- Face & Profile endpoints ----------

export const faceApi = {
  /** Enroll wajah — template = JSON string array embedding 128-d (mode client: hitung di device). */
  enroll: (template: string, mode: 'client' | 'server' = 'client') =>
    apiRequest('POST', '/face/enroll', { template, mode }),
  verify: (descriptor: string) =>
    apiRequest('POST', '/face/verify', { descriptor }),
  /** Cek karyawan sudah enroll wajah atau belum → { data: { enrolled: boolean } } */
  status: () => apiRequest('GET', '/face/status'),
};

export const profileApi = {
  me: () => apiRequest('GET', '/me'),
  documents: () => apiRequest('GET', '/me/documents'),
  /** Update foto profil — photo dikirim sebagai data URI base64 (sama seperti selfie_photo). */
  updatePhoto: (photo: string) =>
    apiRequest('POST', '/me/photo', { photo }),
};
