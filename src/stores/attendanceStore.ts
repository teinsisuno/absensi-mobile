import { create } from 'zustand';
import type { AttendanceRecord, DayStatusSummary, PendingAttendance } from '../types/models';

interface AttendanceState {
  today: DayStatusSummary | null;
  history: AttendanceRecord[];
  pending: PendingAttendance[];
  isLoading: boolean;
  setToday: (summary: DayStatusSummary | null) => void;
  setHistory: (history: AttendanceRecord[]) => void;
  setPending: (pending: PendingAttendance[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  today: null,
  history: [],
  pending: [],
  isLoading: false,
  setToday: (today) => set({ today }),
  setHistory: (history) => set({ history }),
  setPending: (pending) => set({ pending }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ today: null, history: [], pending: [], isLoading: false }),
}));

