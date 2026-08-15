import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppModal from './AppModal';
import { UserIcon, LogoutIcon, ChevronRightIcon } from './icons';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useUiStore } from '../stores/uiStore';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/** Modal pilih aksi absensi — padanan AbsenModal.vue PWA (dibuka dari FAB & MenuCard). */
export default function AbsenModal() {
  const navigation = useNavigation<Navigation>();
  const today = useAttendanceStore((s) => s.today);
  const open = useUiStore((s) => s.absenModalOpen);
  const close = useUiStore((s) => s.closeAbsenModal);

  const hasIn = Boolean(today?.hasClockIn);
  const hasOut = Boolean(today?.hasClockOut);
  const isWorking = hasIn && !hasOut;

  const canClockOut = hasIn && !hasOut;
  const canClockInUlang = hasOut && !isWorking;
  const canClockOutUlang = hasIn;

  const statusLabel = isWorking ? 'Sedang Bekerja' : hasIn ? 'Selesai Hari Ini' : 'Belum Absen';
  const clockOutHint = !hasIn
    ? 'Belum absen masuk hari ini'
    : hasOut
      ? 'Sudah absen keluar — pakai Absensi Keluar Ulang'
      : 'Absen pulang + foto wajah';

  const choose = (type: 'in' | 'out', force: boolean) => {
    close();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.navigate as any)('MainTabs', {
      screen: 'Clock',
      params: { type, force },
    });
  };

  return (
    <AppModal visible={open} title="Absensi" onClose={close}>
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>
          Status: <Text style={styles.statusValue}>{statusLabel}</Text>
        </Text>
      </View>

      {/* Tombol utama */}
      <View style={styles.mainActions}>
        <TouchableOpacity
          style={[styles.mainBtn, hasIn ? styles.mainBtnDisabled : styles.mainBtnIn]}
          activeOpacity={0.9}
          disabled={hasIn}
          onPress={() => choose('in', false)}
        >
          <View style={[styles.mainIcon, hasIn ? styles.mainIconDisabled : styles.mainIconIn]}>
            <UserIcon size={20} color={hasIn ? Colors.gray[400] : Colors.white} />
          </View>
          <View style={styles.mainBody}>
            <Text style={[styles.mainTitle, hasIn && styles.textDisabled]}>Absensi Masuk</Text>
            <Text style={[styles.mainSub, hasIn ? styles.textDisabled : styles.textInSub]}>
              {hasIn ? 'Sudah absen masuk hari ini' : 'Absen masuk + foto wajah'}
            </Text>
          </View>
          <ChevronRightIcon size={20} color={hasIn ? Colors.gray[300] : Colors.primary[200]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, !canClockOut ? styles.mainBtnDisabled : styles.mainBtnOut]}
          activeOpacity={0.9}
          disabled={!canClockOut}
          onPress={() => choose('out', false)}
        >
          <View style={[styles.mainIcon, !canClockOut ? styles.mainIconDisabled : styles.mainIconOut]}>
            <LogoutIcon size={20} color={!canClockOut ? Colors.gray[400] : Colors.white} />
          </View>
          <View style={styles.mainBody}>
            <Text style={[styles.mainTitle, !canClockOut && styles.textDisabled]}>Absensi Keluar</Text>
            <Text style={[styles.mainSub, !canClockOut ? styles.textDisabled : styles.textOutSub]}>
              {clockOutHint}
            </Text>
          </View>
          <ChevronRightIcon size={20} color={!canClockOut ? Colors.gray[300] : '#fecaca'} />
        </TouchableOpacity>
      </View>

      {/* Tambah riwayat */}
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerLabel}>Tambah riwayat</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.ulangRow}>
        <TouchableOpacity
          style={[styles.ulangBtn, canClockInUlang ? styles.ulangBtnIn : styles.ulangBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canClockInUlang}
          onPress={() => choose('in', true)}
        >
          <Text style={[styles.ulangText, canClockInUlang ? styles.ulangTextIn : styles.ulangTextDisabled]}>
            Absensi Masuk Ulang
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ulangBtn, canClockOutUlang ? styles.ulangBtnOut : styles.ulangBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canClockOutUlang}
          onPress={() => choose('out', true)}
        >
          <Text style={[styles.ulangText, canClockOutUlang ? styles.ulangTextOut : styles.ulangTextDisabled]}>
            Absensi Keluar Ulang
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.caption}>
        Tombol "Ulang" menambah catatan riwayat tanpa mengubah status utama.
      </Text>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    backgroundColor: Colors.gray[50],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  statusValue: {
    fontWeight: '700',
    color: Colors.gray[800],
  },
  mainActions: {
    gap: Spacing.md,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  mainBtnIn: {
    backgroundColor: Colors.primary[600],
  },
  mainBtnOut: {
    backgroundColor: Colors.danger,
  },
  mainBtnDisabled: {
    backgroundColor: Colors.gray[100],
  },
  mainIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIconIn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  mainIconOut: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  mainIconDisabled: {
    backgroundColor: Colors.gray[200],
  },
  mainBody: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  mainSub: {
    fontSize: 12,
    marginTop: 2,
  },
  textInSub: {
    color: Colors.primary[100],
  },
  textOutSub: {
    color: '#fecaca',
  },
  textDisabled: {
    color: Colors.gray[400],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray[400],
  },
  ulangRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ulangBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ulangBtnIn: {
    borderColor: Colors.primary[200],
    backgroundColor: Colors.primary[50],
  },
  ulangBtnOut: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  ulangBtnDisabled: {
    borderColor: Colors.gray[100],
    backgroundColor: Colors.gray[50],
  },
  ulangText: {
    fontSize: 14,
    fontWeight: '700',
  },
  ulangTextIn: {
    color: Colors.primary[700],
  },
  ulangTextOut: {
    color: Colors.danger,
  },
  ulangTextDisabled: {
    color: Colors.gray[300],
  },
  caption: {
    marginTop: Spacing.sm,
    fontSize: 11,
    color: Colors.gray[400],
    textAlign: 'center',
  },
});
