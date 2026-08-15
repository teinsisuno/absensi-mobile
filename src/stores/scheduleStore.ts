import { create } from 'zustand';
import type { ScheduleItem } from '../types/models';

interface ScheduleState {
  schedules: ScheduleItem[];
  isLoading: boolean;
  setSchedules: (schedules: ScheduleItem[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: [],
  isLoading: false,
  setSchedules: (schedules) => set({ schedules }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ schedules: [], isLoading: false }),
}));

