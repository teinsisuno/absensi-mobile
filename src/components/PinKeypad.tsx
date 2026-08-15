import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface PinKeypadProps {
  length: number;
  onComplete: (pin: string) => void;
  onError?: () => void;
  disabled?: boolean;
  errorMessage?: string | null;
  pin?: string;
  onPinChange?: (pin: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

export default function PinKeypad({
  length,
  onComplete,
  onError,
  disabled,
  errorMessage,
  pin: externalPin,
  onPinChange,
}: PinKeypadProps) {
  const [internalPin, setInternalPin] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const isControlled = externalPin != null;
  const pin = isControlled ? externalPin : internalPin;

  const vibrateError = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    onError?.();
  }, [onError, shake]);

  useEffect(() => {
    if (!isControlled) setInternalPin('');
  }, [isControlled]);

  const pressKey = useCallback(
    (key: string) => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      let next: string;
      if (key === 'backspace') {
        next = pin.slice(0, -1);
      } else if (pin.length >= length) {
        return;
      } else {
        next = pin + key;
      }

      if (isControlled) onPinChange?.(next);
      else setInternalPin(next);

      if (next.length === length) {
        setTimeout(() => onComplete(next), 120);
      }
    },
    [disabled, isControlled, length, onComplete, onPinChange, pin]
  );

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < length; i++) {
      dots.push(
        <View
          key={i}
          style={[styles.dot, i < pin.length ? styles.dotFilled : null]}
        />
      );
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}
      >
        {renderDots()}
      </Animated.View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={styles.keypad}>
        {KEYS.map((key, index) => (
          <TouchableOpacity
            key={`${key}-${index}`}
            style={styles.key}
            activeOpacity={0.6}
            disabled={disabled || key === ''}
            onPress={() => key && pressKey(key)}
          >
            {key === 'backspace' ? (
              <Text style={styles.keyText}>⌫</Text>
            ) : (
              <Text style={[styles.keyText, key === '' && styles.emptyKey]}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.gray[400],
    backgroundColor: Colors.white,
  },
  dotFilled: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'center',
  },
  key: {
    width: 80,
    height: 64,
    margin: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[100],
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  emptyKey: {
    color: 'transparent',
  },
});

