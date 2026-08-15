import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import TextField from '../components/TextField';
import { getData, leaveApi } from '../services/api';
import { getCachedLeaveRequests, getCurrentEmployeeId } from '../services/database';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';
import { isDateRangeValid, isFutureOrToday } from '../utils/validators';

type LeaveTab = 'izin' | 'cuti' | 'sakit';

const TABS: { key: LeaveTab; label: string }[] = [
  { key: 'izin', label: 'Izin' },
  { key: 'cuti', label: 'Cuti' },
  { key: 'sakit', label: 'Sakit' },
];

interface HistoryItem {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
}

export default function LeaveRequestScreen() {
  const [tab, setTab] = useState<LeaveTab>('izin');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await leaveApi.me();
      const rows = getData<HistoryItem[]>(res);
      if (Array.isArray(rows)) setHistory(rows);
    } catch {
      const employeeId = await getCurrentEmployeeId();
      if (!employeeId) return;
      const rows = await getCachedLeaveRequests(employeeId);
      setHistory(
        rows.map((r) => ({
          id: Number(r.id),
          type: String(r.type),
          start_date: String(r.start_date),
          end_date: String(r.end_date),
          status: String(r.status),
          reason: r.reason ? String(r.reason) : undefined,
        }))
      );
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!isFutureOrToday(startDate)) nextErrors.startDate = 'Tanggal mulai tidak valid';
    if (!isFutureOrToday(endDate)) nextErrors.endDate = 'Tanggal selesai tidak valid';
    if (!isDateRangeValid(startDate, endDate)) nextErrors.endDate = 'Tanggal selesai harus setelah tanggal mulai';
    if (reason.trim().length < 5) nextErrors.reason = 'Alasan minimal 5 karakter';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await leaveApi.create({
        type: tab,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Pengajuan terkirim',
        text2: 'Menunggu persetujuan HR.',
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadHistory();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal mengirim',
        text2: e instanceof Error ? e.message : 'Coba lagi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await leaveApi.cancel(id);
      Toast.show({ type: 'success', text1: 'Pengajuan dibatalkan' });
      await loadHistory();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal membatalkan',
        text2: e instanceof Error ? e.message : 'Coba lagi.',
      });
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formCard}>
          <TextField
            label="Tanggal Mulai"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-08-15"
            error={errors.startDate}
          />
          <TextField
            label="Tanggal Selesai"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-08-15"
            error={errors.endDate}
          />
          <TextField
            label="Alasan"
            value={reason}
            onChangeText={setReason}
            placeholder="Contoh: ada keperluan keluarga"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            error={errors.reason}
          />
          <Button
            title="Kirim Pengajuan"
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
          />
        </View>

        <Text style={styles.historyTitle}>Riwayat</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState icon="📋" title="Belum ada pengajuan" />
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <StatusBadge status={item.status} size="md" />
                <Text style={styles.historyType}>{item.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.historyDate}>
                {formatDate(item.start_date)}
                {item.end_date && item.end_date !== item.start_date
                  ? ` — ${formatDate(item.end_date)}`
                  : ''}
              </Text>
              {item.reason ? (
                <Text style={styles.historyReason} numberOfLines={2}>
                  {item.reason}
                </Text>
              ) : null}
              {item.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(item.id)}
                >
                  <Text style={styles.cancelText}>Batalkan</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.primary[700],
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[800],
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyType: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray[500],
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[800],
    marginTop: Spacing.sm,
  },
  historyReason: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
  },
  cancelButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.danger + '14',
  },
  cancelText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});

