import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, X, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { uploadSignatureBlob } from '../lib/signature'
import { SignaturePad } from '../components/SignaturePad'
import type { Member, QrValidation } from '../types'

type Step = 'pick' | 'sign' | 'confirm' | 'submitting' | 'done'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (name[0] ?? '?').toUpperCase()
}

export function ScanPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [step, setStep] = useState<Step>('pick')
  const [memberId, setMemberId] = useState('')
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const { data: qr, isLoading: qrLoading } = useQuery({
    queryKey: ['resolve-qr', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resolve_qr_token', {
        p_token: token,
      })
      if (error) throw error
      return (Array.isArray(data) ? data[0] : data) as QrValidation
    },
    enabled: !!token,
    staleTime: 30_000,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members_public')
        .select('id, name, group')
        .order('name')
      if (error) throw error
      return (data ?? []) as Member[]
    },
    staleTime: 60_000,
  })

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.group ?? '').toLowerCase().includes(q),
    )
  }, [members, search])

  const selectedMember = members.find((m) => m.id === memberId)
  const previewUrl = useMemo(
    () => (signatureBlob ? URL.createObjectURL(signatureBlob) : null),
    [signatureBlob],
  )

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">QR Tidak Valid</h1>
        <p className="text-text-muted text-sm">
          Link QR tidak ditemukan. Minta ketua untuk generate QR baru.
        </p>
        <Link to="/" className="inline-block text-xs font-semibold text-primary hover:underline">
          ← Kembali ke Beranda
        </Link>
      </div>
    )
  }

  if (qrLoading || !qr) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-text-muted text-sm">Memverifikasi token QR...</p>
      </div>
    )
  }

  if (!qr.is_valid) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">⏰</div>
        <h1 className="text-xl font-bold">QR Sesi Berakhir</h1>
        <p className="text-text-muted text-sm">
          {qr.error_message ?? 'QR sudah kedaluwarsa.'}
        </p>
        <Link to="/" className="inline-block text-xs font-semibold text-primary hover:underline">
          ← Kembali ke Beranda
        </Link>
      </div>
    )
  }

  async function handleSubmit() {
    if (!selectedMember || !signatureBlob || !qr) return
    setError('')
    setStep('submitting')
    let uploadedPath: string | null = null
    try {
      uploadedPath = await uploadSignatureBlob(signatureBlob, qr.event_id)
      const { data, error: rpcError } = await supabase.rpc(
        'submit_attendance_with_signature',
        {
          p_token: token,
          p_member_id: selectedMember.id,
          p_signature_path: uploadedPath,
        },
      )
      if (rpcError) throw rpcError
      const result = data as {
        success?: boolean
        error?: string
        message?: string
      }
      if (!result.success) {
        await removeUploadedSignature(uploadedPath)
        setError(result.error ?? 'Gagal mencatat absensi.')
        setStep('confirm')
        return
      }
      setResultMessage(result.message ?? 'Absensi berhasil!')
      // Haptic tactile feedback on mobile devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 40])
        } catch {}
      }
      setStep('done')
    } catch (err: unknown) {
      await removeUploadedSignature(uploadedPath)
      setError(err instanceof Error ? err.message : 'Gagal mengirim absensi. Coba lagi.')
      setStep('confirm')
    }
  }

  async function removeUploadedSignature(path: string | null) {
    if (!path) return
    await supabase.storage.from('signatures').remove([path])
  }

  if (step === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto px-4 py-12 text-center space-y-5"
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-success/15 text-success shadow-lg shadow-success/20">
          <CheckCircle2 size={44} />
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-success/15 text-success">
            <ShieldCheck size={14} />
            <span>TERVERIFIKASI HADIR</span>
          </div>
          <h1 className="text-2xl font-bold text-text">Presensi Berhasil!</h1>
          <p className="text-text-muted text-xs max-w-xs mx-auto">
            {resultMessage || `Kehadiran ${selectedMember?.name} telah tercatat di kegiatan ${qr.title}.`}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-4 text-left space-y-2.5 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Nama Anggota:</span>
            <span className="font-semibold text-text">{selectedMember?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Kegiatan:</span>
            <span className="font-semibold text-text">{qr.title}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Waktu Presensi:</span>
            <span className="font-semibold text-text">{new Date().toLocaleTimeString('id-ID')} WIB</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition shadow-lg shadow-primary/20"
        >
          <Sparkles size={16} />
          <span>Kembali ke Beranda</span>
        </Link>
      </motion.div>
    )
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Event Header Banner */}
      <div className="bg-bg-card border border-primary/30 rounded-2xl p-4 space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            <p className="text-[11px] font-semibold text-success uppercase tracking-wider">Presensi Aktif</p>
          </div>
          {qr.checkin_expires_at && (
            <span className="text-[10px] text-text-muted font-medium bg-bg-elevated px-2 py-0.5 rounded-md border border-border">
              Hingga {new Date(qr.checkin_expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-text">{qr.title}</h1>
        <p className="text-text-muted text-xs">
          📅 {formatDate(qr.date)} {qr.time ? `· ⏰ ${qr.time} WIB` : ''} {qr.location ? `· 📍 ${qr.location}` : ''}
        </p>
      </div>

      {/* 3-Step Wizard Indicator */}
      <div className="grid grid-cols-3 gap-1.5 py-1">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'pick' ? 'bg-primary' : 'bg-primary/30'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'sign' ? 'bg-primary' : (step === 'confirm' || step === 'submitting') ? 'bg-primary/70' : 'bg-border'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${(step === 'confirm' || step === 'submitting') ? 'bg-primary' : 'bg-border'}`} />
      </div>

      {/* Step 1: Pick Member Name */}
      {step === 'pick' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text">Pilih Namamu di Daftar:</p>
            <span className="text-[11px] text-text-muted font-medium">{filteredMembers.length} anggota</span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Cari namamu (contoh: Zaki Maulana)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl pl-10 pr-9 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border/40 max-h-[48vh] overflow-y-auto shadow-sm">
            {filteredMembers.length === 0 ? (
              <div className="px-4 py-10 text-center space-y-1 text-text-muted">
                <p className="text-sm font-medium">Nama tidak ditemukan</p>
                <p className="text-xs">Coba cari dengan kata kunci lain.</p>
              </div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMemberId(m.id)
                    setSignatureBlob(null)
                    setError('')
                    setStep('sign')
                  }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-bg-card-hover transition active:bg-primary/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-text truncate">{m.name}</p>
                      {m.group && (
                        <p className="text-[11px] text-text-muted truncate">{m.group}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-primary font-semibold shrink-0">Pilih →</span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Step 2: Draw Signature */}
      {step === 'sign' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-text">
              Halo, {selectedMember?.name}! 👋
            </h2>
            <p className="text-text-muted text-xs">
              Buat tanda tanganmu di kotak bawah ini dengan jari.
            </p>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden bg-bg-card p-1">
            <SignaturePad onChange={setSignatureBlob} />
          </div>

          {error && <p className="text-danger text-xs font-medium text-center">{error}</p>}

          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                setError('')
                setStep('confirm')
              }}
              disabled={!signatureBlob}
              className="w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
            >
              Lanjutkan ke Konfirmasi →
            </button>
            <button
              onClick={() => setStep('pick')}
              className="w-full py-2.5 rounded-xl text-xs text-text-muted hover:text-text transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Ganti Nama Anggota</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Confirm & Submit */}
      {(step === 'confirm' || step === 'submitting') && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Konfirmasi Data Presensi
            </p>
            <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
              <span className="text-text-muted">Nama:</span>
              <span className="font-semibold text-text">{selectedMember?.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
              <span className="text-text-muted">Kegiatan:</span>
              <span className="font-semibold text-text">{qr.title}</span>
            </div>
            <div>
              <p className="text-text-muted text-[11px] mb-1.5">Bukti Tanda Tangan:</p>
              {previewUrl && (
                <div className="bg-white rounded-xl p-2 border border-border shadow-inner">
                  <img
                    src={previewUrl}
                    alt="Tanda tangan"
                    className="w-full h-24 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-xs font-medium">⚠️ {error}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={step === 'submitting'}
              className="w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/25"
            >
              {step === 'submitting' ? 'Mengirim Data...' : '✅ Kirim Presensi Sekarang'}
            </button>
            <button
              onClick={() => setStep('sign')}
              disabled={step === 'submitting'}
              className="w-full py-2.5 rounded-xl text-xs text-text-muted hover:text-text transition disabled:opacity-40"
            >
              ← Ulangi Tanda Tangan
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
