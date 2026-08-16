import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle2, ShieldCheck, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'

const quickReasons = [
  '🤒 Sakit / Kurang Sehat',
  '👨‍👩‍👧‍👦 Acara Keluarga',
  '💼 Bekerja / Tugas Lembur',
  '🚗 Sedang di Luar Kota',
  '📚 Kuliah / Ujian',
]

export function AjukanIzin() {
  const { data: members = [] } = useMembers()
  const { data: events = [] } = useEvents()
  const [memberId, setMemberId] = useState('')
  const [eventId, setEventId] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedMember = members.find((m) => m.id === memberId)
  const selectedEvent = events.find((e) => e.id === eventId)

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
      setError(rpcError.message || 'Gagal kirim izin. Coba lagi.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto px-4 py-12 text-center space-y-5"
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-warning/15 text-warning shadow-lg shadow-warning/20">
          <CheckCircle2 size={44} />
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning">
            <ShieldCheck size={14} />
            <span>IZIN TERKONFIRMASI</span>
          </div>
          <h1 className="text-2xl font-bold text-text">Izin Berhasil Terkirim!</h1>
          <p className="text-text-muted text-xs max-w-xs mx-auto">
            Ketua telah menerima alasan izinmu untuk kegiatan {selectedEvent?.title}.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-4 text-left space-y-2.5 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Nama:</span>
            <span className="font-semibold text-text">{selectedMember?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Kegiatan:</span>
            <span className="font-semibold text-text">{selectedEvent?.title}</span>
          </div>
          <div className="text-xs pt-1 border-t border-border/50">
            <span className="text-text-muted">Alasan:</span>
            <p className="font-medium text-text mt-0.5">{reason}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition shadow-lg shadow-primary/20"
          >
            <span>Kembali ke Beranda</span>
          </Link>
          <button
            onClick={() => { setDone(false); setMemberId(''); setEventId(''); setReason('') }}
            className="w-full py-2.5 rounded-xl text-xs text-text-muted hover:text-text transition"
          >
            Kirim Izin Lagi
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto px-4 py-6 space-y-5"
    >
      <div className="text-center space-y-1.5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/15 text-secondary shadow-sm">
          <FileText size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Form Pengajuan Izin</h1>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          Berhalangan hadir kegiatan? Konfirmasi alasanmu ke ketua.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Nama Anggota *</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
            required
          >
            <option value="">— Pilih namamu —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} {m.group ? `(${m.group})` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Pilih Kegiatan *</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
            required
          >
            <option value="">— Pilih kegiatan —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">
            Alasan Izin <span className="text-danger">*</span>
          </label>

          {/* Quick reason tag selector */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => setReason(qr)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${reason === qr ? 'bg-secondary/20 border-secondary text-text font-semibold' : 'bg-bg-card border-border text-text-muted hover:border-secondary/40'}`}
              >
                {qr}
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tulis alasan izin secara spesifik..."
            rows={3}
            required
            className="w-full bg-bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
          />
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <span>🔒</span>
            <span>Alasan ini bersifat privat dan hanya dapat dibaca oleh Ketua.</span>
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-danger text-xs font-medium">⚠️ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !memberId || !eventId}
          className="w-full flex items-center justify-center gap-2 bg-warning text-bg px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-warning/80 transition disabled:opacity-50 active:scale-95 shadow-md shadow-warning/20"
        >
          <Send size={16} />
          <span>{loading ? 'Mengirim Izin...' : 'Kirim Pengajuan Izin'}</span>
        </button>
      </form>
    </motion.div>
  )
}
