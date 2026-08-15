import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarIcon, ClockCircleIcon, FileIcon, MapPinIcon, TasksIcon } from './icons';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

export type MenuCardIcon = 'clock' | 'file' | 'map' | 'tasks' | 'calendar';
export type MenuCardColor = 'primary' | 'warning' | 'success' | 'purple';

interface Props {
  icon: MenuCardIcon;
  color: MenuCardColor;
  label: string;
  sub: string;
  onPress?: () => void;
}

const ICON_COMPONENTS: Record<MenuCardIcon, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  clock: ClockCircleIcon,
  file: FileIcon,
  map: MapPinIcon,
  tasks: TasksIcon,
  calendar: CalendarIcon,
};

const COLOR_VALUES: Record<MenuCardColor, string> = {
  primary: Colors.primary[600],
  warning: Colors.warning,
  success: Colors.success,
  purple: Colors.purple,
};

/** Kartu menu 2 kolom — padanan MenuCard.vue PWA (chip ikon berwarna + label + sub). */
export default function MenuCard({ icon, color, label, sub, onPress }: Props) {
  const IconComp = ICON_COMPONENTS[icon];
  const tint = COLOR_VALUES[color];
  const [pressed, setPressed] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.card, pressed && styles.cardPressed]}
      activeOpacity={0.8}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <View style={[styles.iconChip, { backgroundColor: tint + '1a' }]}>
        <IconComp size={20} color={tint} strokeWidth={1.8} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    transform: [{ scale: 1 }],
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  sub: {
    fontSize: 11,
    color: Colors.gray[400],
    marginTop: 2,
  },
});
