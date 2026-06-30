import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  loadFaceModels,
  getDescriptor,
  faceDistance,
  generateDeviceHash,
  uploadSelfie,
} from '../lib/faceApi'
import type { Member } from '../types'

export function ScanPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [memberId, setMemberId] = useState('')
  const [step, setStep] = useState<'select' | 'face' | 'submitting' | 'done' | 'error'>('select')
  const [error, setError] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    supabase.from('members_public').select('id, name, group').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))
  }, [])

  const selectedMember = members.find((m) => m.id === memberId)

  async function startFaceStep() {
    if (!selectedMember) return
    if (selectedMember.face_status !== 'approved') {
      setError('Wajahmu belum terdaftar/disetejui ketua. Daftar wajah dulu.')
      return
    }
    setError('')
    setStep('face')
    try {
      setLoadingModels(true)
      await loadFaceModels()
      setLoadingModels(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setLoadingModels(false)
      setError('Tidak bisa akses kamera. Pastikan izin kamera diizinkan.')
      setStep('select')
    }
  }

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

  async function handleSubmit() {
    if (!selectedMember || !token) return
    setStep('submitting')
    setError('')

    const stored = await supabase.rpc('get_member_descriptor', {
      p_member_id: selectedMember.id,
    })
    if (stored.error || !stored.data) {
      setError('Data wajah tidak ditemukan.')
      setStep('face')
      return
    }

    const live = await getDescriptor(videoRef.current!)
    if (!live) {
      setError('Wajah tidak terdeteksi. Coba lagi di tempat terang.')
      setStep('face')
      return
    }

    const score = faceDistance(live, stored.data as number[])
    if (score > 0.5) {
      setError('Wajah tidak cocok. Laporkan ke ketua untuk absen manual.')
      setStep('error')
      return
    }

    const blob = await captureSelfieBlob()
    let selfiePath: string | null = null
    if (blob) {
      selfiePath = await uploadSelfie(supabase, blob, `face-checkin/${selectedMember.id}/${Date.now()}.jpg`)
    }

    const deviceHash = generateDeviceHash()
    const { data: eventData, error: eventError } = await supabase
      .rpc('resolve_qr_token', { p_token: token })
      .single<{ event_id: string; expires_at: string }>()

    if (eventError || !eventData) {
      setError('QR tidak valid.')
      setStep('error')
      return
    }

    const { error: rpcError } = await supabase.rpc('check_in_with_face', {
      p_event_id: eventData.event_id,
      p_token: token,
      p_member_id: selectedMember.id,
      p_face_score: score,
      p_selfie_url: selfiePath,
      p_device_hash: deviceHash,
    })

    if (rpcError) {
      setError(rpcError.message || 'Gagal absen.')
      setStep('error')
      return
    }

    setStep('done')
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">QR Tidak Valid</h1>
        <p className="text-text-muted text-sm">
          Link QR tidak ditemukan. Minta ketua untuk generate QR baru.
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Absen Berhasil!</h1>
        <p className="text-text-muted text-sm">
          Wajah terverifikasi, kehadiranmu tercatat. Sampai jumpa di lokasi!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">📱</div>
        <h1 className="text-xl font-bold">Scan Absen + Wajah</h1>
        <p className="text-text-muted text-sm">
          Pilih nama, lalu arahkan wajah ke kamera untuk verifikasi.
        </p>
      </div>

      {step === 'select' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Nama</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-3 text-base text-text focus:outline-none focus:border-primary"
              autoFocus
            >
              <option value="">— Pilih nama —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            onClick={startFaceStep}
            disabled={!memberId}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            Lanjutkan Verifikasi Wajah
          </button>
        </div>
      )}

      {(step === 'face' || step === 'submitting') && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10">
            {loadingModels && (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                Memuat model wajah...
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={step === 'submitting' || loadingModels}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            {step === 'submitting' ? 'Memverifikasi...' : '📸 Ambil & Absen'}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="bg-bg-card rounded-xl p-4 border border-white/10 space-y-3">
          <p className="text-danger text-sm">{error}</p>
          <button
            onClick={() => setStep('select')}
            className="w-full bg-text/[0.05] text-text px-4 py-2 rounded-lg text-sm hover:bg-text/[0.10] transition"
          >
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  )
}
