import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'

export function AjukanIzin() {
  const { data: members = [] } = useMembers()
  const { data: events = [] } = useEvents()
  const [memberId, setMemberId] = useState('')
  const [eventId, setEventId] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !eventId) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError('Alasan izin wajib diisi.')
      return
    }
    setError('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('submit_izin', {
      p_event_id: eventId,
      p_member_id: memberId,
      p_reason: trimmedReason,
    })

    setLoading(false)
    if (rpcError) {
      setError('Gagal kirim izin. Coba lagi.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Izin Terkirim!</h1>
        <p className="text-text-muted text-sm">
          Ketua sudah menerima alasanmu. Terima kasih sudah konfirmasi.
        </p>
        <button
          onClick={() => { setDone(false); setMemberId(''); setEventId(''); setReason('') }}
          className="text-primary text-sm hover:underline"
        >
          Kirim izin lagi
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">📝</div>
        <h1 className="text-xl font-bold">Ajukan Izin</h1>
        <p className="text-text-muted text-sm">
          Pilih namamu, pilih kegiatan, tulis alasan izin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Nama</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
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
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
            required
          >
            <option value="">— Pilih kegiatan —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Alasan Izin <span className="text-danger">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tulis alasan izin..."
            rows={3}
            required
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-text-muted mt-1">
            🔒 Alasan ini hanya bisa dilihat oleh ketua. Privasimu aman.
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-danger text-xs">⚠️ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !memberId || !eventId}
          className="w-full bg-warning text-bg px-4 py-3 rounded-xl text-sm font-semibold hover:bg-warning/80 transition disabled:opacity-50 active:scale-95 shadow-md shadow-warning/20"
        >
          {loading ? 'Mengirim...' : '📤 Kirim Izin'}
        </button>
      </form>
    </div>
  )
}
