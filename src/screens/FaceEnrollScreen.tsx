import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import LoadingOverlay from '../components/LoadingOverlay';
import ScreenContainer from '../components/ScreenContainer';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { faceApi } from '../services/api';
import { extractFaceEmbedding } from '../services/faceEmbedding';
import type { SubStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<SubStackParamList, 'FaceEnroll'>;

export default function FaceEnrollScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);

  const handleScan = useCallback(async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      if (!picture) throw new Error('Kamera tidak menghasilkan foto.');

      const embedding = await extractFaceEmbedding(picture.uri);
      await faceApi.enroll(JSON.stringify(embedding), 'client');
      await useAuthStore.getState().setFaceEnrolled(true);
      // Update status server di store — kalau tidak, guard absen (Dashboard/FAB)
      // masih baca false → user disuruh scan lagi (loop).
      useUiStore.getState().setFaceEnrolledServer(true);
      Toast.show({ type: 'success', text1: 'Wajah berhasil diperbarui' });
      navigation.goBack();
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Terjadi kesalahan.';
      Toast.show({
        type: 'error',
        text1: 'Enrollment gagal',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  }, [loading, navigation]);

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.cameraBox}>
        {isFocused && permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mode="picture"
            mirror
          />
        ) : null}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.faceGuide} />
          <Text style={styles.guideText}>Posisikan wajah di tengah</Text>
        </View>
      </View>

      {!permission?.granted ? (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Akses kamera dibutuhkan</Text>
          <Button title="Izinkan Kamera" onPress={requestPermission} />
        </View>
      ) : (
        <>
          <Text style={styles.instruction}>
            Posisikan wajah di dalam oval dengan cahaya cukup, lalu tekan tombol.
            Analisis wajah berlangsung di perangkat ini (±5 detik pertama).
          </Text>
          <Button
            title="📸 Scan Ulang Wajah"
            size="lg"
            loading={loading}
            onPress={handleScan}
          />
        </>
      )}
      <LoadingOverlay visible={loading} message="Menganalisis wajah..." />
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
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: '62%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.primary[300],
    borderStyle: 'dashed',
  },
  guideText: {
    position: 'absolute',
    bottom: 24,
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
  instruction: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
