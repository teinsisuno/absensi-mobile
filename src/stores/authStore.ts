import { create } from 'zustand';
import {
  clearAuthToken,
  clearCachedEmployee,
  getAnyCachedEmployee,
  getAuthToken,
  getAuthRow,
  getCachedEmployee,
  getSetting,
  saveAuthToken,
  saveCachedEmployee,
  setSetting,
} from '../services/database';
import { getData, profileApi } from '../services/api';
import type { AuthUser, Employee } from '../types/models';

interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  employee: Employee | null;
  hasPin: boolean;
  biometricEnabled: boolean;
  faceEnrolled: boolean;
  hydrate: () => Promise<void>;
  setSession: (input: {
    token: string;
    user: AuthUser;
    tenantSlug?: string | null;
  }) => Promise<void>;
  setEmployee: (employee: Employee | null) => Promise<void>;
  refreshEmployee: () => Promise<void>;
  setHasPin: (value: boolean) => void;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  setFaceEnrolled: (value: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

function rowToUser(row: Record<string, unknown>): AuthUser {
  return {
    id: Number(row.user_id),
    name: String(row.user_name ?? ''),
    email: String(row.user_email ?? ''),
    role: (row.user_role as AuthUser['role']) ?? 'employee',
    employeeId: row.employee_id != null ? Number(row.employee_id) : null,
    employeeName: row.employee_name ? String(row.employee_name) : null,
    employeePosition: row.employee_position ? String(row.employee_position) : null,
    employeeMobileRole: row.employee_mobile_role
      ? (row.employee_mobile_role as AuthUser['employeeMobileRole'])
      : null,
    tenantSlug: row.tenant_slug ? String(row.tenant_slug) : null,
  };
}

/** Map baris cached_employee (snake_case) → Employee (camelCase). */
function cachedRowToEmployee(row: Record<string, unknown>): Employee {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    photo: row.photo ? String(row.photo) : null,
    position: row.position ? String(row.position) : null,
    mobileRole: (row.mobile_role as Employee['mobileRole']) ?? null,
    workLocationId: row.work_location_id != null ? Number(row.work_location_id) : null,
    workLocationName: row.work_location_name ? String(row.work_location_name) : null,
    shiftId: row.shift_id != null ? Number(row.shift_id) : null,
    shiftName: row.shift_name ? String(row.shift_name) : null,
    status: row.status ? String(row.status) : null,
    nik: row.nik ? String(row.nik) : null,
    phone: row.phone ? String(row.phone) : null,
    address: row.address ? String(row.address) : null,
  };
}

