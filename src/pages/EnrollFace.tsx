import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadFaceModels, getDescriptor, uploadSelfie } from '../lib/faceApi'
import type { Member } from '../types'

export function EnrollFace() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [memberId, setMemberId] = useState('')
  const [loadingModels, setLoadingModels] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))
  }, [])

  useEffect(() => {
    let stream: MediaStream | null = null

    async function start() {
      try {
        setLoadingModels(true)
        await loadFaceModels()
        setLoadingModels(false)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraOn(true)
      } catch {
        setError('Tidak bisa akses kamera. Pastikan izin kamera diizinkan.')
        setLoadingModels(false)
      }
    }

    start()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function captureSelfieBlob(): Promise<Blob | null> {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? null), 'image/jpeg', 0.85)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId) return
    setError('')
    setSubmitting(true)

    const descriptor = await getDescriptor(videoRef.current!)
    if (!descriptor) {
      setError('Wajah tidak terdeteksi. Coba di tempat terang dan hadapkan wajah ke kamera.')
      setSubmitting(false)
      return
    }

    const blob = await captureSelfieBlob()
    let selfiePath: string | null = null
    if (blob) {
      selfiePath = await uploadSelfie(supabase, blob, `enroll/${memberId}`)
    }

    const { error: rpcError } = await supabase.rpc('enroll_face', {
      p_member_id: memberId,
      p_descriptor: descriptor as never,
      p_selfie_url: selfiePath,
    })

    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message || 'Gagal mendaftarkan wajah.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Wajah Terdaftar!</h1>
        <p className="text-text-muted text-sm">
          Data wajah sudah dikirim. Tunggu ketua approve supaya bisa dipakai absen.
        </p>
        <button
          onClick={() => { setDone(false); setMemberId(''); setError('') }}
          className="text-primary text-sm hover:underline"
        >
          Daftarkan wajah lain
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">📸</div>
        <h1 className="text-xl font-bold">Daftar Wajah</h1>
        <p className="text-text-muted text-sm">
          Daftarkan wajahmu sekali, nanti absen tinggal scan QR + selfie.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Nama</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
            required
          >
            <option value="">— Pilih nama —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10">
          {loadingModels && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
              Memuat model pengenal wajah...
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!cameraOn && !loadingModels && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm px-6 text-center">
              Kamera tidak aktif
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || loadingModels || !cameraOn || !memberId}
          className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {submitting ? 'Mendaftarkan...' : '📸 Daftarkan Wajah'}
        </button>

        <p className="text-xs text-text-muted text-center">
          Selfie wajah disimpan privat dan hanya bisa dilihat ketua.
        </p>
      </form>
    </div>
  )
}
