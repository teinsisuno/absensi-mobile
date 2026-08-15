import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import Button from '../components/Button';
import { profileApi, getData } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Sso'>;

export default function SsoScreen({ navigation }: Props) {
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url) {
          setError('Tidak ada link SSO.');
          return;
        }
        const parsed = Linking.parse(url);
        const params = parsed.queryParams as Record<string, string | undefined>;
        const token = params?.token ?? params?.sso_token;
        if (!token) {
          setError('Token SSO tidak ditemukan di URL.');
          return;
        }
        const res = await profileApi.me();
        const data = getData<Record<string, unknown>>(res);
        const user = (data.user ?? data) as Record<string, unknown>;
        await setSession({
          token,
          user: {
            id: Number(user.id),
            name: String(user.name ?? ''),
            email: String(user.email ?? ''),
            role: (user.role as 'superadmin' | 'hr' | 'employee') ?? 'employee',
            employeeId: user.employee_id != null ? Number(user.employee_id) : null,
            employeeName: user.employee_name ? String(user.employee_name) : null,
          },
          tenantSlug: params?.tenant ?? null,
        });
        navigation.replace('Splash');
      } catch {
        setError('Gagal memproses login SSO.');
      }
    })();
  }, [navigation, setSession]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.title}>Login SSO Gagal</Text>
          <Text style={styles.error}>{error}</Text>
          <Button title="Kembali ke Login" onPress={() => navigation.replace('Login')} />
        </>
      ) : (
        <>
          <Text style={styles.title}>Memproses login SSO...</Text>
          <Text style={styles.waiting}>Mohon tunggu sebentar</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing.md,
  },
  error: {
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  waiting: {
    fontSize: 14,
    color: Colors.gray[500],
  },
});

