/**
 * Face embedding di device (mode client) — 2026-08.
 *
 * Pipeline: foto selfie → crop persegi tengah (guide oval) → resize 224x224
 * → tensor [0..1] → model `faceres` (tfjs graph, vladmandic/human) → descriptor 128-d
 * → kirim JSON array ke backend `/face/enroll` (mode client).
 *
 * Backend FaceRecognitionService menyimpan JSON embedding & memverifikasi dengan
 * jarak Euclidean (threshold 0.6) — kontrak cocok dengan face-api.js descriptor.
 *
 * Model weights (single-shard, online-first — pola BCA mobile):
 *   Di-download SEKALI dari server `{origin}/models/face-embed/faceres.{json,bin}`
 *   (backend absensi serve dari public/models/face-embed/), lalu di-cache ke
 *   documentDirectory/models/face-embed/. Transaksi (absen/enroll) tetap online;
 *   cache model cuma biar gak download 7MB tiap scan.
 * Sumber: https://github.com/vladmandic/human/tree/main/models (faceres)
 *
 * CATATAN (2026-08-15): dulu pakai `bundleResourceIO` + require asset lokal,
 * tapi di APK release jalur itu masuk `loadLocalAsset()` yang butuh
 * react-native-fs (`RNFS.readFileRes`) — project ini cuma punya stub kosong,
 * jadi scan wajah error "Error reading resource assets_models_faceembed_faceres.bin".
 * Sekarang load manual via expo-file-system (localUri → base64 → fromMemory),
 * path yang sama di dev & release, tanpa react-native-fs.
 */
import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

import { getBaseUrl } from './database';

// Hermes menyediakan atob/btoa global; deklarasi agar strict TS aman.
declare const atob: (b64: string) => string;
declare const btoa: (s: string) => string;

const EMBED_INPUT_SIZE = 224; // placeholder input_1: [?, 224, 224, 3]
const EMBED_OUTPUT_NODE = 'feats/Relu'; // layer embedding 128-d (sebelum head gender/age)

const MODEL_DIR = `${FileSystem.documentDirectory}models/face-embed`;
const MODEL_JSON_FILE = `${MODEL_DIR}/faceres.json`;
const MODEL_BIN_FILE = `${MODEL_DIR}/faceres.bin`;
const MODEL_URL_PATH = '/models/face-embed';

let modelPromise: Promise<tf.GraphModel> | null = null;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000; // hindari stack overflow String.fromCharCode.apply
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** Origin server dari api_base_url (strip suffix /api/v1). */
async function modelBaseUrl(): Promise<string> {
  const apiBase = (await getBaseUrl()).trim().replace(/\/+$/, '');
  return apiBase.replace(/\/api\/v\d+\/?$/, '');
}

/**
 * Pastikan file model ada di cache lokal. Kalau belum ada (atau versi baru
 * dihapus), download dari server sekali lalu simpan ke documentDirectory.
 */
async function ensureModelFiles(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  }

  const [jsonInfo, binInfo] = await Promise.all([
    FileSystem.getInfoAsync(MODEL_JSON_FILE),
    FileSystem.getInfoAsync(MODEL_BIN_FILE),
  ]);
  if (jsonInfo.exists && binInfo.exists) return; // cache lengkap → tidak download

  const base = await modelBaseUrl();
  console.log(`[faceEmbedding] download model faceres dari ${base}${MODEL_URL_PATH} ...`);
  const [jsonResp, binResp] = await Promise.all([
    fetch(`${base}${MODEL_URL_PATH}/faceres.json`),
    fetch(`${base}${MODEL_URL_PATH}/faceres.bin`),
  ]);
  if (!jsonResp.ok || !binResp.ok) {
    throw new Error(
      `Model wajah gagal diunduh dari server (${jsonResp.status}/${binResp.status}). Pastikan terhubung ke internet.`
    );
  }
  const jsonText = await jsonResp.text();
  const binBuffer = await binResp.arrayBuffer();

  await Promise.all([
    FileSystem.writeAsStringAsync(MODEL_JSON_FILE, jsonText),
    FileSystem.writeAsStringAsync(MODEL_BIN_FILE, arrayBufferToBase64(binBuffer), {
      encoding: FileSystem.EncodingType.Base64,
    }),
  ]);
}

