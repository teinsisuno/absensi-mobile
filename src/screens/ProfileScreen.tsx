import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import MenuItem from '../components/MenuItem';
import ScreenContainer from '../components/ScreenContainer';
import { authApi, profileApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { RootStackParamList, SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { APP_VERSION } from '../utils/constants';
import { compressPhotoToBase64, isDataUri, toDataUri } from '../services/photo';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const refreshEmployee = useAuthStore((s) => s.refreshEmployee);
  const logout = useAuthStore((s) => s.logout);
  const [uploading, setUploading] = useState(false);

  // Muat ulang data karyawan tiap Profile dibuka supaya foto profil tetap
  // sinkron dengan server, termasuk saat employee belum terisi di store.
  useEffect(() => {
    refreshEmployee();
  }, [refreshEmployee]);

  const name = employee?.name ?? user?.employeeName ?? user?.name ?? '-';
  const position = employee?.position ?? user?.employeePosition ?? 'Karyawan';
  const locationName = employee?.workLocationName ?? '-';

  const openSub = (screen: keyof SubStackParamList) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.navigate as any)('SubNavigator', { screen });
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {
            // offline — tetap logout lokal
          }
          await logout();
        },
      },
    ]);
  };

  const uploadPhoto = useCallback(
    async (uri: string) => {
      setUploading(true);
      try {
        const base64 = await compressPhotoToBase64(uri);
        const dataUri = toDataUri(base64);
        await profileApi.updatePhoto(dataUri);
        // Refresh data karyawan dari server supaya avatar & cache lokal langsung
        // diperbarui, termasuk saat employee masih null di store.
        await refreshEmployee();
        Toast.show({
          type: 'success',
          text1: 'Foto profil diperbarui',
        });
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Gagal memperbarui foto',
          text2: err instanceof Error && err.message ? err.message : 'Coba lagi.',
        });
      } finally {
        setUploading(false);
      }
    },
    [refreshEmployee]
  );

  const handleChangePhoto = useCallback(() => {
    Alert.alert('Ubah Foto Profil', 'Pilih sumber foto', [
      { text: 'Batal', style: 'cancel' },
      {
        text: '📷 Ambil Foto',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Toast.show({
              type: 'error',
              text1: 'Akses kamera ditolak',
              text2: 'Izinkan akses kamera di pengaturan perangkat.',
            });
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          const asset = result.assets?.[0];
          if (!result.canceled && asset?.uri) await uploadPhoto(asset.uri);
        },
      },
      {
        text: '🖼️ Pilih dari Galeri',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Toast.show({
              type: 'error',
              text1: 'Akses galeri ditolak',
              text2: 'Izinkan akses foto di pengaturan perangkat.',
            });
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          const asset = result.assets?.[0];
          if (!result.canceled && asset?.uri) await uploadPhoto(asset.uri);
        },
      },
    ]);
  }, [uploadPhoto]);

  const photoSource =
    employee?.photo && isDataUri(employee.photo)
      ? { uri: employee.photo }
      : employee?.photo
        ? { uri: employee.photo }
        : null;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.8}
            onPress={handleChangePhoto}
            accessibilityLabel="Ubah foto profil"
          >
            {photoSource ? (
              <Image source={photoSource} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{name.charAt(0)?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.avatarBadgeText}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.position}>{position}</Text>
          <Text style={styles.location}>{locationName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Menu</Text>
          <View style={styles.card}>
            <MenuItem
              icon="👤"
              label="Biodata & Dokumen"
              onPress={() => openSub('ProfileDetail')}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="📅"
              label="Jadwal Saya"
              onPress={() => openSub('Calendar')}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="📊"
              label="Rekap Absensi"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Attendance' })}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="🔐"
              label="Ganti PIN"
              onPress={() => openSub('PinChange')}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="😊"
              label="Scan Ulang Wajah"
              onPress={() => openSub('FaceEnroll')}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="🔔"
              label="Notifikasi"
              subtitle="Segera hadir"
              onPress={() =>
                Alert.alert('Notifikasi', 'Fitur push notification akan hadir di versi berikutnya.')
              }
            />
            <View style={styles.separator} />
            <MenuItem icon="⚙️" label="Pengaturan" onPress={() => openSub('Settings')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.card}>
            <MenuItem icon="ℹ️" label={`Versi ${APP_VERSION}`} />
            <View style={styles.separator} />
            <MenuItem icon="🚪" label="Keluar" danger onPress={handleLogout} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarWrap: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarBadgeText: {
    fontSize: 13,
    color: Colors.white,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.gray[900],
  },
  position: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.screen,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[500],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray[200],
    marginLeft: 62,
  },
});
