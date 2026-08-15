import { useCallback } from 'react';
import {
  clearAppCache,
  getCachedAnnouncements,
  getCachedAttendance,
  getCachedEmployee,
  getCachedLeaveRequests,
  getCachedSchedules,
  getCurrentEmployeeId,
} from '../services/database';

export function useCache() {
  const loadAttendance = useCallback(async () => {
    const employeeId = await getCurrentEmployeeId();
    return employeeId ? getCachedAttendance(employeeId) : [];
  }, []);

  const loadSchedules = useCallback(async (from: string, to: string) => {
    const employeeId = await getCurrentEmployeeId();
    return employeeId ? getCachedSchedules(employeeId, from, to) : [];
  }, []);

  const loadLeaveRequests = useCallback(async () => {
    const employeeId = await getCurrentEmployeeId();
    return employeeId ? getCachedLeaveRequests(employeeId) : [];
  }, []);

  const loadAnnouncements = useCallback(() => getCachedAnnouncements(), []);

  const loadEmployee = useCallback(async () => {
    const employeeId = await getCurrentEmployeeId();
    return employeeId ? getCachedEmployee(employeeId) : null;
  }, []);

  const clearCache = useCallback(() => clearAppCache(), []);

  return {
    loadAttendance,
    loadSchedules,
    loadLeaveRequests,
    loadAnnouncements,
    loadEmployee,
    clearCache,
  };
}

