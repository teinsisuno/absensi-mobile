import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { getSetting, setSetting } from '../services/database';
import { useAppStore } from '../stores/appStore';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { normalizeTenantUrl } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Tenant'>;

export default function TenantScreen({ navigation }: Props) {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setApiBaseUrl = useAppStore((s) => s.setApiBaseUrl);

  const preview = normalizeTenantUrl(slug).url;

  const handleContinue = async () => {
    const clean = slug.trim().toLowerCase();
    const { url, isSlug } = normalizeTenantUrl(clean);
    if (!url) {
      setError('Gunakan slug (contoh: tokoa) atau URL lengkap (contoh: http://sigit-absensi.test:8000)');
      return;
    }
    setError(null);
    await setApiBaseUrl(url);
    await setSetting('tenant_slug', isSlug ? clean : '');
    // Step 2: belum ada akun tersimpan di perangkat (last_email kosong) → daftar;
    // sudah ada → login (PIN kalau last_email terisi)
    const lastEmail = await getSetting('last_email');
    navigation.replace(lastEmail ? 'Login' : 'Register');
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.title}>Pilih Tenant</Text>
        <Text style={styles.subtitle}>Masukkan slug tenant atau URL API Anda</Text>
      </View>

      <TextField
        label="Slug / URL"
        value={slug}
        onChangeText={setSlug}
        placeholder="tokoa / http://sigit-absensi.test:8000"
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        hint="Slug → otomatis {slug}-absensi.megakomsel.com. URL lokal → dipakai apa adanya."
      />

      <Button
        title="Lanjutkan"
        size="lg"
        disabled={!slug.trim()}
        onPress={handleContinue}
      />

      <View style={styles.urlCard}>
        <Text style={styles.urlLabel}>Base URL yang akan dipakai</Text>
        <Text style={styles.urlValue} numberOfLines={2}>
          {preview || 'https://{slug}-absensi.megakomsel.com/api/v1'}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    color: Colors.white,
    fontSize: 34,
    fontWeight: '800',
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
  },
  urlCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary[50],
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  urlLabel: {
    fontSize: 12,
    color: Colors.primary[800],
    fontWeight: '600',
  },
  urlValue: {
    fontSize: 13,
    color: Colors.primary[700],
    marginTop: Spacing.xs,
  },
});

