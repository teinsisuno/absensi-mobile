import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import ScreenContainer from '../components/ScreenContainer';
import SelfieThumbnail from '../components/SelfieThumbnail';
import { getData, visitApi } from '../services/api';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatCoordinates, formatDateTime } from '../utils/formatters';

interface VisitItem {
  id: number;
  latitude?: number | null;
  longitude?: number | null;
  selfie_photo?: string | null;
  note?: string | null;
  visited_at?: string | null;
  created_at?: string | null;
}

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function VisitListScreen() {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await visitApi.me();
      const rows = getData<VisitItem[]>(res);
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

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('SubNavigator', { screen: 'Visit' })}
        >
          <Text style={styles.newButtonText}>＋ Buat Kunjungan Baru</Text>
        </TouchableOpacity>

        {loading ? null : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState icon="📍" title="Belum ada kunjungan" />
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTime}>
                  {formatDateTime(item.visited_at ?? item.created_at)}
                </Text>
                <SelfieThumbnail photo={item.selfie_photo} />
              </View>
              <Text style={styles.coordinates}>
                {formatCoordinates(item.latitude ?? null, item.longitude ?? null)}
              </Text>
              {item.note ? (
                <Text style={styles.note} numberOfLines={3}>
                  {item.note}
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
  newButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  newButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  coordinates: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: Spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: 13,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
});

