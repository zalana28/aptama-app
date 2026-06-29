import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  ensureFaceModelsLoaded,
  getDescriptor,
  captureSelfieBlob,
  uploadSelfie,
} from '../lib/faceApi'
import type { Member } from '../types'

export function EnrollFace() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [memberId, setMemberId] = useState('')
  const [loadingModels, setLoadingModels] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('members').select('*').order('name')
        setMembers((data ?? []) as Member[])
      } catch (err) {
        console.error('Gagal memuat anggota:', err)
      }
    }
    load()
  }, [])

  useEffect(() => {
    let stream: MediaStream | null = null

    async function start() {
      try {
        setLoadingModels(true)
        await ensureFaceModelsLoaded()
        setLoadingModels(false)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraOn(true)
      } catch (err) {
        console.error('Gagal akses kamera:', err)
        setError('Tidak bisa akses kamera. Pastikan izin kamera diizinkan.')
        setLoadingModels(false)
      }
    }

    start()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!memberId) {
      setError('Pilih nama dulu.')
      return
    }
    if (!videoRef.current) {
      setError('Kamera belum siap.')
      return
    }

    setSubmitting(true)

    try {
      console.log('memberId:', memberId)

      await ensureFaceModelsLoaded()
      const descriptor = await getDescriptor(videoRef.current)
      console.log('descriptor:', descriptor ? `terdeteksi (${descriptor.length})` : 'tidak terdeteksi')

      if (!descriptor) {
        setError('Wajah tidak terdeteksi. Coba di tempat terang dan hadapkan wajah ke kamera.')
        return
      }

      const descriptorArray = Array.from(descriptor)
      console.log('descriptor length:', descriptorArray.length)

      const selfieBlob = await captureSelfieBlob(videoRef.current)
      const filePath = `face-enroll/${memberId}/${Date.now()}.jpg`
      console.log('selfie path:', filePath)

      let uploadedPath: string
      try {
        uploadedPath = await uploadSelfie(supabase, selfieBlob, filePath)
        console.log('uploaded path:', uploadedPath)
      } catch (uploadErr: any) {
        console.error('Upload selfie gagal:', uploadErr)
        setError('Gagal upload selfie: ' + (uploadErr?.message ?? 'cek Storage RLS / bucket'))
        return
      }

      const { error: rpcError } = await supabase.rpc('enroll_face', {
        p_member_id: memberId,
        p_descriptor: descriptorArray as never,
        p_selfie_url: uploadedPath,
      })

      if (rpcError) {
        console.error('RPC enroll_face gagal:', rpcError)
        setError('Gagal menyimpan data wajah: ' + (rpcError.message || 'RPC error'))
        return
      }

      console.log('enroll_face berhasil')
      setDone(true)
    } catch (err: any) {
      console.error('Gagal daftar wajah:', err)
      setError('Gagal mendaftarkan wajah: ' + (err?.message ?? 'error tidak diketahui'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Wajah Terkirim!</h1>
        <p className="text-text-muted text-sm">
          Wajah terkirim. Tunggu ketua approve supaya bisa dipakai absen.
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
