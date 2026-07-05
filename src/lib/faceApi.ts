import * as faceapi from 'face-api.js'
import type { SupabaseClient } from '@supabase/supabase-js'

const MODEL_URL = '/models'

let modelsLoaded = false

export async function ensureFaceModelsLoaded(): Promise<void> {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}

// Alias untuk backward compatibility
export const loadFaceModels = ensureFaceModelsLoaded

export async function getDescriptor(video: HTMLVideoElement): Promise<number[] | null> {
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  if (!result?.descriptor) return null
  return Array.from(result.descriptor)
}

export function faceDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export function generateDeviceHash(): string {
  // Combine multiple signals for a more stable fingerprint.
  // This is NOT a substitute for server-side rate limiting.
  const raw = [
    navigator.userAgent,
    String(navigator.hardwareConcurrency ?? ''),
    String(navigator.maxTouchPoints ?? ''),
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return 'd' + Math.abs(hash).toString(16)
}

export async function captureSelfieBlob(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung browser')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Gagal mengambil foto selfie'))
        else resolve(blob)
      },
      'image/jpeg',
      0.85,
    )
  })
}

export async function uploadSelfie(
  supabase: SupabaseClient,
  blob: Blob,
  filePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from('selfies').upload(filePath, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) {
    throw new Error(error.message || 'Gagal upload selfie')
  }
  if (!data?.path) {
    throw new Error('Upload selfie tidak mengembalikan path')
  }
  return data.path
}
