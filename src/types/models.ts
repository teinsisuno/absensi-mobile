export type UserRole = 'superadmin' | 'hr' | 'employee';
export type MobileRole = 'karyawan' | 'supervisor' | 'management';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: number | null;
  employeeName?: string | null;
  employeePosition?: string | null;
  employeeMobileRole?: MobileRole | null;
  tenantSlug?: string | null;
}

export interface AuthTokenRow extends AuthUser {
  token: string;
  createdAt: string;
}

export interface Employee {
  id: number;
  name: string;
  photo?: string | null;
  position?: string | null;
  mobileRole?: MobileRole | null;
  workLocationId?: number | null;
  workLocationName?: string | null;
  shiftId?: number | null;
  shiftName?: string | null;
  status?: string | null;
  nik?: string | null;
  phone?: string | null;
  address?: string | null;
  updatedAt?: string | null;
}

export type AttendanceType = 'clock_in' | 'clock_out';

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  type: AttendanceType;
  recordedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeter?: number | null;
  selfiePhoto?: string | null;
  status?: string | null;
  workLocationName?: string | null;
  syncedAt?: string;
  isLate?: boolean;
  lateMinutes?: number | null;
}

export interface PendingAttendance {
  id: number;
  employeeId: number;
  type: AttendanceType;
  latitude: number;
  longitude: number;
  selfiePhoto?: string | null;
  recordedAt: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  status: 'pending' | 'syncing' | 'failed';
  nextRetryAt?: string | null;
  createdAt: string;
}

export interface ScheduleItem {
  id: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  shiftName?: string | null;
  shiftStart?: string | null; // HH:MM
  shiftEnd?: string | null;
  isHoliday: number;
  isLeave: number;
  isPermit: number;
  status?: string | null;
}

export type LeaveType = 'izin' | 'cuti' | 'sakit';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string | null;
  attachment?: string | null;
  status: RequestStatus;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  updatedAt?: string | null;
}

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
  status: RequestStatus;
  createdAt?: string | null;
}

export interface Visit {
  id: number;
  employeeId: number;
  latitude?: number | null;
  longitude?: number | null;
  selfiePhoto?: string | null;
  note?: string | null;
  visitedAt: string;
  status?: string | null;
}

export type TaskStatus = 'pending' | 'in_progress' | 'done';

export interface TaskItem {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  fromName?: string | null;
  status: TaskStatus;
  completedAt?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  publishedAt?: string | null;
  createdAt?: string | null;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  timestamp?: number | null;
}

export interface WorkLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

export interface DocumentItem {
  id: number;
  name: string;
  type: string;
  url: string;
  uploadedAt?: string | null;
}

export interface DayStatusSummary {
  date: string;
  hasClockIn: boolean;
  hasClockOut: boolean;
  clockIn?: AttendanceRecord | null;
  clockOut?: AttendanceRecord | null;
  schedule?: ScheduleItem | null;
  status: 'hadir' | 'izin' | 'sakit' | 'cuti' | 'libur' | 'alpha' | 'belum';
}
