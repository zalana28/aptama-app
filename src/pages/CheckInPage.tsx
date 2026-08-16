import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEvents } from '../hooks/useEvents'
import { uploadSignatureBlob } from '../lib/signature'
import { SignaturePad } from '../components/SignaturePad'
import type { Member, Event } from '../types'

type Step = 'event' | 'pick' | 'sign' | 'confirm' | 'submitting' | 'done'

export function CheckInPage() {
  const { data: events = [] } = useEvents()
  const [step, setStep] = useState<Step>('event')
  const [eventId, setEventId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

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

  const openEvents = useMemo(
    () =>
      events.filter(
        (ev: Event) =>
          ev.checkin_close_at &&
          new Date(ev.checkin_close_at).getTime() > Date.now(),
      ),
    [events],
  )

  const selectedEvent = events.find((ev: Event) => ev.id === eventId)
  const selectedMember = members.find((m) => m.id === memberId)

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.group ?? '').toLowerCase().includes(q),
    )
  }, [members, search])

  const previewUrl = useMemo(
    () => (signatureBlob ? URL.createObjectURL(signatureBlob) : null),
    [signatureBlob],
  )

  async function handleSubmit() {
    if (!selectedMember || !signatureBlob) return
    setError('')
    setStep('submitting')
    let uploadedPath: string | null = null
    try {
      uploadedPath = await uploadSignatureBlob(signatureBlob, eventId)
      const { data, error: rpcError } = await supabase.rpc(
        'submit_self_checkin_signature',
        {
          p_event_id: eventId,
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
        setError(result.error ?? 'Gagal check-in.')
        setStep('confirm')
        return
      }
      setResultMessage(result.message ?? 'Check-in berhasil!')
      setStep('done')
    } catch (err: unknown) {
      await removeUploadedSignature(uploadedPath)
      setError(err instanceof Error ? err.message : 'Gagal mengirim check-in. Coba lagi.')
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
        <h1 className="text-xl font-bold text-success">Check-in Berhasil!</h1>
        <p className="text-text-muted text-sm">
          {resultMessage || 'Kehadiranmu tercatat. Sampai jumpa di lokasi!'}
        </p>
        <a href="/" className="inline-block text-primary text-sm hover:underline">
          ← Kembali ke Beranda
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">Check-in dari Rumah</h1>
        <p className="text-text-muted text-sm">
          Absen sebelum kegiatan dimulai dengan tanda tangan digital.
        </p>
      </div>

      {step === 'event' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Pilih kegiatan:</p>
          {openEvents.length === 0 ? (
            <div className="bg-bg-card border border-white/10 rounded-xl p-6 text-center">
              <p className="text-text-muted text-sm">
                Belum ada kegiatan dengan check-in terbuka.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Tunggu pengurus membuka check-in, atau scan QR saat kegiatan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {openEvents.map((ev: Event) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setEventId(ev.id)
                    setSignatureBlob(null)
                    setError('')
                    setStep('pick')
                  }}
                  className="w-full bg-bg-card border border-primary/30 rounded-xl p-4 text-left hover:border-primary/60 transition"
                >
                  <p className="font-semibold text-sm">{ev.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {new Date(ev.date + 'T00:00:00').toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {ev.time && <span> · {ev.time} WIB</span>}
                  </p>
                  {ev.checkin_close_at && (
                    <p className="text-text-muted text-[11px] mt-1">
                      Tutup check-in:{' '}
                      {new Date(ev.checkin_close_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'pick' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Pilih namamu untuk kegiatan <span className="font-medium text-text">{selectedEvent?.title}</span>:
          </p>
          <input
            type="search"
            placeholder="Cari nama atau RT/RW..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="bg-bg-card border border-white/10 rounded-xl divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
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
          <button
            onClick={() => setStep('event')}
            className="w-full px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text transition"
          >
            ← Ganti kegiatan
          </button>
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
          <div className="bg-bg-card border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-xs text-text-muted uppercase tracking-wider">
              Konfirmasi Check-in
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Nama</span>
              <span className="font-medium">{selectedMember?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Kegiatan</span>
              <span className="font-medium text-right">{selectedEvent?.title}</span>
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
            {step === 'submitting' ? 'Mengirim...' : '✅ Kirim Check-in'}
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
