import { useCallback, useRef, useState } from 'react';
import { CameraView } from 'expo-camera';
import type { CameraCapturedPicture } from 'expo-camera';
import { compressPhotoToBase64, compressPhotoToFile } from '../services/photo';

export function useCamera() {
  const cameraRef = useRef<CameraView | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<CameraCapturedPicture | null>(null);

  const takePhoto = useCallback(async (): Promise<CameraCapturedPicture | null> => {
    if (!cameraRef.current || !isCameraReady || isTaking) return null;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
        mirror: true,
      });
      setLastPhoto(photo);
      return photo;
    } finally {
      setIsTaking(false);
    }
  }, [isCameraReady, isTaking]);

  const takeCompressedBase64 = useCallback(
    async (): Promise<{ uri: string; base64: string } | null> => {
      const photo = await takePhoto();
      if (!photo) return null;
      const base64 = await compressPhotoToBase64(photo.uri);
      const file = await compressPhotoToFile(photo.uri);
      return { uri: file.uri, base64 };
    },
    [takePhoto]
  );

  return {
    cameraRef,
    isCameraReady,
    setIsCameraReady,
    isTaking,
    lastPhoto,
    takePhoto,
    takeCompressedBase64,
  };
}

