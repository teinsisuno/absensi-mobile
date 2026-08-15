import { useCallback } from 'react';
import { authApi, getData } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { ApiEnvelope, LoginResponse } from '../types/api';
import type { AuthUser, Employee, UserRole } from '../types/models';

function mapUser(payload: LoginResponse): AuthUser {
  const role = (payload.user.role ?? 'employee') as UserRole;
  // Server (Laravel) mengirim employee di TOP-LEVEL respons, bukan di user.employee:
  //   { token, user: {...}, employee: { id, name, position, mobile_role } }
  // Baca keduanya supaya tidak bergantung pada bentuk respons backend.
  const emp = payload.employee ?? payload.user.employee;
  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    role,
    employeeId: emp?.id ?? null,
    employeeName: emp?.name ?? null,
    employeePosition: emp?.position ?? null,
    employeeMobileRole: (emp?.mobile_role as AuthUser['employeeMobileRole']) ?? null,
  };
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const hasPin = useAuthStore((s) => s.hasPin);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setSession = useAuthStore((s) => s.setSession);
  const setEmployee = useAuthStore((s) => s.setEmployee);
  const setHasPin = useAuthStore((s) => s.setHasPin);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const logout = useAuthStore((s) => s.logout);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      const payload = getData<LoginResponse>(response as ApiEnvelope<LoginResponse>);
      const mapped = mapUser(payload);
      await setSession({ token: payload.token, user: mapped });
      return mapped;
    },
    [setSession]
  );

  const pinLogin = useCallback(
    async (email: string, pin: string) => {
      const response = await authApi.pinLogin({ email, pin });
      const payload = getData<LoginResponse>(response as ApiEnvelope<LoginResponse>);
      const mapped = mapUser(payload);
      await setSession({ token: payload.token, user: mapped });
      return mapped;
    },
    [setSession]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await authApi.register({ name, email, password });
      const payload = getData<LoginResponse>(response as ApiEnvelope<LoginResponse>);
      const mapped = mapUser(payload);
      await setSession({ token: payload.token, user: mapped });
      return mapped;
    },
    [setSession]
  );

  const setPin = useCallback(
    async (pin: string) => {
      await authApi.setPin(pin);
      setHasPin(true);
    },
    [setHasPin]
  );

  const changePin = useCallback(
    async (currentPin: string, newPin: string) => {
      await authApi.changePin(currentPin, newPin);
    },
    []
  );

  const linkEmployee = useCallback(
    async (code: string): Promise<Employee> => {
      const response = await authApi.linkEmployee(code);
      const payload = getData<Record<string, unknown>>(
        response as ApiEnvelope<Record<string, unknown>>
      );
      const emp = (payload.employee ?? {}) as Record<string, unknown>;
      const employeeData: Employee = {
        id: Number(emp.id ?? payload.id),
        name: String(emp.name ?? payload.name ?? ''),
        photo: emp.photo ? String(emp.photo) : null,
        position: emp.position ? String(emp.position) : null,
        mobileRole: emp.mobile_role
          ? (emp.mobile_role as Employee['mobileRole'])
          : null,
        workLocationId: emp.work_location_id != null
          ? Number(emp.work_location_id)
          : null,
        workLocationName: emp.work_location_name
          ? String(emp.work_location_name)
          : null,
        shiftId: emp.shift_id != null ? Number(emp.shift_id) : null,
        shiftName: emp.shift_name ? String(emp.shift_name) : null,
        status: emp.status ? String(emp.status) : null,
        nik: emp.nik ? String(emp.nik) : null,
        phone: emp.phone ? String(emp.phone) : null,
        address: emp.address ? String(emp.address) : null,
      };
      await setEmployee(employeeData);
      return employeeData;
    },
    [setEmployee]
  );

  return {
    user,
    employee,
    hasPin,
    biometricEnabled,
    login,
    pinLogin,
    register,
    setPin,
    changePin,
    linkEmployee,
    setBiometricEnabled,
    logout,
  };
}
