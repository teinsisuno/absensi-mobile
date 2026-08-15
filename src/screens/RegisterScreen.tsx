import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import { useAuth } from '../hooks';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { isStrongPassword, isValidEmail } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    const nextErrors: typeof errors = {};
    if (name.trim().length < 3) nextErrors.name = 'Nama minimal 3 karakter';
    if (!isValidEmail(email)) nextErrors.email = 'Email tidak valid';
    if (!isStrongPassword(password)) nextErrors.password = 'Password minimal 8 karakter';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigation.replace('SetPin');
    } catch (e) {
      setErrors({
        email: e instanceof Error ? e.message : 'Registrasi gagal',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <Text style={styles.title}>Daftar Akun</Text>
      <TextField
        label="Nama Lengkap"
        value={name}
        onChangeText={setName}
        placeholder="Budi Santoso"
        error={errors.name}
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="user@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimal 8 karakter"
        secureTextEntry
        error={errors.password}
      />
      <Button
        title="Daftar"
        size="lg"
        loading={loading}
        onPress={handleRegister}
      />
      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.loginText}>
          Sudah punya akun? <Text style={styles.loginStrong}>Login</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing.xl,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  loginText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  loginStrong: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
});

