import * as faceapi from 'face-api.js'

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

let modelsLoaded = false

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}

export async function getDescriptor(video: HTMLVideoElement): Promise<number[] | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  return detection ? Array.from(detection.descriptor) : null
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
  const raw = navigator.userAgent + (navigator.hardwareConcurrency ?? '') + screen.width + 'x' + screen.height
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return 'd' + Math.abs(hash).toString(16)
}

export async function uploadSelfie(
  storage: { from: (bucket: string) => { upload: (path: string, file: Blob, opts?: object) => Promise<{ data?: { path: string }; error?: Error | null }> } },
  blob: Blob,
  prefix: string,
): Promise<string | null> {
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { data, error } = await storage.from('face-selfies').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error || !data) {
    console.error('Upload selfie gagal', error)
    return null
  }
  return data.path
}
