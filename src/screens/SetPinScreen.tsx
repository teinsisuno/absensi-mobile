import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import PinKeypad from '../components/PinKeypad';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../hooks';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { PIN_LENGTH } from '../utils/constants';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetPin'>;

export default function SetPinScreen({ navigation }: Props) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setPin: savePin } = useAuth();

  const handleComplete = async (value: string) => {
    if (step === 'input') {
      setPin(value);
      setConfirmPin('');
      setError(null);
      setStep('confirm');
      return;
    }
    if (value !== pin) {
      setConfirmPin('');
      setError('PIN tidak sama. Ulangi.');
      return;
    }
    setLoading(true);
    try {
      await savePin(pin);
      Toast.show({
        type: 'success',
        text1: 'PIN tersimpan',
        text2: 'Lanjutkan pengaturan awal.',
      });
      navigation.replace('Setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <Text style={styles.title}>Atur PIN</Text>
      <Text style={styles.subtitle}>
        {step === 'input'
          ? `PIN ${PIN_LENGTH} digit untuk login cepat sehari-hari`
          : 'Konfirmasi PIN (input ulang)'}
      </Text>
      <PinKeypad
        length={PIN_LENGTH}
        pin={step === 'input' ? pin : confirmPin}
        onPinChange={step === 'input' ? setPin : setConfirmPin}
        onComplete={handleComplete}
        errorMessage={error}
        disabled={loading}
      />
      <Button
        title={step === 'input' ? 'Lanjut' : 'Simpan PIN'}
        variant="outline"
        onPress={() =>
          handleComplete(step === 'input' ? pin : confirmPin)
        }
        disabled={(step === 'input' ? pin : confirmPin).length < PIN_LENGTH}
        loading={loading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});

