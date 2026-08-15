import { Image, StyleSheet, Text, View } from 'react-native';
import { forwardRef } from 'react';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { formatDateTime, formatCoordinates } from '../utils/formatters';

export interface PhotoStampData {
  label: string;
  name: string;
  dateTime: string;
  latitude: number;
  longitude: number;
  locationName?: string | null;
}

interface PhotoStampOverlayProps {
  photoUri: string;
  stamp: PhotoStampData;
}

const PhotoStampOverlay = forwardRef<View, PhotoStampOverlayProps>(
  ({ photoUri, stamp }, ref) => {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.container}
      >
        <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.overlay}>
          <View style={styles.header}>
            <View style={styles.labelBox}>
              <Text style={styles.labelText}>{stamp.label}</Text>
            </View>
            <Text style={styles.name}>{stamp.name}</Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.meta}>{formatDateTime(stamp.dateTime)}</Text>
            <Text style={styles.meta}>
              {formatCoordinates(stamp.latitude, stamp.longitude)}
            </Text>
            {stamp.locationName ? (
              <Text style={styles.meta}>{stamp.locationName}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }
);

PhotoStampOverlay.displayName = 'PhotoStampOverlay';

export default PhotoStampOverlay;

const styles = StyleSheet.create({
  container: {
    width: 300,
    aspectRatio: 3 / 4,
    backgroundColor: Colors.black,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  labelBox: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  labelText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  name: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 1,
  },
  meta: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});

