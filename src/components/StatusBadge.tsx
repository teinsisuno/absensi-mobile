import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { labelStatus } from '../utils/formatters';

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

const toneMap: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  disetujui: 'success',
  rejected: 'danger',
  ditolak: 'danger',
  cancelled: 'neutral',
  dibatalkan: 'neutral',
  hadir: 'success',
  izin: 'info',
  sakit: 'warning',
  cuti: 'purple',
  libur: 'neutral',
  alpha: 'danger',
  in_progress: 'warning',
  proses: 'warning',
  done: 'success',
  selesai: 'success',
  failed: 'danger',
  syncing: 'info',
};

const toneColors: Record<BadgeTone, { bg: string; text: string }> = {
  success: { bg: '#d1fae5', text: '#047857' },
  warning: { bg: '#fef3c7', text: '#b45309' },
  danger: { bg: '#fee2e2', text: '#b91c1c' },
  info: { bg: '#e0f2fe', text: '#0369a1' },
  neutral: { bg: '#f3f4f6', text: '#4b5563' },
  purple: { bg: '#ede9fe', text: '#6d28d9' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const tone = toneMap[status.toLowerCase()] ?? 'neutral';
  const colors = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: colors.text }, size === 'md' && styles.mdText]}>
        {labelStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.round,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  mdText: {
    fontSize: 13,
  },
});

