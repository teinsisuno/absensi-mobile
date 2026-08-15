import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface MenuItemProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

export default function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  danger,
  rightElement,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.6}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.icon, danger && styles.iconDanger]}>{icon}</Text>
      <View style={styles.labelWrap}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ?? <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.white,
  },
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  iconDanger: {
    color: Colors.danger,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  labelDanger: {
    color: Colors.danger,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    color: Colors.gray[400],
    fontWeight: '300',
  },
});

