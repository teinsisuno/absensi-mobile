import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../stores/appStore';
import { Colors } from '../theme/colors';

export default function OfflineBanner() {
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingCount = useAppStore((s) => s.pendingCount);

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {isOnline
          ? `${pendingCount} absensi menunggu dikirim`
          : 'Anda sedang offline — absensi akan disimpan lokal'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

