import { useCallback } from 'react';
import { format } from 'date-fns';
import { attendanceApi, getData } from '../services/api';
import {
  getCachedAttendance,
  getCachedSchedules,
  getCurrentEmployeeId,
  getPendingAttendance,
  insertPendingAttendance,
} from '../services/database';
import { syncService } from '../services/sync';
import { useAppStore } from '../stores/appStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import type { AttendanceRecord, DayStatusSummary, ScheduleItem } from '../types/models';

export function useAttendance() {
  const isOnline = useAppStore((s) => s.isOnline);
  const { setToday, setHistory, setPending, setLoading } = useAttendanceStore();

  const buildDaySummary = useCallback(
    (
      records: AttendanceRecord[],
      schedules: ScheduleItem[],
      dateKey: string
    ): DayStatusSummary => {
      const dayRecords = records.filter((r) => r.recordedAt.slice(0, 10) === dateKey);
      const clockIn = dayRecords.find((r) => r.type === 'clock_in') ?? null;
      const clockOut = dayRecords.find((r) => r.type === 'clock_out') ?? null;
      const schedule = schedules.find((s) => s.date === dateKey) ?? null;

      let status: DayStatusSummary['status'] = 'belum';
      if (schedule?.isLeave) status = 'izin';
      else if (schedule?.isPermit) status = 'izin';
      else if (schedule?.isHoliday) status = 'libur';
      else if (clockIn && clockOut) status = 'hadir';
      else if (clockIn) status = 'hadir';

      return {
        date: dateKey,
        hasClockIn: Boolean(clockIn),
        hasClockOut: Boolean(clockOut),
        clockIn,
        clockOut,
        schedule,
        status,
      };
    },
    []
  );

  const loadLocal = useCallback(async (): Promise<DayStatusSummary | null> => {
    const employeeId = await getCurrentEmployeeId();
    if (!employeeId) return null;
    const [rows, scheduleRows, pendingRows] = await Promise.all([
      getCachedAttendance(employeeId),
      getCachedSchedules(
        employeeId,
        format(new Date(), 'yyyy-MM-01'),
        format(new Date(), 'yyyy-MM-31')
      ),
      getPendingAttendance(100),
    ]);

    const records = rows.map(mapAttendanceRow);
    const schedules = scheduleRows.map(mapScheduleRow);
    const dateKey = format(new Date(), 'yyyy-MM-dd');
    const summary = buildDaySummary(records, schedules, dateKey);
    setToday(summary);
    setHistory(records);
    setPending(pendingRows.map(mapPendingRow));
    return summary;
  }, [buildDaySummary, setHistory, setPending, setToday]);

  const refreshFromApi = useCallback(async () => {
    setLoading(true);
    try {
      await syncService.refreshCache();
      await loadLocal();
    } finally {
      setLoading(false);
    }
  }, [loadLocal, setLoading]);

  const clock = useCallback(
    async (input: {
      type: 'clock_in' | 'clock_out';
      latitude: number;
      longitude: number;
      selfiePhotoBase64?: string;
      force?: boolean;
    }): Promise<{ mode: 'online' | 'offline'; message: string }> => {
      const employeeId = await getCurrentEmployeeId();
      if (!employeeId) throw new Error('Data karyawan belum lengkap');

      const recordedAt = new Date().toISOString();
      const payload = {
        latitude: input.latitude,
        longitude: input.longitude,
        selfie_photo: input.selfiePhotoBase64
          ? `data:image/jpeg;base64,${input.selfiePhotoBase64}`
          : undefined,
        force: input.force ?? false,
      };

      if (isOnline) {
        const res =
          input.type === 'clock_in'
            ? await attendanceApi.clockIn(payload)
            : await attendanceApi.clockOut(payload);
        const data = getData<Record<string, unknown>>(res);
        const serverRecord: AttendanceRecord = {
          id: Number(data.id ?? Date.now()),
          employeeId,
          type: input.type,
          recordedAt: String(data.recorded_at ?? recordedAt),
          latitude: input.latitude,
          longitude: input.longitude,
          distanceMeter: data.distance_meter != null ? Number(data.distance_meter) : null,
          selfiePhoto: input.selfiePhotoBase64 ? `data:image/jpeg;base64,${input.selfiePhotoBase64}` : null,
          status: 'success',
          workLocationName: data.work_location_name ? String(data.work_location_name) : null,
        };
        await syncService.refreshCache();
        await loadLocal();
        return {
          mode: 'online',
          message: `Clock ${input.type === 'clock_in' ? 'In' : 'Out'} berhasil`,
        };
      }

      // Offline → simpan ke queue
      const insertedId = await insertPendingAttendance({
        employeeId,
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        selfiePhoto: payload.selfie_photo ?? null,
        recordedAt,
      });
      void insertedId;
      await loadLocal();
      return {
        mode: 'offline',
        message: 'Tersimpan, akan dikirim saat online',
      };
    },
    [isOnline, loadLocal]
  );

  return {
    clock,
    loadLocal,
    refreshFromApi,
  };
}

function mapAttendanceRow(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    type: (row.type as AttendanceRecord['type']) ?? 'clock_in',
    recordedAt: String(row.recorded_at ?? ''),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    distanceMeter: row.distance_meter != null ? Number(row.distance_meter) : null,
    selfiePhoto: row.selfie_photo ? String(row.selfie_photo) : null,
    status: row.status ? String(row.status) : null,
    isLate: Boolean(row.is_late),
    lateMinutes: row.late_minutes != null ? Number(row.late_minutes) : null,
    workLocationName: row.work_location_name ? String(row.work_location_name) : null,
    syncedAt: row.synced_at ? String(row.synced_at) : undefined,
  };
}

function mapScheduleRow(row: Record<string, unknown>): ScheduleItem {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    date: String(row.date ?? ''),
    shiftName: row.shift_name ? String(row.shift_name) : null,
    shiftStart: row.shift_start ? String(row.shift_start) : null,
    shiftEnd: row.shift_end ? String(row.shift_end) : null,
    isHoliday: Number(row.is_holiday ?? 0),
    isLeave: Number(row.is_leave ?? 0),
    isPermit: Number(row.is_permit ?? 0),
    status: row.status ? String(row.status) : null,
  };
}

function mapPendingRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    type: row.type as 'clock_in' | 'clock_out',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    selfiePhoto: row.selfie_photo ? String(row.selfie_photo) : null,
    recordedAt: String(row.recorded_at),
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 10),
    lastError: row.last_error ? String(row.last_error) : null,
    status: row.status as 'pending' | 'syncing' | 'failed',
    createdAt: String(row.created_at ?? ''),
  };
}