/** Map payload GET /me → Employee (data API langsung di `data`, atau di data.employee). */
function payloadToEmployee(payload: Record<string, unknown>): Employee {
  const workLocation = payload.work_location as Record<string, unknown> | null | undefined;
  const shift = payload.shift as Record<string, unknown> | null | undefined;
  const detail = payload.detail as Record<string, unknown> | null | undefined;
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ''),
    photo: payload.photo ? String(payload.photo) : null,
    position: payload.position ? String(payload.position) : null,
    mobileRole: (payload.mobile_role as Employee['mobileRole']) ?? null,
    workLocationId: workLocation?.id != null ? Number(workLocation.id) : null,
    workLocationName: workLocation?.name ? String(workLocation.name) : null,
    shiftId: shift?.id != null ? Number(shift.id) : null,
    shiftName: shift?.name ? String(shift.name) : null,
    status: payload.status ? String(payload.status) : null,
    nik: detail?.nik ? String(detail.nik) : null,
    phone: detail?.phone ? String(detail.phone) : null,
    address: detail?.address ? String(detail.address) : null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isHydrated: false,
  isAuthenticated: false,
  user: null,
  employee: null,
  hasPin: false,
  biometricEnabled: false,
  faceEnrolled: false,

  hydrate: async () => {
    try {
      const row = await getAuthRow();
      const hasPinSetting = await getSetting('has_pin');
      const biometric = await getSetting('biometric_enabled');
      const faceEnrolled = await getSetting('face_enrolled');

      if (row?.token) {
        let user = rowToUser(row);
        // cache karyawan dipulihkan ke store supaya avatar/nama tampil di semua
        // layar segera setelah start (dan saat offline), sebelum /me refresh.
        let cached =
          user.employeeId != null ? await getCachedEmployee(user.employeeId) : null;
        // RECOVERY: employee_id di auth_token bisa NULL karena login baru pernah
        // meng-wipe-nya (bug mapUser yang baru diperbaiki). Kalau cached_employee
        // masih ada, link jelas pernah dibuat → pulihkan + tulis balik ke token
        // supaya tidak hilang lagi di restart berikutnya.
        if (user.employeeId == null) {
          cached = await getAnyCachedEmployee();
          if (cached) {
            user = {
              ...user,
              employeeId: Number(cached.id),
              employeeName: cached.name ? String(cached.name) : user.employeeName,
              employeePosition: cached.position ? String(cached.position) : user.employeePosition,
              employeeMobileRole: cached.mobile_role
                ? (cached.mobile_role as AuthUser['employeeMobileRole'])
                : user.employeeMobileRole,
            };
            await saveAuthToken({
              token: String(row.token),
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userRole: user.role,
              employeeId: user.employeeId,
              employeeName: user.employeeName,
              employeePosition: user.employeePosition,
              employeeMobileRole: user.employeeMobileRole,
              tenantSlug: user.tenantSlug,
            });
          }
        }
        set({
          isAuthenticated: true,
          user,
          employee: cached ? cachedRowToEmployee(cached) : null,
          hasPin: hasPinSetting === '1',
          biometricEnabled: biometric === '1',
          faceEnrolled: faceEnrolled === '1',
        });
      } else {
        set({ isAuthenticated: false, user: null, employee: null, faceEnrolled: faceEnrolled === '1' });
      }
    } catch {
      set({ isAuthenticated: false, user: null, faceEnrolled: false });
    } finally {
      set({ isHydrated: true });
    }
  },

  setSession: async ({ token, user, tenantSlug }) => {
    // Jangan wipe link karyawan: kalau login baru (PIN/biometrik/email) respons
    // server tidak membawa user.employee, baris auth_token lama akan di-INSERT
    // ulang dengan employee_id = NULL → layar "Kode Unik" muncul lagi.
    // Merge hanya untuk user yang SAMA (user_id cocok) — akun berbeda tetap mulai bersih.
    const existing = await getAuthRow();
    const sameUser = existing != null && Number(existing.user_id) === user.id;
    const merged: AuthUser = sameUser
      ? {
          ...user,
          employeeId: user.employeeId ?? (existing.employee_id != null ? Number(existing.employee_id) : null),
          employeeName: user.employeeName ?? (existing.employee_name ? String(existing.employee_name) : null),
          employeePosition: user.employeePosition ?? (existing.employee_position ? String(existing.employee_position) : null),
          employeeMobileRole: user.employeeMobileRole ?? (existing.employee_mobile_role
            ? (existing.employee_mobile_role as AuthUser['employeeMobileRole'])
            : null),
          tenantSlug: tenantSlug ?? user.tenantSlug ?? (existing.tenant_slug ? String(existing.tenant_slug) : null),
        }
      : { ...user, tenantSlug: tenantSlug ?? user.tenantSlug };
    await saveAuthToken({
      token,
      userId: merged.id,
      userName: merged.name,
      userEmail: merged.email,
      userRole: merged.role,
      employeeId: merged.employeeId,
      employeeName: merged.employeeName,
      employeePosition: merged.employeePosition,
      employeeMobileRole: merged.employeeMobileRole,
      tenantSlug: merged.tenantSlug,
    });
    await setSetting('last_email', merged.email);
    // ALUR 2 (HP baru / login dengan data kosong): kalau server mengembalikan
    // karyawan yang sudah ter-link (atau baris auth_token lama masih membawanya),
    // langsung impor ke cached_employee supaya cache lokal tidak kosong tanpa
    // harus lewat layar Kode Unik lagi. Login baru (belum ter-link) → employeeId
    // null → tidak diimpor → alur normal lanjut ke Kode Unik.
    if (merged.employeeId != null) {
      try {
        await saveCachedEmployee({
          id: merged.employeeId,
          name: merged.employeeName ?? '',
          position: merged.employeePosition,
          mobileRole: merged.employeeMobileRole,
        });
      } catch (e) {
        // Gagal menulis cache tidak boleh menggagalkan login yang sudah valid.
        console.warn('[auth] gagal impor cached_employee saat setSession:', e);
      }
    }
    set({ isAuthenticated: true, user: merged });
  },

  setEmployee: async (employee) => {
    const current = get().user;
    if (!current) return;
    const updated: AuthUser = {
      ...current,
      employeeId: employee?.id ?? current.employeeId,
      employeeName: employee?.name ?? current.employeeName,
      employeePosition: employee?.position ?? current.employeePosition,
      employeeMobileRole: employee?.mobileRole ?? current.employeeMobileRole,
    };
    if (employee) {
      await saveCachedEmployee(employee);
    }
    const token = await getAuthToken();
    if (!token) return;
    await saveAuthToken({
      token,
      userId: updated.id,
      userName: updated.name,
      userEmail: updated.email,
      userRole: updated.role,
      employeeId: updated.employeeId,
      employeeName: updated.employeeName,
      employeePosition: updated.employeePosition,
      employeeMobileRole: updated.employeeMobileRole,
      tenantSlug: updated.tenantSlug,
    });
    set({ user: updated, employee });
  },

  refreshEmployee: async () => {
    try {
      const res = await profileApi.me();
      const payload = getData<Record<string, unknown>>(res);
      // Backend mengirim data karyawan langsung di `data` (atau di data.employee).
      const emp = (payload.employee ?? payload) as Record<string, unknown>;
      await get().setEmployee(payloadToEmployee(emp));
    } catch {
      // offline — biarkan store/cache apa adanya
    }
  },

  setHasPin: (value) => {
    setSetting('has_pin', value ? '1' : '0');
    set({ hasPin: value });
  },

  setBiometricEnabled: async (value) => {
    await setSetting('biometric_enabled', value ? '1' : '0');
    set({ biometricEnabled: value });
  },

  setFaceEnrolled: async (value) => {
    await setSetting('face_enrolled', value ? '1' : '0');
    set({ faceEnrolled: value });
  },

  logout: async () => {
    await clearAuthToken();
    // cached_employee harus ikut dibersihkan supaya recovery hydrate tidak
    // menempelkan karyawan akun lama ke akun baru yang login setelahnya.
    await clearCachedEmployee();
    set({
      isAuthenticated: false,
      user: null,
      employee: null,
      hasPin: false,
      faceEnrolled: false,
    });
  },
}));
