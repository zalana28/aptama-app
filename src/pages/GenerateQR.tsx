import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useEvents } from '../hooks/useEvents'
import { useAdmin } from '../hooks/useAdmin'
import { supabase } from '../lib/supabase'

export function GenerateQR() {
  const { data: events } = useEvents()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(120)

  const selectedEv = events?.find((e) => e.id === selectedEvent)

  async function handleGenerate() {
    if (!selectedEvent) return
    setError('')
    setLoading(true)

    const pin = localStorage.getItem('aptama_admin_pin')
    if (!pin) {
      setError('PIN admin tidak ditemukan. Login ulang.')
      setLoading(false)
      return
    }

    const { data, error: rpcError } = await supabase.rpc('generate_qr_token', {
      p_event_id: selectedEvent,
      p_pin: pin,
      p_duration_minutes: duration,
    })

    setLoading(false)
    if (rpcError || !data) {
      setError(rpcError?.message || 'Gagal generate QR')
      return
    }

    const t = data as string
    setToken(t)
    const url = `${window.location.origin}/scan?token=${t}`
    setQrUrl(url)
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
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
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
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value={30}>30 menit</option>
            <option value={60}>1 jam</option>
            <option value={120}>2 jam</option>
            <option value={240}>4 jam</option>
          </select>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedEvent}
          className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
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
              Berlaku {duration} menit · Token: {token.slice(0, 8)}...
            </p>
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
