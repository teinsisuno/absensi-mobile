import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { useAuth } from '../hooks';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { isValidPin } from '../utils/validators';

export default function PinChangeScreen() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { changePin } = useAuth();

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!isValidPin(currentPin)) nextErrors.currentPin = 'PIN saat ini tidak valid';
    if (!isValidPin(newPin)) nextErrors.newPin = 'PIN baru 4-6 digit';
    if (newPin !== confirmPin) nextErrors.confirmPin = 'PIN tidak sama';
    if (newPin === currentPin) nextErrors.newPin = 'PIN baru harus berbeda';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await changePin(currentPin, newPin);
      Toast.show({ type: 'success', text1: 'PIN berhasil diganti' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (e) {
      setErrors({
        currentPin: e instanceof Error ? e.message : 'PIN saat ini salah',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          PIN digunakan untuk login cepat. Ganti secara berkala untuk keamanan.
        </Text>
        <TextField
          label="PIN Saat Ini"
          value={currentPin}
          onChangeText={setCurrentPin}
          placeholder="••••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          error={errors.currentPin}
        />
        <TextField
          label="PIN Baru (4-6 digit)"
          value={newPin}
          onChangeText={setNewPin}
          placeholder="••••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          error={errors.newPin}
        />
        <TextField
          label="Konfirmasi PIN Baru"
          value={confirmPin}
          onChangeText={setConfirmPin}
          placeholder="••••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          error={errors.confirmPin}
        />
        <Button title="Simpan PIN Baru" size="lg" loading={loading} onPress={handleSubmit} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  hint: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: Spacing.lg,
  },
});

