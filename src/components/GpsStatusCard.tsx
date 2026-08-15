import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatCoordinates, formatDistance } from '../utils/formatters';

interface GpsStatusCardProps {
  locationName?: string | null;
  radiusMeter?: number | null;
  distanceMeter?: number | null;
  inRadius?: boolean | null;
  coordinates?: { latitude: number | null; longitude: number | null } | null;
  loading?: boolean;
  error?: string | null;
}

export default function GpsStatusCard({
  locationName,
  radiusMeter,
  distanceMeter,
  inRadius,
  coordinates,
  loading,
  error,
}: GpsStatusCardProps) {
  const statusColor =
    error || inRadius === false ? Colors.danger : inRadius ? Colors.success : Colors.warning;
  const statusLabel = error
    ? 'Gagal'
    : loading
      ? 'Mendapatkan lokasi...'
      : inRadius
        ? 'Dalam area'
        : inRadius === false
          ? 'Luar area'
          : 'Cek GPS';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <View style={styles.headerText}>
          <Text style={styles.locationName} numberOfLines={1}>
            {locationName ?? 'Lokasi kerja'}
          </Text>
          {radiusMeter ? (
            <Text style={styles.radiusText}>Radius {radiusMeter}m</Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.coordinateText}>
          {formatCoordinates(coordinates?.latitude ?? null, coordinates?.longitude ?? null)}
        </Text>
        {distanceMeter != null ? (
          <Text style={styles.distanceText}>Jarak {formatDistance(distanceMeter)}</Text>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  radiusText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.round,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray[200],
  },
  coordinateText: {
    fontSize: 12,
    color: Colors.gray[500],
    fontVariant: ['tabular-nums'],
  },
  distanceText: {
    fontSize: 12,
    color: Colors.primary[700],
    fontWeight: '600',
  },
  errorText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.danger,
  },
});

