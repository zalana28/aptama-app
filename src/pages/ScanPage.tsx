import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  loadFaceModels,
  getDescriptor,
  faceDistance,
  generateDeviceHash,
  uploadSelfie,
  captureSelfieWithCanvas,
} from '../lib/faceApi'
import type { Member } from '../types'

export function ScanPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [memberId, setMemberId] = useState('')
  const [step, setStep] = useState<'select' | 'face' | 'submitting' | 'done' | 'error'>('select')
  const [error, setError] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)

  const { data: members = [] } = useQuery({
    queryKey: ['members-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_public')
        .select('id, name, group, face_status')
        .order('name')
      if (error) throw error
      return (data ?? []) as Member[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const selectedMember = members.find((m) => m.id === memberId)

  const faceStatus = selectedMember?.face_status
  const isApproved = faceStatus === 'approved'
  const isPending = faceStatus === 'pending'
  const isNotRegistered =
    !faceStatus || faceStatus === 'none' || faceStatus === null

  async function startFaceStep() {
    if (!selectedMember) return
    if (selectedMember.face_status !== 'approved') {
      setError('Wajahmu belum terdaftar/disetujui ketua. Daftar wajah dulu.')
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

  async function captureSelfie(): Promise<Blob | null> {
    if (!videoRef.current || !canvasRef.current) return null
    return captureSelfieWithCanvas(videoRef.current, canvasRef.current)
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

    const storedData = stored.data
    if (!Array.isArray(storedData)) {
      setError('Data wajah tidak valid.')
      setStep('face')
      return
    }
    const score = faceDistance(live, storedData as number[])
    if (score > 0.5) {
      setError('Wajah tidak cocok. Laporkan ke ketua untuk absen manual.')
      setStep('error')
      return
    }

    const blob = await captureSelfie()
    let selfiePath: string | null = null
    if (blob) {
      selfiePath = await uploadSelfie(supabase, blob, `face-checkin/${selectedMember.id}/${Date.now()}.jpg`)
    }

    const deviceHash = generateDeviceHash()

    // Resolve event from events.checkin_token (not qr_tokens table)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, checkin_token, checkin_expires_at')
      .eq('checkin_token', token)
      .single()

    if (eventError || !eventData) {
      setError('QR tidak valid.')
      setStep('error')
      return
    }

    // Check if QR is still valid
    if (eventData.checkin_expires_at && new Date(eventData.checkin_expires_at).getTime() < Date.now()) {
      setError('QR sudah expired. Minta ketua generate ulang.')
      setStep('error')
      return
    }

    const { error: rpcError } = await supabase.rpc('check_in_with_face', {
      p_event_id: eventData.id,
      p_member_id: selectedMember.id,
      p_descriptor: Array.from(live),
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

          {selectedMember && isApproved && (
            <p className="text-green-600 text-sm">
              Wajah sudah disetujui. Silakan lanjut verifikasi.
            </p>
          )}
          {selectedMember && isPending && (
            <p className="text-yellow-600 text-sm">
              Wajahmu sudah terdaftar dan sedang menunggu approve ketua.
            </p>
          )}
          {selectedMember && isNotRegistered && (
            <p className="text-red-600 text-sm">
              Wajahmu belum terdaftar. Daftar wajah dulu.
            </p>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            onClick={startFaceStep}
            disabled={!isApproved}
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
