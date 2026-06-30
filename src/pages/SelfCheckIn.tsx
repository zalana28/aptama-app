import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import {
  loadFaceModels,
  getDescriptor,
  faceDistance,
  generateDeviceHash,
  uploadSelfie,
} from '../lib/faceApi'
import { useAdmin } from '../hooks/useAdmin'
import type { Member, Event } from '../types'

export function SelfCheckIn() {
  const { isAdmin } = useAdmin()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<(Event & { is_open: boolean })[]>([])
  const [memberId, setMemberId] = useState('')
  const [eventId, setEventId] = useState('')
  const [step, setStep] = useState<'form' | 'camera' | 'submitting' | 'done' | 'error'>('form')
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')

  // Admin QR view
  const [adminEventId, setAdminEventId] = useState('')

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))

    // Ambil SEMUA kegiatan untuk admin, tapi tetap tandai yang check-in-nya masih buka
    supabase.from('events').select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        const now = Date.now()
        const mapped = (data ?? []).map((ev: Event) => ({
          ...ev,
          is_open: ev.checkin_close_at ? new Date(ev.checkin_close_at).getTime() > now : false,
        }))
        setEvents(mapped as (Event & { is_open: boolean })[])
      })
  }, [])

  useEffect(() => {
    // Tidak perlu fetch QR terpisah — QR aktif sudah tersimpan di kolom events.checkin_token
    // yang akan ikut ter-fetch lewat useEvents() di bawah.
  }, [isAdmin, adminEventId])

  const selectedMember = members.find((m) => m.id === memberId)
  const selectedEv = events.find((e) => e.id === eventId)
  const selectedAdminEv = events.find((e) => e.id === adminEventId)
  const openEvents = events.filter((ev) => ev.is_open)

  // QR aktif dibaca langsung dari kolom events.checkin_token + checkin_expires_at
  const hasActiveQr = !!(
    selectedAdminEv?.checkin_token &&
    selectedAdminEv.checkin_expires_at &&
    new Date(selectedAdminEv.checkin_expires_at).getTime() > Date.now()
  )

  // Debug log (hapus setelah bug selesai)
  if (isAdmin && adminEventId) {
    console.log('[SelfCheckIn] selectedAdminEv:', selectedAdminEv)
    console.log('[SelfCheckIn] checkin_token:', selectedAdminEv?.checkin_token)
    console.log('[SelfCheckIn] checkin_expires_at:', selectedAdminEv?.checkin_expires_at)
    console.log('[SelfCheckIn] Now:', new Date().toISOString())
    console.log('[SelfCheckIn] Has active QR:', hasActiveQr)
  }

  async function startCamera() {
    if (!selectedMember) return
    if (selectedMember.face_status !== 'approved') {
      setError('Wajahmu belum terdaftar/disetejui ketua. Daftar wajah dulu di menu Daftar Wajah.')
      return
    }
    setError('')
    setStep('camera')
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
      setStep('form')
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
    if (!selectedMember || !eventId) return
    setStep('submitting')
    setError('')

    const stored = await supabase.rpc('get_member_descriptor', {
      p_member_id: selectedMember.id,
    })
    if (stored.error || !stored.data) {
      setError('Data wajah tidak ditemukan.')
      setStep('camera')
      return
    }

    const live = await getDescriptor(videoRef.current!)
    if (!live) {
      setError('Wajah tidak terdeteksi. Coba lagi di tempat terang.')
      setStep('camera')
      return
    }

    const score = faceDistance(live, stored.data as number[])
    if (score > 0.5) {
      setError('Wajah tidak cocok. Coba lagi atau laporkan ke ketua.')
      setStep('error')
      return
    }

    const blob = await captureSelfieBlob()
    let selfiePath: string | null = null
    if (blob) {
      selfiePath = await uploadSelfie(supabase, blob, `face-checkin/${selectedMember.id}/${Date.now()}.jpg`)
    }

    const { error: rpcError } = await supabase.rpc('self_check_in', {
      p_event_id: eventId,
      p_member_id: selectedMember.id,
      p_face_score: score,
      p_selfie_url: selfiePath,
      p_device_hash: generateDeviceHash(),
    })

    if (rpcError) {
      setError(rpcError.message || 'Gagal check-in.')
      setStep('error')
      return
    }

    setStep('done')
  }

  function qrUrl(token: string): string {
    return `${window.location.origin}/scan?token=${token}`
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(qrUrl(token))
    alert('Link QR tersalin!')
  }

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Check-in Berhasil!</h1>
        <p className="text-text-muted text-sm">
          Wajah terverifikasi. Sampai jumpa di lokasi ya! Jangan lupa datang.
        </p>
        <button
          onClick={() => { setStep('form'); setMemberId(''); setEventId(''); setError('') }}
          className="text-primary text-sm hover:underline"
        >
          Check-in lagi
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">🏠</div>
        <h1 className="text-xl font-bold">Check-in</h1>
        <p className="text-text-muted text-sm">
          Verifikasi wajah untuk absen kegiatan.
        </p>
      </div>

      {/* ---- ADMIN: Tampilkan QR Aktif ---- */}
      {isAdmin && (
        <div className="bg-bg-card rounded-xl p-4 border border-white/10 space-y-3">
          <h2 className="text-sm font-semibold">📱 QR Absen untuk Dicetak / Ditampilkan</h2>
          <p className="text-xs text-text-muted">
            Pilih kegiatan untuk menampilkan QR aktif. Anggota scan QR ini lalu verifikasi wajah.
          </p>

          <select
            value={adminEventId}
            onChange={(e) => setAdminEventId(e.target.value)}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="">— Pilih kegiatan —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.date}){ev.is_open ? ' · check-in buka' : ''}
              </option>
            ))}
          </select>

          {selectedAdminEv && hasActiveQr && selectedAdminEv.checkin_token && selectedAdminEv.checkin_expires_at && (
            <div className="bg-white rounded-xl p-4 text-center space-y-3">
              <p className="text-black text-sm font-medium">{selectedAdminEv.title}</p>
              <QRCodeSVG value={qrUrl(selectedAdminEv.checkin_token)} size={220} className="mx-auto" />
              <p className="text-gray-500 text-xs">
                Berlaku sampai: {new Date(selectedAdminEv.checkin_expires_at).toLocaleString('id-ID')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(selectedAdminEv.checkin_token!)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                >
                  📋 Salin Link
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                >
                  🖨️ Cetak
                </button>
              </div>
            </div>
          )}

          {selectedAdminEv && !hasActiveQr && (
            <div className="bg-text/[0.05] rounded-lg p-3 text-center space-y-2">
              <p className="text-text-muted text-xs">Belum ada QR aktif untuk kegiatan ini.</p>
              <a
                href="#/generate-qr"
                className="inline-block text-xs text-primary hover:underline"
              >
                Generate QR di sini →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-text/[0.10]" />

      {/* ---- MEMBER: Check-in dengan Wajah ---- */}
      {openEvents.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-text-muted text-sm">Belum ada kegiatan yang membuka check-in.</p>
          <p className="text-text-muted text-xs">
            Check-in dibuka oleh ketua dan otomatis tertutup saat jam mulai.
          </p>
        </div>
      ) : (
        <>
          {step === 'form' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-center">🙋 Absen dengan Wajah</h2>

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

              <div>
                <label className="text-xs text-text-muted mb-1 block">Kegiatan</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                  required
                >
                  <option value="">— Pilih kegiatan —</option>
                  {openEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.date}{ev.time ? ` · ${ev.time}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEv && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 space-y-1">
                  {selectedEv.time && (
                    <p className="text-xs text-primary">
                      🕐 Jam kegiatan: {selectedEv.time} WIB
                    </p>
                  )}
                  {selectedEv.checkin_close_at && (
                    <p className="text-xs text-primary">
                      ⏰ Check-in ditutup:{' '}
                      {new Date(selectedEv.checkin_close_at).toLocaleString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-danger text-sm">{error}</p>}

              <button
                onClick={startCamera}
                disabled={!memberId || !eventId}
                className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
              >
                Lanjutkan Verifikasi Wajah
              </button>

              <p className="text-xs text-text-muted text-center">
                Setelah check-in, wajib datang ya. Ketua bisa koreksi jika tidak hadir.
              </p>
            </div>
          )}

          {(step === 'camera' || step === 'submitting') && (
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
                className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
              >
                {step === 'submitting' ? 'Memverifikasi...' : '📸 Ambil & Check-in'}
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="bg-bg-card rounded-xl p-4 border border-white/10 space-y-3">
              <p className="text-danger text-sm">{error}</p>
              <button
                onClick={() => setStep('form')}
                className="w-full bg-text/[0.05] text-text px-4 py-2 rounded-lg text-sm hover:bg-text/[0.10] transition"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
