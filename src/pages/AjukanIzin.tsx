import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, Event } from '../types'

export function AjukanIzin() {
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [memberId, setMemberId] = useState('')
  const [eventId, setEventId] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))
    supabase.from('events').select('*').order('date', { ascending: false })
      .then(({ data }) => setEvents((data ?? []) as Event[]))
  }, [])

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
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-text-muted mt-1">
            🔒 Alasan ini hanya bisa dilihat oleh ketua. Privasimu aman. <span className="text-warning">Wajib diisi.</span>
          </p>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !memberId || !eventId}
          className="w-full bg-warning text-bg px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-warning/80 transition disabled:opacity-50"
        >
          {loading ? 'Mengirim...' : '📤 Kirim Izin'}
        </button>
      </form>
    </div>
  )
}
