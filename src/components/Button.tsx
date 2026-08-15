import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  icon?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  size = 'md',
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        size === 'lg' && styles.lg,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.primary[700] : Colors.white} />
      ) : (
        <>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text
            style={[
              styles.text,
              size === 'lg' && styles.lgText,
              variant === 'outline' && styles.outlineText,
              variant === 'ghost' && styles.ghostText,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
  },
  primary: {
    backgroundColor: Colors.primary[600],
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary[600],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  lg: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  lgText: {
    fontSize: 17,
  },
  outlineText: {
    color: Colors.primary[700],
  },
  ghostText: {
    color: Colors.primary[700],
  },
});

