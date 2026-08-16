import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { uploadSignatureBlob } from '../lib/signature'
import { SignaturePad } from '../components/SignaturePad'
import type { Member, QrValidation } from '../types'

type Step = 'pick' | 'sign' | 'confirm' | 'submitting' | 'done'

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
      </div>
    )
  }

  if (qrLoading || !qr) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-muted text-sm">Memverifikasi QR...</p>
      </div>
    )
  }

  if (!qr.is_valid) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">⏰</div>
        <h1 className="text-xl font-bold">QR Tidak Bisa Dipakai</h1>
        <p className="text-text-muted text-sm">
          {qr.error_message ?? 'QR tidak valid.'}
        </p>
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
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Absensi Berhasil!</h1>
        <p className="text-text-muted text-sm">
          {resultMessage || `Kehadiranmu tercatat di kegiatan ${qr.title}.`}
        </p>
        <a href="/" className="inline-block text-primary text-sm hover:underline">
          ← Kembali ke Beranda
        </a>
      </div>
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
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Event info + QR status */}
      <div className="bg-bg-card border border-primary/30 rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          <p className="text-xs font-medium text-success">QR valid</p>
        </div>
        <h1 className="text-lg font-bold">{qr.title}</h1>
        <p className="text-text-muted text-sm">
          {formatDate(qr.date)}
          {qr.time && <span> · {qr.time} WIB</span>}
          {qr.location && <span> · {qr.location}</span>}
        </p>
        {qr.checkin_expires_at && (
          <p className="text-[11px] text-text-muted">
            Berlaku sampai{' '}
            {new Date(qr.checkin_expires_at).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {step === 'pick' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Pilih namamu, lalu tanda tangan untuk konfirmasi kehadiran.
          </p>
          <input
            type="search"
            placeholder="Cari nama atau RT/RW..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="bg-bg-card border border-border rounded-xl divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="px-4 py-8 text-center text-text-muted text-sm">
                Nama tidak ditemukan.
              </p>
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
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-white/5 transition"
                >
                  <span className="font-medium text-sm">{m.name}</span>
                  {m.group && (
                    <span className="text-xs text-text-muted">{m.group}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {step === 'sign' && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-base font-semibold">
              Halo, {selectedMember?.name} 👋
            </h2>
            <p className="text-text-muted text-xs mt-1">
              Tanda tangan sebagai bukti kehadiranmu.
            </p>
          </div>

          <SignaturePad onChange={setSignatureBlob} />

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            onClick={() => {
              setError('')
              setStep('confirm')
            }}
            disabled={!signatureBlob}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            Lanjutkan
          </button>
          <button
            onClick={() => setStep('pick')}
            className="w-full px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text transition"
          >
            ← Ganti nama
          </button>
        </div>
      )}

      {(step === 'confirm' || step === 'submitting') && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-text-muted uppercase tracking-wider">
              Konfirmasi Absensi
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Nama</span>
              <span className="font-medium">{selectedMember?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Kegiatan</span>
              <span className="font-medium text-right">{qr.title}</span>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-1">Tanda tangan</p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Tanda tangan"
                  className="w-full h-24 object-contain bg-white rounded-lg"
                />
              )}
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={step === 'submitting'}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            {step === 'submitting' ? 'Mengirim...' : '✅ Kirim Absensi'}
          </button>
          <button
            onClick={() => setStep('sign')}
            disabled={step === 'submitting'}
            className="w-full px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text transition disabled:opacity-40"
          >
            ← Perbaiki tanda tangan
          </button>
        </div>
      )}
    </div>
  )
}
