import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import ScreenContainer from '../components/ScreenContainer';
import { getData, announcementApi } from '../services/api';
import { getCachedAnnouncements } from '../services/database';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';

interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  published_at?: string | null;
  created_at?: string | null;
}

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AnnouncementListScreen() {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await announcementApi.list();
      const rows = getData<AnnouncementItem[]>(res);
      if (Array.isArray(rows)) setItems(rows);
    } catch {
      const rows = await getCachedAnnouncements();
      setItems(
        rows.map((r) => ({
          id: Number(r.id),
          title: String(r.title),
          body: String(r.body),
          published_at: r.published_at ? String(r.published_at) : null,
          created_at: r.created_at ? String(r.created_at) : null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? null : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState icon="📢" title="Belum ada pengumuman" />
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SubNavigator', {
                  screen: 'AnnouncementDetail',
                  params: { announcementId: item.id },
                })
              }
            >
              <Text style={styles.cardIcon}>📌</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>
                  {formatDate(item.published_at ?? item.created_at)}
                </Text>
                <Text style={styles.cardExcerpt} numberOfLines={2}>
                  {item.body}
                </Text>
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
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  cardDate: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 2,
  },
  cardExcerpt: {
    fontSize: 13,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
});

