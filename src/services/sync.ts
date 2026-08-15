import NetInfo from '@react-native-community/netinfo';
import { format, subDays } from 'date-fns';
import {
  attendanceApi,
  getData,
  scheduleApi,
  leaveApi,
  announcementApi,
} from './api';
import {
  countPendingAttendance,
  deletePendingAttendance,
  getCurrentEmployeeId,
  getPendingAttendance,
  replaceCachedAnnouncements,
  replaceCachedAttendance,
  replaceCachedLeaveRequests,
  replaceCachedSchedules,
  setSetting,
  updatePendingStatus,
} from './database';
import {
  ATTENDANCE_CACHE_DAYS,
  SYNC_BACKOFF_SECONDS,
  SYNC_BATCH_SIZE,
  SYNC_MAX_RETRIES,
} from '../utils/constants';

export interface SyncResult {
  skipped?: boolean;
  success?: number;
  failed?: number;
}

function backoffDelay(retryCount: number): number {
  const index = Math.min(retryCount, SYNC_BACKOFF_SECONDS.length) - 1;
  return (SYNC_BACKOFF_SECONDS[Math.max(0, index)] ?? 135) * 1000;
}

class SyncService {
  private isSyncing = false;
  private netInfoUnsubscribe: (() => void) | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** Panggil saat app start — listener NetInfo + sync awal. */
  async start(): Promise<void> {
    this.netInfoUnsubscribe?.();
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.syncPendingQueue();
        this.refreshCache();
      }
    });

    const state = await NetInfo.fetch();
    if (state.isConnected && state.isInternetReachable !== false) {
      await this.syncPendingQueue();
      await this.refreshCache();
    }
  }

  stop(): void {
    this.netInfoUnsubscribe?.();
    this.netInfoUnsubscribe = null;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  async refreshCache(): Promise<void> {
    const employeeId = await getCurrentEmployeeId();
    if (!employeeId) return;

    try {
      // Riwayat absensi (N hari terakhir)
      const today = new Date();
      const from = format(subDays(today, ATTENDANCE_CACHE_DAYS - 1), 'yyyy-MM-dd');
      const to = format(today, 'yyyy-MM-dd');
      const attendanceRes = await attendanceApi.me();
      const attendanceRows = getData<Array<Record<string, unknown>>>(attendanceRes);
      const attendanceRecords = Array.isArray(attendanceRows)
        ? attendanceRows.map((row) => ({
            id: Number(row.id),
            type: String(row.type ?? row.clock_type ?? 'clock_in'),
            recordedAt: String(row.recorded_at ?? row.created_at ?? new Date().toISOString()),
            latitude: row.latitude != null ? Number(row.latitude) : null,
            longitude: row.longitude != null ? Number(row.longitude) : null,
            distanceMeter: row.distance_meter != null ? Number(row.distance_meter) : null,
            selfiePhoto: row.selfie_photo ? String(row.selfie_photo) : null,
            status: row.status ? String(row.status) : null,
            isLate: Boolean(row.is_late ?? row.isLate),
            lateMinutes: row.late_minutes != null ? Number(row.late_minutes) : null,
            workLocationName: row.work_location_name
              ? String(row.work_location_name)
              : null,
          }))
        : [];
      await replaceCachedAttendance(employeeId, attendanceRecords);

      // Jadwal 30 hari ke depan
      const scheduleRes = await scheduleApi.me(from, format(new Date(today.getTime() + 30 * 86400000), 'yyyy-MM-dd'));
      const scheduleRows = getData<Array<Record<string, unknown>>>(scheduleRes);
      const schedules = Array.isArray(scheduleRows)
        ? scheduleRows.map((row) => ({
            id: Number(row.id),
            date: String(row.date ?? row.work_date ?? ''),
            shiftName: row.shift_name ? String(row.shift_name) : null,
            shiftStart: row.shift_start ? String(row.shift_start) : null,
            shiftEnd: row.shift_end ? String(row.shift_end) : null,
            isHoliday: Boolean(row.is_holiday),
            isLeave: Boolean(row.is_leave),
            isPermit: Boolean(row.is_permit),
            status: row.status ? String(row.status) : null,
          }))
        : [];
      await replaceCachedSchedules(employeeId, schedules);

      // Pengajuan izin/cuti
      const leaveRes = await leaveApi.me();
      const leaveRows = getData<Array<Record<string, unknown>>>(leaveRes);
      const leaves = Array.isArray(leaveRows)
        ? leaveRows.map((row) => ({
            id: Number(row.id),
            type: String(row.type ?? 'izin'),
            startDate: String(row.start_date ?? ''),
            endDate: String(row.end_date ?? row.start_date ?? ''),
            reason: row.reason ? String(row.reason) : null,
            attachment: row.attachment ? String(row.attachment) : null,
            status: String(row.status ?? 'pending'),
            approvedByName: row.approved_by_name ? String(row.approved_by_name) : null,
            approvedAt: row.approved_at ? String(row.approved_at) : null,
            approvalNotes: row.approval_notes ? String(row.approval_notes) : null,
            updatedAt: row.updated_at ? String(row.updated_at) : null,
          }))
        : [];
      await replaceCachedLeaveRequests(employeeId, leaves);

      // Pengumuman
      const announcementRes = await announcementApi.list();
      const announcementRows = getData<Array<Record<string, unknown>>>(announcementRes);
      const announcements = Array.isArray(announcementRows)
        ? announcementRows.slice(0, 50).map((row) => ({
            id: Number(row.id),
            title: String(row.title ?? ''),
            body: String(row.body ?? ''),
            publishedAt: row.published_at ? String(row.published_at) : null,
            createdAt: row.created_at ? String(row.created_at) : null,
          }))
        : [];
      await replaceCachedAnnouncements(announcements);

      await this.updateLastSync();
    } catch {
      // Offline atau error server — no-op, cache tetap bisa dipakai
    }
  }

  /** Kirim semua antrian pending, satu per satu, dengan retry & backoff. */
  async syncPendingQueue(): Promise<SyncResult> {
    if (this.isSyncing) return { skipped: true };
    this.isSyncing = true;

    let success = 0;
    let failed = 0;

    try {
      const employeeId = await getCurrentEmployeeId();
      if (!employeeId) return { success, failed };

      const now = new Date().toISOString();
      const pending = await getPendingAttendance(SYNC_BATCH_SIZE);
      const dueItems = pending.filter((item) => {
        if (!item.next_retry_at) return true;
        return item.next_retry_at <= now;
      });

      for (const item of dueItems) {
        try {
          await updatePendingStatus(Number(item.id), 'syncing', Number(item.retry_count ?? 0));

          const endpoint =
            item.type === 'clock_out'
              ? attendanceApi.clockOut
              : attendanceApi.clockIn;

          await endpoint({
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            selfie_photo: item.selfie_photo ? String(item.selfie_photo) : undefined,
          });

          // Sukses → hapus dari pending
          await deletePendingAttendance(Number(item.id));
          success++;
        } catch {
          const newRetry = Number(item.retry_count ?? 0) + 1;
          const nextRetryAt = new Date(
            Date.now() + backoffDelay(newRetry)
          ).toISOString();
          await updatePendingStatus(
            Number(item.id),
            newRetry >= Number(item.max_retries ?? SYNC_MAX_RETRIES) ? 'failed' : 'pending',
            newRetry,
            'Gagal dikirim, akan dicoba lagi',
            nextRetryAt
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

  getPendingCount(): Promise<number> {
    return countPendingAttendance();
  }

  private async updateLastSync(): Promise<void> {
    await setSetting('last_sync_at', new Date().toISOString());
  }
}

export const syncService = new SyncService();
