import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'
import { useAttendanceByEvent, useAdminAttendanceByEvent, useUpsertAttendance } from '../hooks/useAttendance'
import { useAdmin } from '../hooks/useAdmin'
import type { AttendanceStatus } from '../types'

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  hadir: { label: 'Hadir', color: 'text-success', bg: 'bg-success/20 border-success/40' },
  izin: { label: 'Izin', color: 'text-warning', bg: 'bg-warning/20 border-warning/40' },
  alfa: { label: 'Alfa', color: 'text-danger', bg: 'bg-danger/20 border-danger/40' },
}

function StatusButton({
  status,
  active,
  onClick,
}: {
  status: AttendanceStatus
  active: boolean
  onClick: () => void
}) {
  const cfg = statusConfig[status]
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
        active ? cfg.bg + ' ' + cfg.color : 'border-white/10 text-text-muted hover:border-white/20'
      }`}
    >
      {cfg.label}
    </button>
  )
}

export function Attendance() {
  const { data: events } = useEvents()
  const { data: members } = useMembers()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  // Ketua: query admin RPC yang include kolom `note` (alasan izin).
  // Non-ketua: query view publik tanpa `note` (privasi terjaga).
  const { data: publicRows } = useAttendanceByEvent(selectedEvent)
  const { data: adminRows } = useAdminAttendanceByEvent(selectedEvent)
  const attendanceRows = isAdmin ? adminRows : publicRows
  const upsert = useUpsertAttendance()
  const [noteModal, setNoteModal] = useState<{ memberId: string; memberName: string } | null>(null)
  const [noteText, setNoteText] = useState('')

  // Map member_id -> status
  const statusMap = new Map<string, AttendanceStatus>()
  const noteMap = new Map<string, string>()
  attendanceRows?.forEach((r) => {
    statusMap.set(r.member_id, r.status as AttendanceStatus)
    if (r.note) noteMap.set(r.member_id, r.note)
  })

  async function setStatus(memberId: string, status: AttendanceStatus) {
    if (!selectedEvent) return
    await upsert.mutateAsync({
      event_id: selectedEvent,
      member_id: memberId,
      status,
    })
  }

  async function submitNote() {
    if (!noteModal) return
    await upsert.mutateAsync({
      event_id: selectedEvent,
      member_id: noteModal.memberId,
      status: 'izin',
      note: noteText.trim() || undefined,
    })
    setNoteModal(null)
    setNoteText('')
  }

  const selectedEv = events?.find((e) => e.id === selectedEvent)
  const hadir = members?.filter((m) => statusMap.get(m.id) === 'hadir').length ?? 0
  const izin = members?.filter((m) => statusMap.get(m.id) === 'izin').length ?? 0
  const alfa = members ? members.length - hadir - izin : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">📋 Absensi</h1>

      {/* Event selector */}
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
      >
        <option value="">— Pilih kegiatan —</option>
        {events?.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title} ({ev.date})
          </option>
        ))}
      </select>

      {/* Summary */}
      {selectedEvent && members && members.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-success">{hadir}</div>
            <div className="text-xs text-text-muted">Hadir</div>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-warning">{izin}</div>
            <div className="text-xs text-text-muted">Izin</div>
          </div>
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-danger">{alfa}</div>
            <div className="text-xs text-text-muted">Alfa</div>
          </div>
        </div>
      )}

      {/* Member list */}
      {!selectedEvent ? (
        <p className="text-text-muted text-sm text-center py-8">Pilih kegiatan dulu untuk mulai absen</p>
      ) : !members || members.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">Belum ada anggota. Tambah dulu di menu Anggota.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const current = statusMap.get(m.id)
            return (
              <div
                key={m.id}
                className={`bg-bg-card rounded-xl px-4 py-3 border transition ${
                  current ? statusConfig[current].bg : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    {noteMap.has(m.id) && (
                      <p className="text-text-muted text-xs truncate mt-0.5">
                        📝 {noteMap.get(m.id)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {(['hadir', 'izin', 'alfa'] as AttendanceStatus[]).map((s) => (
                      <StatusButton
                        key={s}
                        status={s}
                        active={current === s}
                        onClick={() => {
                          if (s === 'izin') {
                            setNoteModal({ memberId: m.id, memberName: m.name })
                            setNoteText(noteMap.get(m.id) ?? '')
                          } else {
                            setStatus(m.id, s)
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          <p className="text-text-muted text-xs text-center pt-2">
            {members.length} anggota · {selectedEv?.title}
          </p>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-xl p-4 w-full max-w-sm space-y-3 border border-white/10">
            <h3 className="font-medium text-sm">📝 Alasan Izin — {noteModal.memberName}</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Tulis alasan izin (opsional)..."
              rows={3}
              className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              autoFocus
            />
            <p className="text-xs text-text-muted">Alasan ini hanya bisa dilihat oleh ketua.</p>
            <div className="flex gap-2">
              <button
                onClick={submitNote}
                className="bg-warning text-bg px-4 py-2 rounded-lg text-sm font-medium hover:bg-warning/80 transition"
              >
                Simpan Izin
              </button>
              <button
                onClick={() => { setNoteModal(null); setNoteText('') }}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
