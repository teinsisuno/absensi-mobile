import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import { getData, profileApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import { formatDate } from '../utils/formatters';

interface EmployeeData {
  id: number;
  name?: string;
  nik?: string | null;
  phone?: string | null;
  address?: string | null;
  position?: string | null;
  mobile_role?: string | null;
  work_location_name?: string | null;
  shift_name?: string | null;
  status?: string | null;
  joined_at?: string | null;
  documents?: Array<{ id: number; name: string; type: string; url: string }>;
}

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const employee = useAuthStore((s) => s.employee);
  const [data, setData] = useState<EmployeeData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await profileApi.me();
      const payload = getData<Record<string, unknown>>(res);
      const emp = (payload.employee ?? payload) as EmployeeData;
      setData(emp);
    } catch {
      // offline — pakai data lokal dari store
      if (employee) {
        setData({
          id: employee.id,
          name: employee.name,
          nik: employee.nik,
          phone: employee.phone,
          address: employee.address,
          position: employee.position,
          mobile_role: employee.mobileRole,
          work_location_name: employee.workLocationName,
          shift_name: employee.shiftName,
          status: employee.status,
        });
      }
    }
  }, [employee]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: Array<[string, string | null | undefined]> = [
    ['NIK', data?.nik ?? employee?.nik],
    ['Posisi', data?.position ?? employee?.position],
    ['Role Mobile', data?.mobile_role ?? employee?.mobileRole],
    ['Lokasi Kerja', data?.work_location_name ?? employee?.workLocationName],
    ['Shift', data?.shift_name ?? employee?.shiftName],
    ['Status', data?.status ?? employee?.status],
    ['No. HP', data?.phone ?? employee?.phone],
    ['Alamat', data?.address ?? employee?.address],
    ['Bergabung', data?.joined_at],
  ];

  const documents = data?.documents ?? [];

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Biodata</Text>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value ?? '-'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dokumen</Text>
          {documents.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada dokumen</Text>
          ) : (
            documents.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docRow}
                onPress={() =>
                  navigation.navigate('SubNavigator', {
                    screen: 'DocumentViewer',
                    params: { uri: doc.url, title: doc.name },
                  })
                }
              >
                <Text style={styles.docIcon}>📄</Text>
                <View style={styles.docBody}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docType}>{doc.type}</Text>
                </View>
                <Text style={styles.docChevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gray[900],
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[100],
    gap: Spacing.md,
  },
  label: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[800],
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.gray[400],
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  docIcon: {
    fontSize: 20,
  },
  docBody: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  docType: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  docChevron: {
    fontSize: 20,
    color: Colors.gray[400],
  },
});

