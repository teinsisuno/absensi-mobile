import { create } from 'zustand';
import { faceApi, getData } from '../services/api';

interface UiState {
  absenModalOpen: boolean;
  /** Status enroll wajah dari SERVER (null = belum dicek / offline). */
  faceEnrolledServer: boolean | null;
  openAbsenModal: () => void;
  closeAbsenModal: () => void;
  /** Update status enroll wajah langsung (dipakai setelah enroll sukses biar guard absen tidak blokir loop). */
  setFaceEnrolledServer: (enrolled: boolean) => void;
  /** Fetch GET /face/status → simpan ke store; return true/false/null (null = gagal/offline). */
  checkFaceStatus: () => Promise<boolean | null>;
}

/** UI state global — dipakai tab bar (FAB) + dashboard (MenuCard Absensi). */
export const useUiStore = create<UiState>((set) => ({
  absenModalOpen: false,
  faceEnrolledServer: null,

  openAbsenModal: () => set({ absenModalOpen: true }),
  closeAbsenModal: () => set({ absenModalOpen: false }),

  setFaceEnrolledServer: (enrolled: boolean) => set({ faceEnrolledServer: enrolled }),

  checkFaceStatus: async () => {
    try {
      const res = await faceApi.status();
      const payload = getData<{ enrolled: boolean }>(res);
      const enrolled = Boolean(payload?.enrolled);
      set({ faceEnrolledServer: enrolled });
      return enrolled;
    } catch {
      // Offline / error → jangan blokir absen, tandai belum diketahui
      set({ faceEnrolledServer: null });
      return null;
    }
  },
}));
