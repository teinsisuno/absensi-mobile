export interface ApiEnvelope<T> {
  data?: T;
  success?: boolean;
  message?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface LoginEmployee {
  id: number;
  name: string;
  position?: string | null;
  mobile_role?: string | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    /** Legacy: sebagian klien lama berharap employee di sini. */
    employee?: LoginEmployee | null;
  };
  /** Server saat ini mengirim employee di level ini. */
  employee?: LoginEmployee | null;
  [key: string]: unknown;
}

export interface FaceVerifyResult {
  match: boolean;
  confidence: number;
}

