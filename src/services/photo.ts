import * as ImageManipulator from 'expo-image-manipulator';
import { SELFIE_MAX_WIDTH, SELFIE_QUALITY } from '../utils/constants';

export interface PhotoStamp {
  label: string;
  name: string;
  datetime: string;
  coordinates: string;
  locationName?: string | null;
}

/**
 * Kompres + resize foto selfie: JPEG 70%, maksimal 800px lebar.
 */
export async function compressPhoto(
  uri: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<ImageManipulator.ImageRef> {
  const maxWidth = options?.maxWidth ?? SELFIE_MAX_WIDTH;
  const quality = options?.quality ?? SELFIE_QUALITY;

  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: maxWidth, height: null });
  return context.renderAsync();
}

export async function compressPhotoToFile(
  uri: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<{ uri: string; width: number; height: number }> {
  const rendered = await compressPhoto(uri, options);
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: options?.quality ?? SELFIE_QUALITY,
  });
  return { uri: saved.uri, width: rendered.width, height: rendered.height };
}

export async function compressPhotoToBase64(
  uri: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<string> {
  const rendered = await compressPhoto(uri, options);
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: options?.quality ?? SELFIE_QUALITY,
    base64: true,
  });
  return saved.base64 ?? '';
}

export function toDataUri(base64: string, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${base64}`;
}

export function isDataUri(value: string): boolean {
  return value.startsWith('data:');
}

