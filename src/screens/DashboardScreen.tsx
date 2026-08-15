import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import MenuCard, { MenuCardIcon, MenuCardColor } from '../components/MenuCard';
import {
  CheckIcon,
  ChevronRightIcon,
  ClockCircleIcon,
  MegaphoneIcon,
  UserIcon,
} from '../components/icons';
import { useAttendance, useNetwork } from '../hooks';
import { announcementApi, getData } from '../services/api';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import type { MainTabParamList, RootStackParamList, SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import {
  formatDate,
  formatTime,
  greetByHour,
  relativeDayLabel,
  todayKey,
} from '../utils/formatters';
import type { AttendanceRecord } from '../types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface MenuDef {
  key: string;
  icon: MenuCardIcon;
  color: MenuCardColor;
  label: string;
  sub: string;
  onPress: () => void;
}

interface HistoryRow {
  key: string;
  label: string;
  timeRange: string;
  location: string | null;
  badge: string;
  badgeColor: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const { loadLocal, refreshFromApi } = useAttendance();
  const today = useAttendanceStore((s) => s.today);
  const history = useAttendanceStore((s) => s.history);
  const isLoading = useAttendanceStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const refreshEmployee = useAuthStore((s) => s.refreshEmployee);
  const { isOnline } = useNetwork();
  const faceEnrolledServer = useUiStore((s) => s.faceEnrolledServer);
  const checkFaceStatus = useUiStore((s) => s.checkFaceStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);

  useEffect(() => {
    loadLocal();
    refreshFromApi();
    checkFaceStatus();
    // Sinkronkan data karyawan (nama/lokasi/foto profil) dari server tiap
    // Dashboard dibuka — misal setelah update foto di halaman Profile.
    refreshEmployee();
    announcementApi
      .list()
      .then((res) => {
        const rows = getData<unknown[]>(res);
        setLatestAnnouncement(Array.isArray(rows) ? (rows[0] ?? null) : null);
      })
      .catch(() => setLatestAnnouncement(null));
  }, [loadLocal, refreshFromApi, checkFaceStatus, refreshEmployee]);