/** Load model dari cache lokal (tanpa react-native-fs, aman di release). */
async function loadModelFromFiles(): Promise<tf.GraphModel> {
  await ensureModelFiles();

  const jsonText = await FileSystem.readAsStringAsync(MODEL_JSON_FILE);
  const binB64 = await FileSystem.readAsStringAsync(MODEL_BIN_FILE, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const modelJson = JSON.parse(jsonText) as tf.io.ModelJSON;
  const weightData = base64ToBytes(binB64).buffer as ArrayBuffer;

  const artifacts: tf.io.ModelArtifacts = {
    ...modelJson,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData,
  };
  return tf.loadGraphModel(tf.io.fromMemory(artifacts));
}

/**
 * Load model faceres sekali (singleton). Backend `rn-webgl` otomatis
 * terdaftar saat import `@tensorflow/tfjs-react-native` di RN.
 */
export async function initFaceModel(): Promise<tf.GraphModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      try {
        await tf.setBackend('rn-webgl');
      } catch (e) {
        console.warn('[faceEmbedding] rn-webgl gagal, fallback cpu:', e);
        try {
          await tf.setBackend('cpu');
        } catch (e2) {
          console.error('[faceEmbedding] setBackend cpu juga gagal:', e2);
        }
      }
      await tf.ready();

      console.log('[faceEmbedding] load model faceres...');
      return loadModelFromFiles();
    })().catch((e) => {
      console.error('[faceEmbedding] load model GAGAL:', e);
      modelPromise = null; // biar bisa dicoba ulang
      throw e;
    });
  }
  return modelPromise;
}

/** Hapus model dari memori (dipakai saat logout/clear cache). */
export async function disposeFaceModel(): Promise<void> {
  if (modelPromise) {
    const model = await modelPromise.catch(() => null);
    model?.dispose();
  }
  modelPromise = null;
}

/**
 * Ekstrak embedding wajah 128-d dari foto selfie.
 * Asumsi: wajah di tengah frame (diarahkan oleh guide oval di UI).
 */
export async function extractFaceEmbedding(photoUri: string): Promise<number[]> {
  const model = await initFaceModel();

  const size = await getImageSize(photoUri);
  const side = Math.min(size.width, size.height);

  // Crop persegi tengah → resize 224x224 → JPEG base64 (kecil & cepat di-decode)
  const cropped = await manipulateAsync(
    photoUri,
    [
      {
        crop: {
          originX: Math.round((size.width - side) / 2),
          originY: Math.round((size.height - side) / 2),
          width: Math.round(side),
          height: Math.round(side),
        },
      },
      { resize: { width: EMBED_INPUT_SIZE, height: EMBED_INPUT_SIZE } },
    ],
    { format: SaveFormat.JPEG, compress: 0.92, base64: true }
  );

  if (!cropped.base64) {
    throw new Error('Gagal memproses foto wajah.');
  }

  let imageTensor: tf.Tensor3D;
  try {
    imageTensor = decodeJpeg(base64ToBytes(cropped.base64), 3); // [224,224,3] int32
  } catch (e) {
    console.error('[faceEmbedding] decodeJpeg GAGAL:', e);
    throw new Error('Foto wajah tidak bisa dibaca.');
  }

  const input = tf
    .div(tf.cast(imageTensor, 'float32'), 255)
    .expandDims(0) as tf.Tensor4D; // [1,224,224,3] float [0,1]

  let out: tf.Tensor;
  try {
    out = model.execute(input, EMBED_OUTPUT_NODE) as tf.Tensor;
  } catch (e) {
    console.error('[faceEmbedding] model.execute GAGAL:', e);
    tf.dispose([imageTensor, input]);
    throw new Error('Model wajah gagal dijalankan di perangkat ini.');
  }

  let values: number[];
  try {
    values = Array.from(await out.data());
  } catch (e) {
    console.error('[faceEmbedding] out.data() GAGAL:', e);
    tf.dispose([imageTensor, input, out]);
    throw new Error('Hasil analisis wajah tidak bisa dibaca.');
  }
  tf.dispose([imageTensor, input, out]);
  return values;
}
