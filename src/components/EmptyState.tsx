import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
}

export default function EmptyState({
  icon = '🗂️',
  title = 'Belum ada data',
  description,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 44,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[700],
  },
  description: {
    fontSize: 13,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

