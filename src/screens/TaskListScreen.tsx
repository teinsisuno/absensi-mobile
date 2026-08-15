import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import { getData, taskApi } from '../services/api';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';

type Filter = 'pending' | 'in_progress' | 'done';

interface TaskItem {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  from_name?: string | null;
  status: string;
  completed_at?: string | null;
}

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function TaskListScreen() {
  const navigation = useNavigation<Navigation>();
  const [filter, setFilter] = useState<Filter>('pending');
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await taskApi.me();
      const rows = getData<TaskItem[]>(res);
      if (Array.isArray(rows)) setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((t) => t.status === filter);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.tabRow}>
          {(
            [
              ['pending', 'Pending'],
              ['in_progress', 'Proses'],
              ['done', 'Selesai'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, filter === key && styles.tabActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.tabText, filter === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? null : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState icon="📝" title="Tidak ada tugas luar" />
          </View>
        ) : (
          filtered.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SubNavigator', {
                  screen: 'TaskDetail',
                  params: { taskId: task.id },
                })
              }
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardIcon}>{task.status === 'done' ? '✅' : '⬜'}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{task.title}</Text>
                  <Text style={styles.cardMeta}>
                    Due: {formatDate(task.due_date)}
                    {task.from_name ? ` · Dari: ${task.from_name}` : ''}
                  </Text>
                </View>
                <StatusBadge status={task.status} />
              </View>
            </TouchableOpacity>
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
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
});

