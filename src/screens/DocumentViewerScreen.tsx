import { Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import type { SubStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<SubStackParamList, 'DocumentViewer'>;

export default function DocumentViewerScreen({ route }: Props) {
  const { uri, title } = route.params;

  const openExternal = async () => {
    const supported = await Linking.canOpenURL(uri);
    if (supported) {
      await Linking.openURL(uri);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.icon}>📄</Text>
        <Text style={styles.title}>{title ?? 'Dokumen'}</Text>
        <Text style={styles.hint}>
          Dokumen akan dibuka di aplikasi default perangkat (browser/PDF viewer).
        </Text>
        <Button title="Buka Dokumen" size="lg" onPress={openExternal} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: Spacing.screen,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.gray[900],
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: Colors.gray[500],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});

