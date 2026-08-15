import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import Button from '../components/Button';
import LoadingOverlay from '../components/LoadingOverlay';
import ScreenContainer from '../components/ScreenContainer';
import type { AuthStackParamList } from '../types/navigation';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { faceApi } from '../services/api';
import { extractFaceEmbedding } from '../services/faceEmbedding';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupFace'>;

export default function SetupFaceScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  const finish = useCallback(async (success: boolean) => {
    // Cukup set flag lokal; gate di RootNavigator yang memindahkan ke MainTabs.
    // Sukses → masuk Beranda. Gagal → tetap di layar ini (bisa coba lagi / lewati).
    await useAuthStore.getState().setFaceEnrolled(success);
  }, []);

  const handleScan = useCallback(async () => {
    const user = useAuthStore.getState().user;
    if (!user?.employeeId) {
      Toast.show({
        type: 'error',
        text1: 'Akun belum terhubung',
        text2: 'Hubungkan akun ke data karyawan dulu (kode unik dari HR).',
      });
      navigation.replace('Setup');
      return;
    }
    if (!cameraRef.current || loading) return;
    setLoading(true);
    try {
      // 1. Ambil foto selfie (guide oval = wajah di tengah)
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      if (!picture) throw new Error('Kamera tidak menghasilkan foto.');

      // 2. Hitung embedding 128-d di device (face-api compatible)
      const embedding = await extractFaceEmbedding(picture.uri);

      // 3. Simpan template ke server (mode client — matching tetap di server)
      await faceApi.enroll(JSON.stringify(embedding), 'client');
      // Update status server di store — biar guard absen tidak loop suruh scan lagi.
      useUiStore.getState().setFaceEnrolledServer(true);
      Toast.show({ type: 'success', text1: 'Wajah berhasil didaftarkan' });
      await finish(true);
    } catch (err) {
      // Log detail ke terminal Metro — penting buat diagnosa tfjs di Expo Go
      console.error('[SetupFace] enrollment gagal:', err);
      const message =
        err instanceof Error && err.message ? err.message : 'Terjadi kesalahan.';
      Toast.show({
        type: 'error',
        text1: 'Enrollment gagal',
        text2: `${message} Anda tetap bisa lanjut dan scan ulang nanti.`,
      });
      await finish(false);
    } finally {
      setLoading(false);
    }
  }, [finish, loading]);

  const skip = useCallback(async () => {
    // Lewati = tandai onboarding selesai (biar tidak diminta lagi),
    // tapi wajah TIDAK terdaftar di server. Enroll kapan pun lewat Profil → Scan Ulang Wajah.
    // Gate di RootNavigator akan pindah ke MainTabs (flag lokal jadi '1').
    await useAuthStore.getState().setFaceEnrolled(true);
  }, []);

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
            Posisikan wajah di dalam oval, pastikan cahaya cukup, lalu tekan tombol.
            Proses analisis wajah berlangsung di perangkat ini.
          </Text>
          <Button
            title="📸 Scan Wajah"
            size="lg"
            loading={loading}
            onPress={handleScan}
          />
          <TouchableOpacity style={styles.skipButton} onPress={skip} disabled={loading}>
            <Text style={styles.skipText}>Lewati untuk sekarang</Text>
          </TouchableOpacity>
        </>
      )}
      <LoadingOverlay
        visible={loading}
        message="Menganalisis wajah... (sekali saja, ±5 detik)"
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
    marginTop: Spacing.lg,
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
  },
  skipButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.gray[500],
    fontSize: 13,
  },
});
