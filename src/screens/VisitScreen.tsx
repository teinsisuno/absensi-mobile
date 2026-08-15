import { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { useLocation } from '../hooks';
import { visitApi } from '../services/api';
import { compressPhotoToBase64 } from '../services/photo';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatCoordinates } from '../utils/formatters';

export default function VisitScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { location, getCurrentPosition, isLoading: gpsLoading } = useLocation();
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const takePhoto = useCallback(async () => {
    const pos = location ?? (await getCurrentPosition());
    if (!cameraRef.current) return;
    const picture = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      skipProcessing: false,
    });
    if (!picture) return;
    setPhoto(picture.uri);
    if (!pos) getCurrentPosition();
  }, [getCurrentPosition, location]);

  const handleSubmit = useCallback(async () => {
    if (!photo) {
      Toast.show({ type: 'error', text1: 'Ambil foto dulu' });
      return;
    }
    if (!location) {
      Toast.show({ type: 'error', text1: 'Koordinat belum didapat', text2: 'Aktifkan GPS.' });
      return;
    }
    setSubmitting(true);
    try {
      const base64 = await compressPhotoToBase64(photo);
      await visitApi.create({
        latitude: location.latitude,
        longitude: location.longitude,
        selfie_photo: `data:image/jpeg;base64,${base64}`,
        note: note.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Kunjungan tersimpan' });
      setPhoto(null);
      setNote('');
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal menyimpan',
        text2: e instanceof Error ? e.message : 'Endpoint kunjungan mungkin belum tersedia.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [location, note, photo]);

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      {isFocused && permission?.granted && !photo ? (
        <View style={styles.cameraBox}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mode="picture"
            mirror
          />
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.guideText}>Ambil foto selfie kunjungan</Text>
          </View>
        </View>
      ) : null}

      {photo ? (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
            <Text style={styles.retakeText}>Ulangi Foto</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!permission?.granted ? (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Akses kamera dibutuhkan</Text>
          <Button title="Izinkan Kamera" onPress={requestPermission} />
        </View>
      ) : (
        <Button
          title={photo ? 'Ganti Foto' : '📷 Ambil Foto'}
          variant="outline"
          onPress={takePhoto}
        />
      )}

      <View style={styles.coordCard}>
        <Text style={styles.coordLabel}>
          {gpsLoading ? 'Mendapatkan koordinat...' : '📍 Koordinat (auto-detect)'}
        </Text>
        <Text style={styles.coordValue}>
          {location
            ? formatCoordinates(location.latitude, location.longitude)
            : 'Belum tersedia'}
        </Text>
      </View>

      <TextField
        label="Keterangan"
        value={note}
        onChangeText={setNote}
        placeholder="Contoh: kunjungan ke toko cabang baru"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Button
        title="Simpan Kunjungan"
        size="lg"
        loading={submitting}
        onPress={handleSubmit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.gray[900],
    marginBottom: Spacing.lg,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.lg,
  },
  guideText: {
    color: Colors.white,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  permissionBox: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[800],
    marginBottom: Spacing.md,
  },
  photoPreview: {
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
  },
  retakeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.round,
  },
  retakeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  coordCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  coordLabel: {
    fontSize: 12,
    color: Colors.primary[800],
    fontWeight: '600',
  },
  coordValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary[700],
    marginTop: Spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});

