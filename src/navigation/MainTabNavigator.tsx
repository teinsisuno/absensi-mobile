import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import DashboardScreen from '../screens/DashboardScreen';
import ClockScreen from '../screens/ClockScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AbsenModal from '../components/AbsenModal';
import { CalendarIcon, FingerprintIcon, HomeIcon, ScheduleIcon, UserIcon } from '../components/icons';
import { useUiStore } from '../stores/uiStore';
import type { MainTabParamList, RootStackParamList, SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabKey = 'Dashboard' | 'Attendance' | 'Calendar' | 'Profile';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const ITEMS: TabItem[] = [
  { key: 'Dashboard', label: 'Beranda', icon: HomeIcon },
  { key: 'Attendance', label: 'Absensi', icon: CalendarIcon },
  { key: 'Calendar', label: 'Jadwal', icon: ScheduleIcon },
  { key: 'Profile', label: 'Profil', icon: UserIcon },
];

/**
 * Tab bar custom ala MobileNav.vue PWA:
 * Beranda · Absensi · [FAB fingerprint → AbsenModal] · Jadwal · Profil
 */
function PwaTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openAbsen = useUiStore((s) => s.openAbsenModal);
  const routeNames = state.routes.map((r: any) => r.name);

  const go = (key: TabKey) => {
    const target = routeNames.indexOf(key);
    if (target >= 0) navigation.navigate(state.routes[target].name);
  };

  const isActive = (key: TabKey) => state.index === routeNames.indexOf(key);

  // Absen wajib sudah scan wajah (cek ke server). Kalau belum → notif + arahkan scan.
  const handleFabPress = async () => {
    let enrolled = useUiStore.getState().faceEnrolledServer;
    // Store belum true (null belum dicek / false basi) → re-check ke server biar
    // user yang barusan enroll tidak di-loop suruh scan lagi.
    if (enrolled !== true) enrolled = await useUiStore.getState().checkFaceStatus();
    if (enrolled === false) {
      Toast.show({
        type: 'error',
        text1: 'Belum scan wajah',
        text2: 'Scan wajah dulu untuk bisa absensi.',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rootNavigation.navigate as any)('SubNavigator', { screen: 'FaceEnroll' as keyof SubStackParamList });
      return;
    }
    openAbsen();
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.row}>
        {ITEMS.slice(0, 2).map((item) => (
          <NavBtn key={item.key} item={item} active={isActive(item.key)} onPress={() => go(item.key)} />
        ))}

        {/* FAB tengah */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={handleFabPress}>
          <FingerprintIcon size={26} color={Colors.white} />
        </TouchableOpacity>

        {ITEMS.slice(2).map((item) => (
          <NavBtn key={item.key} item={item} active={isActive(item.key)} onPress={() => go(item.key)} />
        ))}
      </View>
    </View>
  );
}

function NavBtn({
  item,
  active,
  onPress,
}: {
  item: TabItem;
  active: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <TouchableOpacity style={styles.navBtn} activeOpacity={0.7} onPress={onPress}>
      <Icon size={24} color={active ? Colors.primary[600] : Colors.gray[400]} />
      <Text style={[styles.navLabel, { color: active ? Colors.primary[600] : Colors.gray[400] }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function MainTabNavigator() {
  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <PwaTabBar {...props} />}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Clock" component={ClockScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <AbsenModal />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray[200],
    paddingTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navBtn: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 56,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: Colors.primary[800],
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
