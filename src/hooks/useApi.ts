import { useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useApi() {
  const logout = useAuthStore((s) => s.logout);

  const request = useCallback(
    async <T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => {
      try {
        return await apiRequest<T>(method, path, body);
      } catch (error) {
        const { isUnauthorizedError } = await import('../services/api');
        if (isUnauthorizedError(error)) {
          await logout();
        }
        throw error;
      }
    },
    [logout]
  );

  return { request };
}

