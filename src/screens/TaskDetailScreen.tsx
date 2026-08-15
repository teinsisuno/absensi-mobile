import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import { getData, taskApi } from '../services/api';
import type { SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';

type Props = NativeStackScreenProps<SubStackParamList, 'TaskDetail'>;

interface TaskItem {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  from_name?: string | null;
  status: string;
  completed_at?: string | null;
}

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function TaskDetailScreen({ route }: Props) {
  const { taskId } = route.params;
  const [task, setTask] = useState<TaskItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await taskApi.me();
      const rows = getData<TaskItem[]>(res);
      const found = Array.isArray(rows) ? rows.find((t) => Number(t.id) === Number(taskId)) : null;
      if (found) {
        setTask(found);
        setSelectedStatus(found.status);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async () => {
    if (!task || selectedStatus === task.status) return;
    setUpdating(true);
    try {
      await taskApi.updateStatus(task.id, selectedStatus);
      Toast.show({ type: 'success', text1: 'Status tugas diperbarui' });
      setTask({ ...task, status: selectedStatus });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal memperbarui',
        text2: e instanceof Error ? e.message : 'Endpoint tugas mungkin belum tersedia.',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <ScreenContainer>{null}</ScreenContainer>;
  if (!task) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Tugas luar tidak ditemukan</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{task.title}</Text>
            <StatusBadge status={task.status} size="md" />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Dari</Text>
            <Text style={styles.metaValue}>{task.from_name ?? '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Deadline</Text>
            <Text style={styles.metaValue}>{formatDate(task.due_date)}</Text>
          </View>
          {task.completed_at ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Selesai</Text>
              <Text style={styles.metaValue}>{formatDate(task.completed_at)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.description}>{task.description ?? 'Tidak ada deskripsi.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.statusOption}
              onPress={() => setSelectedStatus(opt.key)}
            >
              <View
                style={[
                  styles.radio,
                  selectedStatus === opt.key && styles.radioSelected,
                ]}
              />
              <Text style={styles.statusLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <Button
            title="Update Status"
            size="lg"
            loading={updating}
            disabled={selectedStatus === task.status}
            onPress={updateStatus}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.gray[900],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.gray[800],
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray[600],
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray[300],
  },
  radioSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[600],
  },
  statusLabel: {
    fontSize: 15,
    color: Colors.gray[800],
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.gray[500],
  },
});