  const isWorking = Boolean(today?.hasClockIn && !today?.hasClockOut);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFromApi();
    setRefreshing(false);
  }, [refreshFromApi]);

  const displayName = employee?.name ?? user?.employeeName ?? user?.name ?? 'Karyawan';

  const goMainTab = (screen: keyof MainTabParamList) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.navigate as any)('MainTabs', { screen });
  };
  const goSub = (screen: keyof SubStackParamList) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.navigate as any)('SubNavigator', { screen });
  };

  const menus: MenuDef[] = [
    { key: 'jadwal', icon: 'calendar', color: 'primary', label: 'Jadwal', sub: 'Shift & jadwal', onPress: () => goMainTab('Calendar') },
    { key: 'pengajuan', icon: 'file', color: 'warning', label: 'Pengajuan', sub: 'Izin/cuti/sakit', onPress: () => goSub('LeaveRequest') },
    { key: 'kunjungan', icon: 'map', color: 'success', label: 'Kunjungan', sub: 'Selfie + lokasi', onPress: () => goSub('VisitList') },
    { key: 'tugas', icon: 'tasks', color: 'purple', label: 'Tugas Luar', sub: 'Update status', onPress: () => goSub('TaskList') },
    { key: 'lembur', icon: 'clock', color: 'warning', label: 'Lembur', sub: 'Ajukan lembur', onPress: () => goSub('OvertimeRequest') },
    { key: 'pengumuman', icon: 'file', color: 'primary', label: 'Pengumuman', sub: 'Info terbaru', onPress: () => goSub('AnnouncementList') },
  ];

  const statusLabel = isWorking
    ? 'Sedang Bekerja'
    : today?.hasClockIn
      ? 'Selesai Hari Ini'
      : 'Belum Absen';

  const statusMeta = isWorking
    ? { color: Colors.warning, bg: Colors.warning + '1a' }
    : today?.hasClockIn
      ? { color: Colors.success, bg: Colors.success + '1a' }
      : { color: Colors.gray[500], bg: Colors.gray[100] };

  const rows = useMemo<HistoryRow[]>(() => {
    const result: HistoryRow[] = [];
    const todayDateKey = today?.date ?? todayKey();
    if (today?.clockIn) {
      result.push({
        key: todayDateKey,
        label: 'Hari ini',
        timeRange: `${formatTime(today.clockIn.recordedAt)}${today.clockOut ? ' - ' + formatTime(today.clockOut.recordedAt) : ''}`,
        location: today.clockIn.workLocationName ?? null,
        badge: isWorking ? 'Berlangsung' : 'Selesai',
        badgeColor: isWorking ? Colors.warning : Colors.success,
      });
    }

    const byDate = new Map<string, AttendanceRecord[]>();
    for (const r of history) {
      const d = r.recordedAt.slice(0, 10);
      if (!d || d === todayDateKey) continue;
      const list = byDate.get(d);
      if (list) list.push(r);
      else byDate.set(d, [r]);
    }
    [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 3)
      .forEach(([date, recs]) => {
        recs.sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
        const first = recs[0];
        const last = recs[recs.length - 1];
        const out = last?.type === 'clock_out' ? last : null;
        result.push({
          key: date,
          label: relativeDayLabel(date + 'T00:00:00'),
          timeRange: `${formatTime(first?.recordedAt)}${out ? ' - ' + formatTime(out.recordedAt) : ''}`,
          location: first?.workLocationName ?? null,
          badge: out ? 'Selesai' : 'Berlangsung',
          badgeColor: out ? Colors.success : Colors.warning,
        });
      });
    return result;
  }, [history, today, isWorking]);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />
        }
      >
        {/* Header gradient teal ala PWA */}
        <LinearGradient
          colors={[Colors.primary[700], Colors.primary[900]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.decoCircleLarge} />
          <View style={styles.decoCircleSmall} />
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.date}>{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</Text>
              <Text style={styles.greeting}>{greetByHour()}</Text>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8} onPress={() => goMainTab('Profile')}>
              {employee?.photo ? (
                <Image source={{ uri: employee.photo }} style={styles.avatarImg} />
              ) : (
                <UserIcon size={36} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Status card — mengambang di atas header */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusTitleWrap}>
              <ClockCircleIcon size={16} color={Colors.primary[600]} />
              <Text style={styles.statusTitle}>Status Hari Ini</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
              <Text style={[styles.statusChipText, { color: statusMeta.color }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Jam Masuk</Text>
              <Text style={styles.timeValue}>
                {today?.clockIn ? formatTime(today.clockIn.recordedAt) : '--:--'}
              </Text>
              {today?.clockIn?.isLate === true ? (
                <Text style={styles.lateText}>Telat {today.clockIn.lateMinutes ?? ''} mnt</Text>
              ) : null}
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Jam Keluar</Text>
              <Text style={styles.timeValue}>
                {today?.clockOut ? formatTime(today.clockOut.recordedAt) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Lokasi</Text>
              <Text style={styles.infoValue}>
                {today?.clockIn?.workLocationName ?? employee?.workLocationName ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Peringatan wajah belum di-scan — absensi diblokir sampai enroll */}
        {faceEnrolledServer === false ? (
          <View style={styles.faceWarning}>
            <Text style={styles.faceWarningIcon}>⚠️</Text>
            <View style={styles.faceWarningBody}>
              <Text style={styles.faceWarningTitle}>Belum Scan Wajah</Text>
              <Text style={styles.faceWarningText}>
                Scan wajah dulu agar bisa melakukan absensi.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.faceWarningBtn}
              onPress={() => goSub('FaceEnroll')}
            >
              <Text style={styles.faceWarningBtnText}>Scan</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Menu grid 2 kolom */}
        <View style={styles.menuGrid}>
          {menus.map((menu) => (
            <MenuCard
              key={menu.key}
              icon={menu.icon}
              color={menu.color}
              label={menu.label}
              sub={menu.sub}
              onPress={menu.onPress}
            />
          ))}
        </View>

        {/* Riwayat Absensi */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Riwayat Absensi</Text>
            <TouchableOpacity onPress={() => goMainTab('Attendance')} hitSlop={8}>
              <Text style={styles.cardLink}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada catatan absensi.</Text>
          ) : (
            <View style={styles.rowsList}>
              {rows.map((row) => (
                <View key={row.key} style={styles.recordRow}>
                  <View style={[styles.recordIcon, { backgroundColor: row.badgeColor + '1a' }]}>
                    <CheckIcon size={18} color={row.badgeColor} strokeWidth={2.5} />
                  </View>
                  <View style={styles.recordBody}>
                    <Text style={styles.recordDate}>{row.label}</Text>
                    <Text style={styles.recordMeta} numberOfLines={1}>
                      {row.timeRange}{row.location ? ` · ${row.location}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.recordBadge, { backgroundColor: row.badgeColor + '1a' }]}>
                    <Text style={[styles.recordBadgeText, { color: row.badgeColor }]}>{row.badge}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Banner pengumuman */}
        <LinearGradient
          colors={[Colors.primary[600], Colors.primary[800]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <TouchableOpacity style={styles.bannerInner} activeOpacity={0.9} onPress={() => goSub('AnnouncementList')}>
            <View style={styles.bannerIcon}>
              <MegaphoneIcon size={16} color={Colors.white} />
            </View>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerLabel}>Pengumuman</Text>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {latestAnnouncement?.title ?? 'Belum ada pengumuman'}
              </Text>
              <Text style={styles.bannerSub} numberOfLines={2}>
                {latestAnnouncement?.body ?? 'Pengumuman dari HR akan tampil di sini.'}
              </Text>
            </View>
            <ChevronRightIcon size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </LinearGradient>

        {!isOnline ? <Text style={styles.offlineText}>● Sedang offline — data mungkin belum terbaru</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    backgroundColor: Colors.primary[800],
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.xxl + Spacing.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  decoCircleLarge: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decoCircleSmall: {
    position: 'absolute',
    top: 70,
    right: 110,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    marginRight: Spacing.md,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[300],
    marginBottom: 6,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 2,
  },
  avatarBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    padding: Spacing.lg,
    marginHorizontal: Spacing.screen,
    marginTop: -Spacing.xl,
    shadowColor: Colors.primary[900],
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.gray[50],
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: Colors.gray[200],
    marginVertical: 2,
  },
  timeLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.gray[400],
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.gray[800],
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  lateText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.danger,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  infoItem: {
    flex: 1,
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.gray[400],
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 2,
  },
  faceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warning + '1a',
    borderWidth: 1,
    borderColor: Colors.warning + '55',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.lg,
  },
  faceWarningIcon: {
    fontSize: 20,
  },
  faceWarningBody: {
    flex: 1,
  },
  faceWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.gray[800],
  },
  faceWarningText: {
    fontSize: 12,
    color: Colors.gray[600],
    marginTop: 2,
  },
  faceWarningBtn: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  faceWarningBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    padding: Spacing.lg,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.xl,
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gray[800],
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  emptyText: {
    fontSize: 13,
    color: Colors.gray[400],
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  rowsList: {
    gap: Spacing.sm,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.gray[50],
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBody: {
    flex: 1,
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  recordMeta: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 2,
  },
  recordBadge: {
    backgroundColor: Colors.success + '1a',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  banner: {
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screen,
    overflow: 'hidden',
    shadowColor: Colors.primary[800],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bannerBody: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.primary[200],
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 18,
  },
  offlineText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    marginTop: Spacing.lg,
  },
});
