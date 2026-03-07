/**
 * Browser-side face detection using face-api.js (TinyFaceDetector).
 *
 * Validates that a captured selfie contains exactly one human face before
 * allowing it to be used for attendance check-in.
 *
 * Model files are served from /models/face-api/ (public directory).
 */

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

const MODEL_URL = '/models/face-api';

/**
 * Load face detection model once (lazy + cached).
 */
async function ensureModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).then(() => {
    modelsLoaded = true;
    modelsLoading = null;
  });
  return modelsLoading;
}

export type FaceValidationResult = {
  valid: boolean;
  faceCount: number;
  reason: string;
};

/**
 * Detect faces in an HTMLCanvasElement or HTMLImageElement.
 *
 * @returns A validation result indicating whether exactly one face was found.
 */
export async function validateFaceInImage(
  input: HTMLCanvasElement | HTMLImageElement
): Promise<FaceValidationResult> {
  await ensureModels();

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const detections = await faceapi.detectAllFaces(input, options);
  const faceCount = detections.length;

  if (faceCount === 0) {
    return {
      valid: false,
      faceCount: 0,
      reason: 'Face not detected. Please capture a clear selfie.',
    };
  }

  if (faceCount > 1) {
    return {
      valid: false,
      faceCount,
      reason: 'Multiple faces detected. Please capture only your own selfie.',
    };
  }

  return { valid: true, faceCount: 1, reason: '' };
}

/**
 * Validate face in a canvas element with the captured selfie.
 * Convenience wrapper that creates a temporary image from a data URL.
 */
export async function validateFaceFromDataUrl(
  dataUrl: string
): Promise<FaceValidationResult> {
  await ensureModels();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const result = await validateFaceInImage(img);
      resolve(result);
    };
    img.onerror = () => {
      resolve({
        valid: false,
        faceCount: 0,
        reason: 'Failed to load captured image for face detection.',
      });
    };
    img.src = dataUrl;
  });
}
