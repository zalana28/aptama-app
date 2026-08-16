import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useEvents } from '../hooks/useEvents'
import { useAdmin } from '../hooks/useAdmin'
import { getAdminToken } from '../lib/admin'
import { supabase } from '../lib/supabase'

export function GenerateQR() {
  const qc = useQueryClient()
  const { data: events } = useEvents()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [token, setToken] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(120)

  const selectedEv = events?.find((e) => e.id === selectedEvent)

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

    // PENTING: refresh data events agar halaman lain (Check-in / Scan QR) bisa baca QR aktif
    await qc.invalidateQueries({ queryKey: ['events'] })
    await qc.invalidateQueries({ queryKey: ['active-qr-events'] })
    await qc.refetchQueries({ queryKey: ['active-qr-events'] })
  }

  function handleCopy() {
    navigator.clipboard.writeText(qrUrl)
    alert('Link tersalin!')
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Halaman ini khusus ketua.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">📱 Generate QR Absen</h1>
      <p className="text-text-muted text-sm">
        Buat QR code untuk kegiatan. Anggota scan QR untuk absen.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Kegiatan</label>
          <select
            value={selectedEvent}
            onChange={(e) => { setSelectedEvent(e.target.value); setQrUrl(''); setToken('') }}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="">— Pilih kegiatan —</option>
            {events?.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Berlaku (menit)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value={30}>30 menit</option>
            <option value={60}>1 jam</option>
            <option value={120}>2 jam</option>
            <option value={240}>4 jam</option>
          </select>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-danger text-xs">⚠️ {error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedEvent}
          className="w-full bg-primary text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20"
        >
          {loading ? 'Generating...' : '🔲 Generate QR Code'}
        </button>
      </div>

      {/* QR Result */}
      {qrUrl && (
        <div className="bg-white rounded-xl p-6 text-center space-y-4">
          <QRCodeSVG value={qrUrl} size={220} className="mx-auto" />
          <div className="space-y-1">
            <p className="text-black text-sm font-medium">{selectedEv?.title}</p>
            <p className="text-gray-500 text-xs">
              Berlaku sampai: {expiresAt ? new Date(expiresAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : `${duration} menit`}
            </p>
            <p className="text-gray-400 text-[10px] font-mono">Token: {token.slice(0, 12)}…</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
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
    </div>
  )
}
