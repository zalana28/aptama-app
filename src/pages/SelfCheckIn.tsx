import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Member, Event } from '../types'

export function SelfCheckIn() {
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<(Event & { is_open: boolean })[]>([])
  const [memberId, setMemberId] = useState('')
  const [eventId, setEventId] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))

    // Ambil kegiatan yang checkin_close_at belum lewat
    supabase.from('events').select('*')
      .not('checkin_close_at', 'is', null)
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

  const selectedEv = events.find((e) => e.id === eventId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !eventId) return
    setError('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('self_check_in', {
      p_event_id: eventId,
      p_member_id: memberId,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message || 'Gagal check-in. Coba lagi.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Check-in Berhasil!</h1>
        <p className="text-text-muted text-sm">
          Sampai jumpa di lokasi ya! Jangan lupa datang.
        </p>
        <button
          onClick={() => { setDone(false); setMemberId(''); setEventId('') }}
          className="text-primary text-sm hover:underline"
        >
          Check-in lagi
        </button>
      </div>
    )
  }

  const openEvents = events.filter((ev) => ev.is_open)

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">🏠</div>
        <h1 className="text-xl font-bold">Check-in dari Rumah</h1>
        <p className="text-text-muted text-sm">
          Konfirmasi kehadiran sebelum jam mulai kegiatan.
        </p>
      </div>

      {openEvents.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-text-muted text-sm">Belum ada kegiatan yang membuka check-in.</p>
          <p className="text-text-muted text-xs">
            Check-in dibuka oleh ketua dan otomatis tertutup saat jam mulai.
          </p>
        </div>
      ) : (
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
              {openEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          {selectedEv && selectedEv.checkin_close_at && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
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
            </div>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !memberId || !eventId}
            className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            {loading ? 'Memproses...' : '🙋 Saya akan hadir — Check-in'}
          </button>

          <p className="text-xs text-text-muted text-center">
            Setelah check-in, wajib datang ya. Ketua bisa koreksi jika tidak hadir.
          </p>
        </form>
      )}
    </div>
  )
}
