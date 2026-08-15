import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppModal from '../components/AppModal';
import ScreenContainer from '../components/ScreenContainer';
import { ClockCircleIcon, LogoutIcon, MapPinIcon, UserIcon } from '../components/icons';
import { useAttendance, useNetwork } from '../hooks';
import { useAttendanceStore } from '../stores/attendanceStore';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import type { AttendanceRecord } from '../types/models';
import {
  formatCoordinates,
  formatDate,
  formatDateTime,
  formatDistance,
  formatTime,
  todayKey,
} from '../utils/formatters';

const TYPE_LABEL: Record<AttendanceRecord['type'], string> = {
  clock_in: 'Absensi Masuk',
  clock_out: 'Absensi Keluar',
};

/**
 * Riwayat Absensi: tiap record absensi tampil sebagai baris sendiri (per record),
 * tap baris untuk preview detail record.
 */
export default function AttendanceScreen() {
  const { loadLocal, refreshFromApi } = useAttendance();
  const history = useAttendanceStore((s) => s.history);
  const isLoading = useAttendanceStore((s) => s.isLoading);
  const { isOnline } = useNetwork();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    loadLocal();
    refreshFromApi();
  }, [loadLocal, refreshFromApi]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFromApi();
    setRefreshing(false);
  }, [refreshFromApi]);

  /** Semua record, terbaru ke lama. */
  const records = useMemo(() => {
    return [...history].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  }, [history]);

  const stats = useMemo(() => {
    const today = todayKey();
    const presentDays = new Set<string>();
    const lateDays = new Set<string>();
    for (const r of history) {
      const d = r.recordedAt.slice(0, 10);
      if (!d || d > today) continue;
      if (r.type === 'clock_in') presentDays.add(d);
      if (r.isLate) lateDays.add(d);
    }
    return { hadir: presentDays.size, telat: lateDays.size, alpha: 0 };
  }, [history]);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Riwayat Absensi</Text>
          {!isOnline ? <Text style={styles.offlineText}>● offline</Text> : null}
        </View>

        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.hadir}</Text>
            <Text style={styles.statLabel}>Hadir</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.telat}</Text>
            <Text style={styles.statLabel}>Telat</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.danger }]}>{stats.alpha}</Text>
            <Text style={styles.statLabel}>Alpha</Text>
          </View>
        </View>

        {/* Daftar record */}
        {isLoading && history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Memuat…</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada riwayat absensi.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((r) => {
              const isIn = r.type === 'clock_in';
              const late = r.isLate;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.recordRow}
                  activeOpacity={0.7}
                  onPress={() => setSelected(r)}
                >
                  <View style={[styles.recordIcon, isIn ? styles.recordIconIn : styles.recordIconOut]}>
                    {isIn ? (
                      <UserIcon size={18} color={Colors.primary[700]} strokeWidth={2.5} />
                    ) : (
                      <LogoutIcon size={18} color={Colors.danger} strokeWidth={2.5} />
                    )}
                  </View>
                  <View style={styles.recordBody}>
                    <Text style={styles.recordLabel}>{TYPE_LABEL[r.type]}</Text>
                    <Text style={styles.recordMeta} numberOfLines={1}>
                      {formatDate(r.recordedAt, 'EEEE, d MMMM yyyy')}
                    </Text>
                    {r.workLocationName ? (
                      <Text style={styles.recordMeta} numberOfLines={1}>
                        {r.workLocationName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={styles.recordTime}>{formatTime(r.recordedAt)}</Text>
                    {late ? (
                      <View style={styles.lateBadge}>
                        <Text style={styles.lateBadgeText}>
                          Telat{r.lateMinutes ? ` ${r.lateMinutes}m` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Preview detail record */}
      <AppModal
        visible={selected !== null}
        title={selected ? TYPE_LABEL[selected.type] : 'Detail'}
        onClose={() => setSelected(null)}
      >
        {selected ? <RecordPreview record={selected} /> : null}
      </AppModal>
    </ScreenContainer>
  );
}

function RecordPreview({ record }: { record: AttendanceRecord }) {
  const isIn = record.type === 'clock_in';
  return (
    <View style={styles.preview}>
      {record.selfiePhoto ? (
        <Image source={{ uri: record.selfiePhoto }} style={styles.previewPhoto} resizeMode="cover" />
      ) : null}
      <DetailRow label="Jam" value={formatDateTime(record.recordedAt)} />
      <DetailRow label="Status" value={record.isLate ? `Telat${record.lateMinutes ? ` ${record.lateMinutes} menit` : ''}` : 'Tepat waktu'} />
      <DetailRow label="Lokasi" value={record.workLocationName ?? '-'} />
      <DetailRow label="Koordinat" value={formatCoordinates(record.latitude, record.longitude)} />
      <DetailRow label="Jarak" value={formatDistance(record.distanceMeter)} />
      <DetailRow
        label="Sinkron"
        value={record.syncedAt ? formatDateTime(record.syncedAt) : 'Belum tersinkron'}
      />
      <View style={styles.previewCaption}>
        <ClockCircleIcon size={14} color={Colors.gray[400]} />
        <Text style={styles.previewCaptionText}>
          {isIn ? 'Absensi masuk karyawan' : 'Absensi keluar karyawan'} · #{record.id}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.gray[800],
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.gray[800],
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  list: {
    gap: Spacing.md,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconIn: {
    backgroundColor: Colors.primary[50],
  },
  recordIconOut: {
    backgroundColor: '#fef2f2',
  },
  recordBody: {
    flex: 1,
  },
  recordLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  recordMeta: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recordTime: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gray[800],
    fontVariant: ['tabular-nums'],
  },
  lateBadge: {
    backgroundColor: Colors.warning + '1a',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  lateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.gray[400],
  },
  preview: {
    gap: Spacing.sm,
  },
  previewPhoto: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray[100],
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[50],
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.gray[400],
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[800],
    textAlign: 'right',
  },
  previewCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  previewCaptionText: {
    fontSize: 11,
    color: Colors.gray[400],
  },
});
