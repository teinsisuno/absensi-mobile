import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { useAuth } from '../hooks';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<AuthStackParamList, 'Setup'>;

export default function SetupScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedPosition, setVerifiedPosition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { linkEmployee } = useAuth();

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Masukkan kode unik dari HR');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { authApi, getData } = await import('../services/api');
      const res = await authApi.verifyInvite(code.trim());
      const payload = getData<Record<string, unknown>>(res);
      const employee = payload.employee as Record<string, unknown> | undefined;
      setVerifiedName(String(employee?.name ?? payload.name ?? ''));
      setVerifiedPosition(String(employee?.position ?? payload.position ?? ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode tidak valid');
      setVerifiedName(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await linkEmployee(code.trim());
      Toast.show({
        type: 'success',
        text1: 'Akun terhubung',
        text2: 'Data karyawan tersimpan.',
      });
      // Setelah link sukses → selalu lanjut scan wajah (tombol Lewati tetap tersedia di sana)
      navigation.replace('SetupFace');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghubungkan akun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <Text style={styles.title}>Input Kode Unik</Text>
      <Text style={styles.subtitle}>
        Masukkan kode unik dari HR untuk menghubungkan akun Anda dengan data karyawan.
      </Text>

      <TextField
        label="Kode Unik"
        value={code}
        onChangeText={(v) => {
          setCode(v);
          setVerifiedName(null);
          setError(null);
        }}
        placeholder="KODE123"
        autoCapitalize="characters"
        error={error}
      />

      {!verifiedName ? (
        <Button
          title="Verifikasi Kode"
          variant="outline"
          loading={loading}
          onPress={handleVerify}
        />
      ) : null}

      {verifiedName ? (
        <View style={styles.employeeCard}>
          <Text style={styles.checkIcon}>✅</Text>
          <Text style={styles.employeeName}>{verifiedName}</Text>
          <Text style={styles.employeePosition}>{verifiedPosition ?? '-'}</Text>
        </View>
      ) : null}

      {verifiedName ? (
        <>
          <Button
            title="Simpan & Lanjutkan"
            size="lg"
            style={styles.saveButton}
            loading={loading}
            onPress={handleSave}
          />
          <Text style={styles.hintText}>
            Setelah disimpan, Anda akan diminta scan wajah untuk absen.
          </Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  employeeCard: {
    backgroundColor: Colors.success + '14',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  checkIcon: {
    fontSize: 28,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray[900],
    marginTop: Spacing.xs,
  },
  employeePosition: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: Spacing.sm,
  },
});

