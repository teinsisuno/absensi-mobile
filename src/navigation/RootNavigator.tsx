import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import SubNavigator from './SubNavigator';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { useUiStore } from '../stores/uiStore';
import { getSetting } from '../services/database';
import { syncService } from '../services/sync';
import { Colors } from '../theme/colors';

const RootStack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color={Colors.primary[600]} />
      <Text style={styles.loadingText}>Absensi</Text>
    </View>
  );
}

export default function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const faceEnrolled = useAuthStore((s) => s.faceEnrolled);
  const hydrate = useAuthStore((s) => s.hydrate);
  const initApp = useAppStore((s) => s.init);

  // Face gate: user sudah ter-link karyawan TAPI wajah belum di-enroll → tahan di
  // Auth stack (Splash/SetupFace) supaya alur "Simpan → scan wajah → Beranda" dan
  // "belum ada wajah → scan dulu sebelum Beranda" tidak terpotong oleh perpindahan
  // langsung ke MainTabs begitu employeeId terisi.
  const ready = isAuthenticated && user?.employeeId != null;
  const [faceOk, setFaceOk] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
    initApp();
    syncService.start();
    return () => syncService.stop();
  }, [hydrate, initApp]);

  useEffect(() => {
    if (!isHydrated || !ready) {
      setFaceOk(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Flag lokal '1' (sudah enroll/lewati) → langsung masuk.
      const localEnrolled = await getSetting('face_enrolled');
      if (cancelled) return;
      if (localEnrolled === '1') {
        setFaceOk(true);
        return;
      }
      // Cek ke SERVER; false → wajah belum ada (Auth stack akan arahkan ke SetupFace);
      // true/null (offline/gagal) → jangan blokir, biarkan masuk.
      const enrolled = await useUiStore.getState().checkFaceStatus();
      if (!cancelled) setFaceOk(enrolled !== false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, ready, faceEnrolled]);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isHydrated ? (
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        ) : ready && faceOk ? (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
            <RootStack.Screen name="SubNavigator" component={SubNavigator} />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
