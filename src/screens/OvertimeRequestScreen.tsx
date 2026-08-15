import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import TextField from '../components/TextField';
import { getData, overtimeApi } from '../services/api';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';
import { isFutureOrToday } from '../utils/validators';

interface HistoryItem {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  status: string;
}

export default function OvertimeRequestScreen() {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await overtimeApi.me();
      const rows = getData<HistoryItem[]>(res);
      if (Array.isArray(rows)) setHistory(rows);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!isFutureOrToday(date)) nextErrors.date = 'Tanggal tidak valid';
    if (!/^\d{2}:\d{2}$/.test(startTime)) nextErrors.startTime = 'Format HH:MM';
    if (!/^\d{2}:\d{2}$/.test(endTime)) nextErrors.endTime = 'Format HH:MM';
    if (reason.trim().length < 5) nextErrors.reason = 'Alasan minimal 5 karakter';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await overtimeApi.create({
        date,
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Pengajuan lembur terkirim',
        text2: 'Menunggu persetujuan.',
      });
      setDate('');
      setReason('');
      await loadHistory();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal mengirim',
        text2: e instanceof Error ? e.message : 'Endpoint lembur mungkin belum tersedia di backend.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <TextField
            label="Tanggal"
            value={date}
            onChangeText={setDate}
            placeholder="2026-08-15"
            error={errors.date}
          />
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TextField
                label="Jam Mulai"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="18:00"
                error={errors.startTime}
              />
            </View>
            <View style={styles.timeField}>
              <TextField
                label="Jam Selesai"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="21:00"
                error={errors.endTime}
              />
            </View>
          </View>
          <TextField
            label="Alasan"
            value={reason}
            onChangeText={setReason}
            placeholder="Contoh: menyelesaikan laporan"
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
            <EmptyState icon="🌙" title="Belum ada pengajuan lembur" />
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <StatusBadge status={item.status} size="md" />
                <Text style={styles.historyTime}>
                  {item.start_time}–{item.end_time}
                </Text>
              </View>
              <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              {item.reason ? (
                <Text style={styles.historyReason} numberOfLines={2}>
                  {item.reason}
                </Text>
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
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeField: {
    flex: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTime: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary[700],
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
});

