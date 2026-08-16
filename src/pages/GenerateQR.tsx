import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Copy, Check, Printer, Sparkles, Clock } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { useAdmin } from '../hooks/useAdmin'
import { getAdminToken } from '../lib/admin'
import { supabase } from '../lib/supabase'

export function GenerateQR() {
  const qc = useQueryClient()
  const { data: events = [] } = useEvents()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [token, setToken] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(120)
  const [copied, setCopied] = useState(false)

  const selectedEv = events.find((e) => e.id === selectedEvent)

  async function handleGenerate() {
    if (!selectedEvent) return
    setError('')
    setLoading(true)

    let token: string
    try {
      token = getAdminToken()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sesi admin berakhir. Login ulang.')
      setLoading(false)
      return
    }

    const { data, error: rpcError } = await supabase.rpc('admin_generate_checkin_qr', {
      p_token: token,
      p_event_id: selectedEvent,
      p_minutes: duration,
    })

    setLoading(false)
    if (rpcError || !data) {
      setError(rpcError?.message || 'Gagal generate QR')
      return
    }

    const result = (Array.isArray(data) ? data[0] : data) as {
      event_id: string
      checkin_token: string
      checkin_expires_at: string
    }

    if (!result?.checkin_token) {
      setError('Token QR gagal dibuat.')
      return
    }

    setToken(result.checkin_token)
    setExpiresAt(result.checkin_expires_at)
    const url = `${window.location.origin}/scan?token=${result.checkin_token}`
    setQrUrl(url)

    // Invalidate queries so Scan QR and Home live alerts update immediately
    await qc.invalidateQueries({ queryKey: ['events'] })
    await qc.invalidateQueries({ queryKey: ['active-qr-events'] })
    await qc.refetchQueries({ queryKey: ['active-qr-events'] })
  }

  function handleCopy() {
    if (!qrUrl) return
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Halaman ini khusus ketua.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="text-center space-y-1.5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <QrCode size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Buka Sesi QR Presensi</h1>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          Pilih kegiatan untuk mengaktifkan kode QR presensi bagi anggota APTAMA.
        </p>
      </div>

      <div className="bg-bg-card rounded-2xl p-5 border border-border space-y-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Pilih Kegiatan *</label>
          <select
            value={selectedEvent}
            onChange={(e) => { setSelectedEvent(e.target.value); setQrUrl(''); setToken('') }}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
          >
            <option value="">— Pilih kegiatan —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Durasi Aktif QR</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
          >
            <option value={30}>⏱ 30 Menit</option>
            <option value={60}>⏱ 1 Jam</option>
            <option value={120}>⏱ 2 Jam (Direkomendasikan)</option>
            <option value={240}>⏱ 4 Jam</option>
            <option value={480}>⏱ 8 Jam</option>
          </select>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-danger text-xs font-medium">⚠️ {error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedEvent}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20"
        >
          <Sparkles size={16} />
          <span>{loading ? 'Membuat QR...' : 'Aktifkan & Tampilkan QR Code'}</span>
        </button>
      </div>

      {/* QR Result */}
      <AnimatePresence>
        {qrUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white text-gray-900 rounded-3xl p-6 text-center space-y-4 shadow-xl border border-gray-100"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SESI PRESENSI AKTIF</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 inline-block shadow-inner">
              <QRCodeSVG value={qrUrl} size={220} className="mx-auto" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-extrabold text-gray-900">{selectedEv?.title}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Clock size={13} />
                <span>
                  Berlaku s/d: {expiresAt ? new Date(expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : `${duration} menit`} WIB
                </span>
              </p>
              <p className="text-[11px] text-gray-400 font-mono">Token: {token.slice(0, 14)}…</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-200 transition active:scale-95"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Link Tersalin!' : 'Salin Link Absen'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-black transition active:scale-95 shadow-sm"
              >
                <Printer size={14} />
                <span>Cetak QR</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
