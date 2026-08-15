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
 * Model weights (single-shard, offline-first):
 *   assets/models/face-embed/faceres.json + faceres.bin (~7MB)
 * Sumber: https://github.com/vladmandic/human/tree/main/models (faceres)
 */
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

// Hermes menyediakan atob/btoa global; deklarasi agar strict TS aman.
declare const atob: (b64: string) => string;

const EMBED_INPUT_SIZE = 224; // placeholder input_1: [?, 224, 224, 3]
const EMBED_OUTPUT_NODE = 'feats/Relu'; // layer embedding 128-d (sebelum head gender/age)

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

      const modelJson = require('../../assets/models/face-embed/faceres.json');
      const modelWeights = require('../../assets/models/face-embed/faceres.bin');
      console.log('[faceEmbedding] load model faceres...');
      return tf.loadGraphModel(bundleResourceIO(modelJson, modelWeights));
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
