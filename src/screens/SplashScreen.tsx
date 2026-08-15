import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { getSetting } from '../services/database';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const baseUrl = await getSetting('api_base_url');
      const user = useAuthStore.getState().user;
      const faceEnrolled = await getSetting('face_enrolled');
      const lastEmail = await getSetting('last_email');

      // Handle SSO deep link dulu
      const url = await Linking.getInitialURL();
      if (url && url.includes('sso')) {
        navigation.replace('Sso', {});
        return;
      }

      // Step 1: belum ada tenant/link → isi tenant
      if (!baseUrl) {
        navigation.replace('Tenant');
        return;
      }

      // Step 2: belum ada akun tersimpan (email lokal kosong) → daftar;
      // sudah ada → login (PIN kalau last_email terisi)
      if (!user) {
        navigation.replace(lastEmail ? 'Login' : 'Register');
        return;
      }

      // Step 3: belum ter-link karyawan → kode unik
      if (!user.employeeId) {
        navigation.replace('Setup');
        return;
      }

      // Step 3 (lanjutan): flag lokal belum selesai → cek ke SERVER,
      // bukan cuma flag lokal (face_enrolled bisa '1' padahal server kosong).
      // Server true/null (offline) → langsung beranda.
      if (faceEnrolled !== '1') {
        const enrolled = await useUiStore.getState().checkFaceStatus();
        if (enrolled === false) {
          navigation.replace('SetupFace');
          return;
        }
      }

      // Semua lengkap → root navigator akan beralih ke MainTabs otomatis
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }],
        }}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>A</Text>
        </View>
      </Animated.View>
      <Text style={styles.appName}>Absensi</Text>
      <View style={styles.loadingRow}>
        <Animated.View style={[styles.loadingDot, { opacity }]} />
        <Animated.View style={[styles.loadingDot, { opacity }]} />
        <Animated.View style={[styles.loadingDot, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoText: {
    fontSize: 46,
    fontWeight: '800',
    color: Colors.primary[700],
  },
  appName: {
    marginTop: 20,
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[300],
  },
});
