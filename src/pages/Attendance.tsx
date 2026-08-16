import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'
import {
  useAttendanceByEvent,
  useAdminAttendanceByEvent,
  useUpsertAttendance,
  useMarkPresent,
  useUndoAttendance,
} from '../hooks/useAttendance'
import { useAdmin } from '../hooks/useAdmin'
import { getSignatureViewUrl } from '../lib/signature'
import { supabase } from '../lib/supabase'
import type { AttendanceStatus, AdminAttendanceRow } from '../types'

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  hadir: { label: 'Hadir', color: 'text-success', bg: 'bg-success/20 border-success/40' },
  izin: { label: 'Izin', color: 'text-warning', bg: 'bg-warning/20 border-warning/40' },
  alfa: { label: 'Alfa', color: 'text-danger', bg: 'bg-danger/20 border-danger/40' },
}

function sourceLabel(src?: string): string {
  switch (src) {
    case 'member_signature':
      return '✍️ Tanda tangan'
    case 'admin_manual':
      return '🖐 Manual'
    case 'izin':
      return '📝 Izin'
    default:
      return '📦 Lama'
  }
}

export function Attendance() {
  const qc = useQueryClient()
  const { data: events } = useEvents()
  const { data: members } = useMembers()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  const [search, setSearch] = useState('')
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set())

  const { data: publicRows } = useAttendanceByEvent(selectedEvent)
  const { data: adminRows } = useAdminAttendanceByEvent(selectedEvent)
  const attendanceRows = (isAdmin ? adminRows : publicRows) as
    | AdminAttendanceRow[]
    | undefined

  const upsert = useUpsertAttendance()
  const markPresent = useMarkPresent()
  const undoAttendance = useUndoAttendance()

  const [confirmTarget, setConfirmTarget] = useState<{
    memberId: string
    name: string
    action: 'present' | 'undo'
  } | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [noteModal, setNoteModal] = useState<{ memberId: string; memberName: string } | null>(null)
  const [noteText, setNoteText] = useState('')

  const [sigViewer, setSigViewer] = useState<{ memberName: string } | null>(null)
  const [sigUrl, setSigUrl] = useState<string | null>(null)
  const [sigLoading, setSigLoading] = useState(false)
  const [sigError, setSigError] = useState('')

  const rowByMember = new Map<string, AdminAttendanceRow>()
  attendanceRows?.forEach((r) => rowByMember.set(r.member_id, r))

  useEffect(() => {
    if (!selectedEvent) return
    setLiveIds(new Set())

    const channel = supabase
      .channel(`attendance-${selectedEvent}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `event_id=eq.${selectedEvent}`,
        },
        (payload) => {
          const memberId =
            payload.eventType === 'DELETE'
              ? (payload.old as { member_id?: string })?.member_id
              : (payload.new as { member_id?: string })?.member_id
          if (memberId) {
            setLiveIds((prev) => new Set(prev).add(memberId))
            setTimeout(() => {
              setLiveIds((prev) => {
                const next = new Set(prev)
                next.delete(memberId)
                return next
              })
            }, 3000)
          }
          qc.invalidateQueries({ queryKey: ['attendance', selectedEvent] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedEvent, qc])

  const selectedEv = events?.find((e) => e.id === selectedEvent)
  const hadir = members?.filter((m) => rowByMember.get(m.id)?.status === 'hadir').length ?? 0
  const izin = members?.filter((m) => rowByMember.get(m.id)?.status === 'izin').length ?? 0
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'izin' | 'alfa'>('all')

  const totalMembers = members?.length ?? 0
  const hadirPct = totalMembers > 0 ? Math.round((hadir / totalMembers) * 100) : 0
  const izinPct = totalMembers > 0 ? Math.round((izin / totalMembers) * 100) : 0
  const alfaPct = totalMembers > 0 ? Math.max(0, 100 - hadirPct - izinPct) : 0

  const filtered = (members ?? []).filter((m) => {
    const row = rowByMember.get(m.id)
    const st = row?.status ?? 'alfa'

    if (statusFilter === 'hadir' && st !== 'hadir') return false
    if (statusFilter === 'izin' && st !== 'izin') return false
    if (statusFilter === 'alfa' && st !== 'alfa') return false

    const q = search.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || (m.group ?? '').toLowerCase().includes(q)
  })

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return (name[0] ?? '?').toUpperCase()
  }

  async function setStatus(memberId: string, status: AttendanceStatus) {
    if (!selectedEvent) return
    await upsert.mutateAsync({ event_id: selectedEvent, member_id: memberId, status })
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

  async function confirmToggle() {
    if (!confirmTarget) return
    setConfirmError('')
    setConfirmLoading(true)
    try {
      let res: { success?: boolean; error?: string } | null = null
      if (confirmTarget.action === 'present') {
        res = await markPresent.mutateAsync({
          event_id: selectedEvent,
          member_id: confirmTarget.memberId,
        })
      } else {
        res = await undoAttendance.mutateAsync({
          event_id: selectedEvent,
          member_id: confirmTarget.memberId,
        })
      }
      if (res && res.success === false) {
        setConfirmError(res.error ?? 'Gagal menyimpan. Coba lagi.')
        return
      }
      setConfirmTarget(null)
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.')
    } finally {
      setConfirmLoading(false)
    }
  }

  async function openSignature(row: AdminAttendanceRow) {
    setSigLoading(true)
    setSigError('')
    setSigUrl(null)
    setSigViewer({ memberName: row.member_name })
    try {
      const url = await getSignatureViewUrl(row.id)
      if (!url) throw new Error('Tanda tangan tidak ditemukan.')
      setSigUrl(url)
    } catch (err: unknown) {
      setSigError(err instanceof Error ? err.message : 'Gagal memuat tanda tangan.')
    } finally {
      setSigLoading(false)
    }
  }

  function formatTime(iso?: string): string {
    if (!iso) return ''
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">📋 Absensi</h1>

      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
      >
        <option value="">— Pilih kegiatan —</option>
        {events?.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title} ({ev.date})
          </option>
        ))}
      </select>

      {selectedEvent && members && members.length > 0 && (
        <div className="space-y-3">
          {/* Visual Percentage Progress Bar */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text">Tingkat Kehadiran: <span className="text-primary font-bold">{hadirPct}%</span></span>
              <span className="text-text-muted">{hadir} dari {totalMembers} Anggota</span>
            </div>
            <div className="h-3 w-full rounded-full bg-bg-elevated overflow-hidden flex border border-border">
              <div style={{ width: `${hadirPct}%` }} className="bg-success transition-all duration-500" title={`Hadir: ${hadir}`} />
              <div style={{ width: `${izinPct}%` }} className="bg-warning transition-all duration-500" title={`Izin: ${izin}`} />
              <div style={{ width: `${alfaPct}%` }} className="bg-danger/60 transition-all duration-500" title={`Alfa: ${totalMembers - hadir - izin}`} />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'hadir' ? 'all' : 'hadir')}
                className={`rounded-xl p-2.5 text-center transition border ${statusFilter === 'hadir' ? 'bg-success/20 border-success shadow-sm' : 'bg-success/10 border-success/30 hover:bg-success/15'}`}
              >
                <div className="text-base font-bold text-success">{hadir}</div>
                <div className="text-[10px] text-text-muted">Hadir ({hadirPct}%)</div>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'izin' ? 'all' : 'izin')}
                className={`rounded-xl p-2.5 text-center transition border ${statusFilter === 'izin' ? 'bg-warning/20 border-warning shadow-sm' : 'bg-warning/10 border-warning/30 hover:bg-warning/15'}`}
              >
                <div className="text-base font-bold text-warning">{izin}</div>
                <div className="text-[10px] text-text-muted">Izin ({izinPct}%)</div>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'alfa' ? 'all' : 'alfa')}
                className={`rounded-xl p-2.5 text-center transition border ${statusFilter === 'alfa' ? 'bg-danger/20 border-danger shadow-sm' : 'bg-danger/10 border-danger/30 hover:bg-danger/15'}`}
              >
                <div className="text-base font-bold text-danger">{totalMembers - hadir - izin}</div>
                <div className="text-[10px] text-text-muted">Alfa ({alfaPct}%)</div>
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${statusFilter === 'all' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bg-card border-border text-text-muted hover:text-text'}`}
            >
              Semua ({totalMembers})
            </button>
            <button
              onClick={() => setStatusFilter('hadir')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${statusFilter === 'hadir' ? 'bg-success text-white border-success shadow-sm' : 'bg-bg-card border-border text-text-muted hover:text-text'}`}
            >
              Hadir ({hadir})
            </button>
            <button
              onClick={() => setStatusFilter('izin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${statusFilter === 'izin' ? 'bg-warning text-bg border-warning shadow-sm' : 'bg-bg-card border-border text-text-muted hover:text-text'}`}
            >
              Izin ({izin})
            </button>
            <button
              onClick={() => setStatusFilter('alfa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${statusFilter === 'alfa' ? 'bg-danger text-white border-danger shadow-sm' : 'bg-bg-card border-border text-text-muted hover:text-text'}`}
            >
              Belum Absen ({totalMembers - hadir - izin})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="search"
              placeholder="Cari nama atau RT/RW di daftar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>
        </div>
      )}

      {!selectedEvent ? (
        <p className="text-text-muted text-sm text-center py-8">Pilih kegiatan dulu untuk mulai absen</p>
      ) : !members || members.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">Belum ada anggota. Tambah dulu di menu Anggota.</p>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Tidak ada nama yang cocok.</p>
          ) : (
            filtered.map((m) => {
              const row = rowByMember.get(m.id)
              const current = row?.status as AttendanceStatus | undefined
              const isPresent = current === 'hadir'
              return (
                <div
                  key={m.id}
                  className={`bg-bg-card rounded-xl px-4 py-3 border transition ${
                    current ? statusConfig[current].bg : 'border-border'
                  } ${liveIds.has(m.id) ? 'ring-2 ring-primary animate-pulse-dot' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() =>
                            setConfirmTarget({
                              memberId: m.id,
                              name: m.name,
                              action: isPresent ? 'undo' : 'present',
                            })
                          }
                          className="h-4 w-4 rounded border-border bg-bg-input accent-emerald-500 cursor-pointer"
                          title={isPresent ? 'Batalkan kehadiran' : 'Tandai hadir'}
                        />
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                          {getInitials(m.name)}
                        </div>
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5 text-text">
                          {m.name}
                          {m.group && <span className="text-text-muted text-xs font-normal">({m.group})</span>}
                        </p>
                      </div>
                      {row && isPresent && (
                        <div className="mt-1.5 ml-14 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                          <span>⏱ {formatTime(row.check_in_at ?? row.submitted_at)}</span>
                          <span>{sourceLabel(row.attendance_source)}</span>
                          {row.attendance_source === 'member_signature' && (
                            <button
                              type="button"
                              onClick={() => openSignature(row)}
                              className="text-primary font-semibold hover:underline"
                            >
                              Lihat tanda tangan ✍️
                            </button>
                          )}
                        </div>
                      )}
                      {row?.note && (
                        <p className="text-warning text-xs truncate mt-0.5 ml-14 font-medium">
                          📝 {row.note}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {(['hadir', 'izin', 'alfa'] as AttendanceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            if (s === 'izin') {
                              setNoteModal({ memberId: m.id, memberName: m.name })
                              setNoteText(row?.note ?? '')
                            } else {
                              setStatus(m.id, s)
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            current === s
                              ? statusConfig[s].bg + ' ' + statusConfig[s].color
                              : 'border-border text-text-muted hover:border-white/20'
                          }`}
                        >
                          {statusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <p className="text-text-muted text-xs text-center pt-2">
            {members.length} anggota · {selectedEv?.title}
          </p>
        </div>
      )}

      {/* Confirm toggle dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-xl p-4 w-full max-w-sm space-y-3 border border-border">
            <h3 className="font-medium text-sm">
              {confirmTarget.action === 'present'
                ? `Tandai hadir — ${confirmTarget.name}`
                : `Batalkan kehadiran — ${confirmTarget.name}`}
            </h3>
            <p className="text-xs text-text-muted">
              {confirmTarget.action === 'present'
                ? 'Anggota akan dicatat hadir (sumber: manual).'
                : 'Catatan kehadiran anggota ini akan dihapus.'}
            </p>
            {confirmError && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                <p className="text-danger text-xs">{confirmError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmToggle}
                disabled={confirmLoading}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
              >
                {confirmLoading
                  ? 'Menyimpan...'
                  : confirmTarget.action === 'present'
                    ? '✅ Ya, hadir'
                    : '🗑️ Ya, batalkan'}
              </button>
              <button
                onClick={() => {
                  setConfirmTarget(null)
                  setConfirmError('')
                }}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-text/[0.05] transition disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-xl p-4 w-full max-w-sm space-y-3 border border-border">
            <h3 className="font-medium text-sm">📝 Alasan Izin — {noteModal.memberName}</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Tulis alasan izin (opsional)..."
              rows={3}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
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
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-text/[0.05] transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature viewer modal */}
      {sigViewer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-xl p-4 w-full max-w-sm space-y-3 border border-border">
            <h3 className="font-medium text-sm">✍️ Tanda tangan — {sigViewer.memberName}</h3>
            {sigLoading ? (
              <p className="text-text-muted text-sm text-center py-8">Memuat...</p>
            ) : sigError ? (
              <p className="text-danger text-sm">{sigError}</p>
            ) : sigUrl ? (
              <img
                src={sigUrl}
                alt="Tanda tangan"
                className="w-full bg-white rounded-lg object-contain"
              />
            ) : null}
            <button
              onClick={() => { setSigViewer(null); setSigUrl(null); setSigError('') }}
              className="w-full px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-text/[0.05] transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
