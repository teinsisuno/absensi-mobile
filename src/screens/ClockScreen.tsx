import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { FingerprintIcon, MapPinIcon, UserIcon } from '../components/icons';
import { useAttendance, useLocation } from '../hooks';
import { compressPhotoToBase64 } from '../services/photo';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useAuthStore } from '../stores/authStore';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatTime } from '../utils/formatters';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type ClockRoute = RouteProp<MainTabParamList, 'Clock'>;

/**
 * Layar absen ala clock.vue PWA:
 * kamera full-screen gelap + kartu GPS + guide lingkaran + tombol besar.
 * Type/force dikirim dari AbsenModal (Clock In/Out/Ulang).
 */
export default function ClockScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ClockRoute>();
  const isFocused = useIsFocused();
  const { clock, loadLocal } = useAttendance();
  const today = useAttendanceStore((s) => s.today);
  const employee = useAuthStore((s) => s.employee);

  const cameraRef = useRef<CameraView | null>(null);
  const [permission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const { location, error: gpsError, getCurrentPosition, isLoading: gpsLoading } =
    useLocation();

  const [serverTime, setServerTime] = useState(new Date());

  // Param dari AbsenModal: type in/out + force (tambah riwayat)
  const qType = route.params?.type;
  const isForce = Boolean(route.params?.force);

  const actionType: 'clock_in' | 'clock_out' =
    qType === 'in' || qType === 'out'
      ? qType === 'in'
        ? 'clock_in'
        : 'clock_out'
      : today?.hasClockIn && !today?.hasClockOut
        ? 'clock_out'
        : 'clock_in';
  const isOut = actionType === 'clock_out';

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLocal();
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [loadLocal]);

  useEffect(() => {
    if (isFocused) getCurrentPosition();
  }, [getCurrentPosition, isFocused]);

  // Ring animasi berputar pelan
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const locationName = today?.clockIn?.workLocationName ?? employee?.workLocationName ?? 'Mencari lokasi…';
  const locationStatus = location ? 'Dalam Area' : 'Menunggu GPS';

  const doClock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const position = location ?? (await getCurrentPosition());
      if (!position) {
        Toast.show({
          type: 'error',
          text1: 'Lokasi belum tersedia',
          text2: 'Aktifkan GPS lalu coba lagi.',
        });
        return;
      }

      let selfiePhotoBase64: string | undefined;
      if (permission?.granted && cameraReady && cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.7,
            skipProcessing: false,
          });
          if (photo?.uri) {
            selfiePhotoBase64 = await compressPhotoToBase64(photo.uri);
          }
        } catch {
          // kamera gagal → tetap absen tanpa foto (sama seperti PWA)
        }
      }

      const result = await clock({
        type: actionType,
        latitude: position.latitude,
        longitude: position.longitude,
        selfiePhotoBase64,
        force: isForce,
      });

      Toast.show({
        type: result.mode === 'online' ? 'success' : 'info',
        text1:
          result.mode === 'online'
            ? `Clock ${actionType === 'clock_in' ? 'In' : 'Out'} berhasil`
            : 'Disimpan offline',
        text2: result.message,
      });

      setTimeout(
        () => navigation.navigate('MainTabs', { screen: 'Dashboard' }),
        1500
      );
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Gagal memproses absen',
        text2: e instanceof Error ? e.message : 'Coba lagi.',
      });
    } finally {
      setBusy(false);
    }
  }, [
    actionType,
    busy,
    cameraReady,
    clock,
    getCurrentPosition,
    isForce,
    location,
    navigation,
    permission?.granted,
  ]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.root}>
      {/* Header overlay */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })}
        >
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>{isForce ? 'Absensi · Tambah riwayat' : 'Absensi'}</Text>
          <Text style={styles.headerTitle}>{isOut ? 'Clock Out' : 'Clock In'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Kartu GPS */}
      <View style={styles.gpsWrap}>
        <View style={styles.gpsCard}>
          <View style={styles.gpsIcon}>
            <MapPinIcon size={16} color={Colors.success} />
          </View>
          <View style={styles.gpsBody}>
            <Text style={styles.gpsName} numberOfLines={1}>{locationName}</Text>
            <Text style={styles.gpsMeta}>
              Radius 100m ·{' '}
              <Text style={styles.gpsStatus}>{locationStatus}</Text>
            </Text>
          </View>
          <View style={styles.gpsDot} />
        </View>
      </View>

      {/* Area kamera */}
      <View style={styles.cameraArea}>
        {isFocused && permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            mode="picture"
            mirror
            onCameraReady={() => setCameraReady(true)}
          />
        ) : null}
        <View style={styles.cameraShade} pointerEvents="none" />

        <View style={styles.guideWrap}>
          <View style={styles.guideCircle}>
            <Animated.View style={[styles.guideRing, { transform: [{ rotate }] }]} />
            <View style={styles.guideInner}>
              <UserIcon size={72} color="rgba(255,255,255,0.4)" strokeWidth={1.2} />
            </View>
          </View>
          <Text style={styles.guideText}>
            {permission?.granted ? 'Posisikan wajah di tengah' : 'Kamera tidak aktif'}
          </Text>
        </View>
      </View>

      {/* Aksi */}
      <View style={styles.actionArea}>
        <TouchableOpacity
          style={[styles.actionBtn, isOut ? styles.actionBtnOut : styles.actionBtnIn]}
          activeOpacity={0.9}
          disabled={busy}
          onPress={doClock}
        >
          <FingerprintIcon size={24} color={Colors.white} />
          <Text style={styles.actionBtnText}>
            {busy ? 'Memproses…' : isOut ? 'Clock Out Sekarang' : 'Clock In Sekarang'}
          </Text>
        </TouchableOpacity>

        {!permission?.granted ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠️ Kamera tidak aktif — absen tetap dicatat TANPA foto selfie. Izinkan akses kamera untuk verifikasi wajah.
            </Text>
          </View>
        ) : null}

        <Text style={styles.serverTime}>
          Waktu server:{' '}
          <Text style={styles.serverTimeValue}>
            {formatTime(serverTime.toISOString())}
          </Text>
        </Text>
        {gpsLoading ? <Text style={styles.gpsLoading}>Mendapatkan lokasi…</Text> : null}
        {gpsError ? <Text style={styles.gpsError}>⚠️ {gpsError}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBack: {
    fontSize: 28,
    lineHeight: 30,
    color: Colors.white,
    marginTop: -2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  gpsWrap: {
    position: 'absolute',
    top: 100,
    left: Spacing.screen,
    right: Spacing.screen,
    zIndex: 20,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  gpsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBody: {
    flex: 1,
  },
  gpsName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  gpsMeta: {
    fontSize: 10,
    color: Colors.gray[500],
    marginTop: 2,
  },
  gpsStatus: {
    color: Colors.success,
    fontWeight: '700',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  cameraArea: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  guideWrap: {
    alignItems: 'center',
    zIndex: 10,
  },
  guideCircle: {
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideRing: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary[500],
    borderLeftColor: Colors.primary[500],
    opacity: 0.7,
  },
  guideInner: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideText: {
    marginTop: Spacing.lg,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  actionArea: {
    backgroundColor: '#111827',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  actionBtnIn: {
    backgroundColor: Colors.primary[600],
  },
  actionBtnOut: {
    backgroundColor: Colors.danger,
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  warning: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  warningText: {
    fontSize: 11,
    color: '#fde68a',
    textAlign: 'center',
  },
  serverTime: {
    marginTop: Spacing.md,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  serverTimeValue: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: 'rgba(255,255,255,0.6)',
  },
  gpsLoading: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
    color: Colors.primary[300],
  },
  gpsError: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
    color: '#fca5a5',
  },
});
