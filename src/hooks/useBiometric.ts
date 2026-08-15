import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware
        ? await LocalAuthentication.isEnrolledAsync()
        : false;
      if (active) {
        setIsAvailable(hasHardware);
        setIsEnrolled(enrolled);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async (promptMessage = 'Verifikasi identitas'): Promise<boolean> => {
    if (!isAvailable) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Batal',
      disableDeviceFallback: true,
    });
    return result.success;
  }, [isAvailable]);

  const supportedBiometrics = useCallback(async (): Promise<LocalAuthentication.AuthenticationType[]> => {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  }, []);

  return { isAvailable, isEnrolled, authenticate, supportedBiometrics };
}

