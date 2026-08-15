import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LeaveRequestScreen from '../screens/LeaveRequestScreen';
import OvertimeRequestScreen from '../screens/OvertimeRequestScreen';
import CalendarScreen from '../screens/CalendarScreen';
import VisitScreen from '../screens/VisitScreen';
import VisitListScreen from '../screens/VisitListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import AnnouncementListScreen from '../screens/AnnouncementListScreen';
import AnnouncementDetailScreen from '../screens/AnnouncementDetailScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';
import FaceEnrollScreen from '../screens/FaceEnrollScreen';
import PinChangeScreen from '../screens/PinChangeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';

const Stack = createNativeStackNavigator<SubStackParamList>();

export default function SubNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary[700] },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.gray[50] },
      }}
    >
      <Stack.Screen
        name="LeaveRequest"
        component={LeaveRequestScreen}
        options={{ title: 'Pengajuan' }}
      />
      <Stack.Screen
        name="OvertimeRequest"
        component={OvertimeRequestScreen}
        options={{ title: 'Pengajuan Lembur' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Jadwal Kerja' }}
      />
      <Stack.Screen
        name="Visit"
        component={VisitScreen}
        options={{ title: 'Kunjungan Baru' }}
      />
      <Stack.Screen
        name="VisitList"
        component={VisitListScreen}
        options={{ title: 'Riwayat Kunjungan' }}
      />
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{ title: 'Tugas Luar' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Detail Tugas Luar' }}
      />
      <Stack.Screen
        name="AnnouncementList"
        component={AnnouncementListScreen}
        options={{ title: 'Pengumuman' }}
      />
      <Stack.Screen
        name="AnnouncementDetail"
        component={AnnouncementDetailScreen}
        options={{ title: 'Detail Pengumuman' }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ title: 'Biodata & Dokumen' }}
      />
      <Stack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={{ title: 'Dokumen' }}
      />
      <Stack.Screen
        name="FaceEnroll"
        component={FaceEnrollScreen}
        options={{ title: 'Scan Ulang Wajah' }}
      />
      <Stack.Screen
        name="PinChange"
        component={PinChangeScreen}
        options={{ title: 'Ganti PIN' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Pengaturan' }}
      />
    </Stack.Navigator>
  );
}

