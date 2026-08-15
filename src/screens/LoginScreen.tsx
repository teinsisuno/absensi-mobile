import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import PinKeypad from '../components/PinKeypad';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { useAuth, useBiometric } from '../hooks';
import { isNetworkError } from '../services/api';
import { clearAllData, getSetting } from '../services/database';
import { PIN_LENGTH } from '../utils/constants';
import type { AuthStackParamList } from '../types/navigation';
import type { AuthUser } from '../types/models';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import Toast from 'react-native-toast-message';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type LoginMode = 'pin' | 'email';

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<LoginMode>('pin');
  const [hasSavedEmail, setHasSavedEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const { pinLogin, login } = useAuth();
  const biometric = useBiometric();
  const setSession = useAuthStore((s) => s.setSession);
  const setApiBaseUrl = useAppStore((s) => s.setApiBaseUrl);
  const logout = useAuthStore((s) => s.logout);

  // Email diambil otomatis dari DB lokal (app_settings.last_email).
  // Kalau ada → mode PIN; kalau kosong (HP baru / habis ganti akun) → mode email+password.
  useEffect(() => {
    getSetting('last_email').then((last) => {
      if (last) {
        setEmail(last);
        setHasSavedEmail(true);
        setMode('pin');
      } else {
        setHasSavedEmail(false);
        setMode('email');
      }
    });
  }, []);

  useEffect(() => {
    if (lockUntil && Date.now() >= lockUntil) {
      setLockUntil(null);
      setFailedAttempts(0);
    }
  }, [lockUntil]);

  // Ganti Akun: hapus semua data lokal (token, base URL, email) → balik ke layar pilih tenant.
  const handleChangeAccount = useCallback(() => {
    Alert.alert(
      'Ganti Akun',
      'Semua data lokal (token, cache, link tenant) akan dihapus. Anda akan kembali ke layar pemilihan tenant.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ganti Akun',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await setApiBaseUrl('');
            await logout();
            navigation.replace('Tenant');
          },
        },
      ]
    );
  }, [logout, navigation, setApiBaseUrl]);

  const afterAuth = useCallback(async (userId: number) => {
    const faceEnrolled = await getSetting('face_enrolled');
    const user = useAuthStore.getState().user;
    if (!user?.employeeId) {
      navigation.replace('Setup');
      return;
    }
    // Flag lokal belum selesai → cek ke SERVER (bukan cuma flag lokal).
    // Server true/null (offline) → langsung beranda.
    if (faceEnrolled !== '1') {
      const enrolled = await useUiStore.getState().checkFaceStatus();
      if (enrolled === false) {
        navigation.replace('SetupFace');
        return;
      }
    }
    // Root navigator otomatis pindah ke MainTabs
  }, [navigation]);

  const handlePinComplete = useCallback(
    async (enteredPin: string) => {
      if (!email) {
        setError('Belum ada akun tersimpan di perangkat ini. Silakan daftar dulu.');
        setPin('');
        return;
      }
      if (lockUntil && Date.now() < lockUntil) {
        const wait = Math.ceil((lockUntil - Date.now()) / 1000);
        setError(`Coba lagi dalam ${wait} detik`);
        setPin('');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const user = await pinLogin(email, enteredPin);
        setFailedAttempts(0);
        await afterAuth(user.id);
      } catch (e) {
        // Error jaringan/timeout ≠ PIN salah: jangan dihitung sebagai percobaan
        // gagal supaya user offline tidak ikut kena lockout 5×.
        if (isNetworkError(e)) {
          setPin('');
          setError('Tidak ada koneksi. Pastikan perangkat terhubung internet.');
          return;
        }
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setPin('');
        if (attempts >= 5) {
          const until = Date.now() + 30_000;
          setLockUntil(until);
          setError('Terlalu banyak percobaan. Coba lagi dalam 30 detik.');
        } else {
          setError('PIN salah. Coba lagi.');
        }
      } finally {
        setLoading(false);
      }
    },
    [afterAuth, email, failedAttempts, lockUntil, pinLogin]
  );

  const handleEmailLogin = useCallback(async () => {
    if (!email || !password) {
      setError('Isi email dan password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      await afterAuth(user.id);
    } catch (e) {
      if (isNetworkError(e)) {
        setError('Tidak ada koneksi. Pastikan perangkat terhubung internet.');
      } else {
        setError(e instanceof Error ? e.message : 'Login gagal');
      }
    } finally {
      setLoading(false);
    }
  }, [afterAuth, email, login, password]);

  const handleBiometric = useCallback(async () => {
    const ok = await biometric.authenticate('Verifikasi identitas untuk masuk');
    if (!ok) return;
    setLoading(true);
    try {
      const { authApi, getData } = await import('../services/api');
      const res = await authApi.webauthnLogin();
      const payload = getData<{
        token: string;
        user: { id: number; name?: string; email?: string; role?: string };
        employee?: {
          id?: number;
          name?: string;
          position?: string | null;
          mobile_role?: string | null;
        } | null;
      }>(res);
      await setSession({
        token: payload.token,
        user: {
          id: payload.user.id,
          name: payload.user.name ?? '',
          email: payload.user.email ?? email,
          role: (payload.user.role as 'superadmin' | 'hr' | 'employee') ?? 'employee',
          // Server kirim employee di top-level respons → bawa supaya link tidak hilang.
          employeeId: payload.employee?.id ?? null,
          employeeName: payload.employee?.name ?? null,
          employeePosition: payload.employee?.position ?? null,
          employeeMobileRole: (payload.employee?.mobile_role as AuthUser['employeeMobileRole']) ?? null,
        },
      });
      await afterAuth(payload.user.id);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Login biometrik gagal',
        text2: 'Gunakan PIN sebagai gantinya.',
      });
    } finally {
      setLoading(false);
    }
  }, [afterAuth, biometric, email, setSession]);

  return (
    <View style={styles.root}>
      <ScreenContainer scroll contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.appName}>Absensi</Text>
        </View>

        {mode === 'pin' ? (
          <View style={styles.pinSection}>
            <Text style={styles.sectionTitle}>Masuk dengan PIN</Text>
            <Text style={styles.emailLabel} numberOfLines={1}>
              {email}
            </Text>

            <PinKeypad
              length={PIN_LENGTH}
              pin={pin}
              onPinChange={setPin}
              onComplete={handlePinComplete}
              errorMessage={error}
              disabled={loading}
            />
          </View>
        ) : (
          <View style={styles.emailSection}>
            <Text style={styles.sectionTitle}>Masuk dengan Email</Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="user@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              title="Login"
              size="lg"
              loading={loading}
              onPress={handleEmailLogin}
            />
          </View>
        )}

        {/* Jalan keluar bila PIN belum pernah dibuat / lupa: fallback email & password */}
        {mode === 'pin' ? (
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => {
              setPin('');
              setError(null);
              setMode('email');
            }}
          >
            <Text style={styles.modeToggleText}>Masuk dengan email & password</Text>
          </TouchableOpacity>
        ) : hasSavedEmail ? (
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => {
              setPassword('');
              setError(null);
              setMode('pin');
            }}
          >
            <Text style={styles.modeToggleText}>Masuk dengan PIN</Text>
          </TouchableOpacity>
        ) : null}

        {mode === 'pin' && biometric.isAvailable && biometric.isEnrolled ? (
          <Button
            title="Login Biometrik"
            variant="outline"
            icon="🔐"
            style={styles.biometricButton}
            onPress={handleBiometric}
          />
        ) : null}

        <Button
          title="Daftar"
          variant="outline"
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        />
      </ScreenContainer>

      <TouchableOpacity
        style={[styles.changeAccountButton, { top: insets.top + Spacing.sm }]}
        onPress={handleChangeAccount}
      >
        <Text style={styles.changeAccountText}>Ganti Akun</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray[900],
    marginTop: Spacing.sm,
  },
  pinSection: {
    alignItems: 'center',
  },
  emailSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: Spacing.xs,
  },
  emailLabel: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: Spacing.lg,
    maxWidth: '90%',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  modeToggle: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  biometricButton: {
    marginTop: Spacing.lg,
  },
  registerButton: {
    marginTop: Spacing.xl,
  },
  changeAccountButton: {
    position: 'absolute',
    right: Spacing.md,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  changeAccountText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
});
