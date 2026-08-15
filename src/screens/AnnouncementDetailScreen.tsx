import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import { getData, announcementApi } from '../services/api';
import { getCachedAnnouncements } from '../services/database';
import type { SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDateTime } from '../utils/formatters';

type Props = NativeStackScreenProps<SubStackParamList, 'AnnouncementDetail'>;

interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  published_at?: string | null;
  created_at?: string | null;
}

export default function AnnouncementDetailScreen({ route }: Props) {
  const { announcementId } = route.params;
  const [item, setItem] = useState<AnnouncementItem | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await announcementApi.list();
      const rows = getData<AnnouncementItem[]>(res);
      const found = Array.isArray(rows)
        ? rows.find((a) => Number(a.id) === Number(announcementId))
        : null;
      if (found) setItem(found);
    } catch {
      const rows = await getCachedAnnouncements();
      const found = rows.find((a) => Number(a.id) === Number(announcementId));
      if (found) {
        setItem({
          id: Number(found.id),
          title: String(found.title),
          body: String(found.body),
          published_at: found.published_at ? String(found.published_at) : null,
          created_at: found.created_at ? String(found.created_at) : null,
        });
      }
    }
  }, [announcementId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!item) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Pengumuman tidak ditemukan</Text>
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
          <Text style={styles.icon}>📌</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>
            {formatDateTime(item.published_at ?? item.created_at)}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{item.body}</Text>
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
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.gray[900],
    marginTop: Spacing.sm,
  },
  date: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray[200],
    marginVertical: Spacing.lg,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.gray[700],
  },
});

