import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationPoint } from '../types/models';
import { GPS_ACCURACY, GPS_TIMEOUT_MS } from '../utils/constants';

interface UseLocationOptions {
  autoRequest?: boolean;
  watch?: boolean;
}

export function useLocation(options?: UseLocationOptions) {
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    return status === 'granted';
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<LocationPoint | null> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        setError('Izin lokasi ditolak. Aktifkan di pengaturan.');
        return null;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: GPS_ACCURACY === 'high' ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: 1000,
      });
      const point: LocationPoint = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        altitude: pos.coords.altitude ?? null,
        timestamp: pos.timestamp,
      };
      setLocation(point);
      return point;
    } catch {
      setError('Tidak dapat memperoleh lokasi. Cek GPS perangkat.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, requestPermission]);

  const startWatching = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    watchSubscription.current?.remove();
    watchSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 10000,
      },
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          altitude: pos.coords.altitude ?? null,
          timestamp: pos.timestamp,
        });
      }
    );
  }, [permissionStatus, requestPermission]);

  const stopWatching = useCallback(() => {
    watchSubscription.current?.remove();
    watchSubscription.current = null;
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    })();
  }, []);

  useEffect(() => {
    if (options?.watch) {
      startWatching();
    }
    return stopWatching;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.watch]);

  return {
    permissionStatus,
    location,
    error,
    isLoading,
    requestPermission,
    getCurrentPosition,
    startWatching,
    stopWatching,
  };
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

