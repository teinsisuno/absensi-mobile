import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import { useBiometric, useCache } from '../hooks';
import { clearAllData, getBaseUrl } from '../services/database';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { APP_VERSION } from '../utils/constants';

export default function SettingsScreen() {
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const logout = useAuthStore((s) => s.logout);
  const apiBaseUrl = useAppStore((s) => s.apiBaseUrl);
  const isOnline = useAppStore((s) => s.isOnline);
  const setApiBaseUrl = useAppStore((s) => s.setApiBaseUrl);
  const { clearCache } = useCache();
  const biometric = useBiometric();

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const ok = await biometric.authenticate('Verifikasi untuk mengaktifkan biometrik');
      if (!ok) return;
    }
    await setBiometricEnabled(value);
    Toast.show({
      type: 'success',
      text1: value ? 'Biometrik diaktifkan' : 'Biometrik dimatikan',
    });
  };

  const handleClearCache = () => {
    Alert.alert('Hapus Cache', 'Riwayat & antrean offline akan dihapus dari perangkat.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await clearCache();
          Toast.show({ type: 'success', text1: 'Cache dibersihkan' });
        },
      },
    ]);
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset Aplikasi',
      'Semua data lokal (token, cache, pengaturan) akan dihapus. Anda harus login ulang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await setApiBaseUrl('');
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Mode Offline</Text>
              <Text style={styles.rowSubtitle}>
                Simpan absensi lokal saat tidak ada koneksi
              </Text>
            </View>
            <Switch
              value
              onValueChange={() =>
                Toast.show({
                  type: 'info',
                  text1: 'Mode offline selalu aktif di MVP',
                })
              }
              trackColor={{ true: Colors.primary[600], false: Colors.gray[300] }}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Login Biometrik</Text>
              <Text style={styles.rowSubtitle}>Fingerprint / Face ID untuk login cepat</Text>
            </View>
            <Switch
              value={biometricEnabled}
              disabled={!biometric.isAvailable || !biometric.isEnrolled}
              onValueChange={handleToggleBiometric}
              trackColor={{ true: Colors.primary[600], false: Colors.gray[300] }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Koneksi</Text>
          <Text style={styles.urlLabel}>Base URL API</Text>
          <Text style={styles.urlValue} numberOfLines={2}>
            {apiBaseUrl || 'Belum diatur'}
          </Text>
          <Text style={styles.statusText}>
            Status: {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.card}>
          <Button
            title="Hapus Cache Lokal"
            variant="outline"
            onPress={handleClearCache}
          />
          <View style={styles.separator} />
          <Button title="Reset Aplikasi" variant="danger" onPress={handleResetApp} />
        </View>

        <Text style={styles.version}>Absensi Mobile v{APP_VERSION}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray[200],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gray[500],
    textTransform: 'uppercase',
  },
  urlLabel: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  urlValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  statusText: {
    fontSize: 13,
    color: Colors.primary[700],
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: Spacing.md,
  },
});

