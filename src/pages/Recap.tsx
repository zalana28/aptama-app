import { useState } from 'react'
import { useMembers } from '../hooks/useMembers'
import { useEvents } from '../hooks/useEvents'
import { useAttendanceByEvent, useAdminAttendanceByEvent } from '../hooks/useAttendance'
import { useAdmin } from '../hooks/useAdmin'
import type { AttendanceStatus, Member, Attendance } from '../types'

type IzinEntry = { member: Member; note?: string }
type StatusEntry = { id: string; name: string; group?: string; note?: string }

function buatTeksRekap(
  judul: string,
  tanggal: string,
  hadir: Member[],
  izin: IzinEntry[],
  alfa: Member[],
) {
  const daftar = (arr: Member[]) =>
    arr.length ? arr.map((m, i) => `${i + 1}. ${m.name}`).join('\n') : '-'
  const daftarIzin = (arr: IzinEntry[]) =>
    arr.length
      ? arr.map((x, i) => `${i + 1}. ${x.member.name}${x.note ? ` — ${x.note}` : ''}`).join('\n')
      : '-'
  return `*REKAP ABSENSI APTAMA*
${judul} - ${tanggal}

✅ HADIR (${hadir.length})
${daftar(hadir)}

📝 IZIN (${izin.length})
${daftarIzin(izin)}

❌ TIDAK HADIR (${alfa.length})
${daftar(alfa)}`
}

function shareKeWhatsApp(teks: string) {
  const url = 'https://wa.me/?text=' + encodeURIComponent(teks)
  window.open(url, '_blank')
}

function exportCsv(baris: { name: string; group: string; status: string }[]) {
  const isi =
    'Nama,RT/RW,Status\n' +
    baris.map((r) => `"${r.name}","${r.group}","${r.status}"`).join('\n')
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'rekap-aptama.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function Recap() {
  const { data: events } = useEvents()
  const { data: members } = useMembers()
  const { isAdmin } = useAdmin()
  const [selectedEvent, setSelectedEvent] = useState('')
  // Ketua: query admin RPC yang include `note`. Non-ketua: view publik tanpa note.
  const { data: publicRows } = useAttendanceByEvent(selectedEvent)
  const { data: adminRows } = useAdminAttendanceByEvent(selectedEvent)
  const attendanceRows = isAdmin ? adminRows : publicRows

  const selectedEv = events?.find((e) => e.id === selectedEvent)

  // Map member_id -> status & note
  const statusMap = new Map<string, AttendanceStatus>()
  const noteMap = new Map<string, string>()
  attendanceRows?.forEach((r: Attendance) => {
    statusMap.set(r.member_id, r.status as AttendanceStatus)
    if (r.note) noteMap.set(r.member_id, r.note)
  })

  const hadir = (members ?? []).filter((m) => statusMap.get(m.id) === 'hadir')
  const izin: IzinEntry[] = (members ?? [])
    .filter((m) => statusMap.get(m.id) === 'izin')
    .map((m) => ({ member: m, note: noteMap.get(m.id) }))
  const alfa = (members ?? []).filter((m) => !statusMap.has(m.id))
  const total = members?.length ?? 0

  const hadirEntries: StatusEntry[] = hadir.map((m) => ({ id: m.id, name: m.name, group: m.group }))
  const izinEntries: StatusEntry[] = izin.map((x) => ({
    id: x.member.id,
    name: x.member.name,
    group: x.member.group,
    note: x.note,
  }))
  const alfaEntries: StatusEntry[] = alfa.map((m) => ({ id: m.id, name: m.name, group: m.group }))

  function handleShare() {
    if (!selectedEv) return
    const teks = buatTeksRekap(selectedEv.title, selectedEv.date, hadir, izin, alfa)
    shareKeWhatsApp(teks)
  }

  function handleExport() {
    if (!members) return
    const baris = members.map((m) => ({
      name: m.name,
      group: m.group ?? '-',
      status: statusMap.get(m.id) ?? 'alfa',
    }))
    exportCsv(baris)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">📊 Rekap</h1>

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

      {!selectedEvent ? (
        <p className="text-text-muted text-sm text-center py-8">
          Pilih kegiatan untuk melihat rekap
        </p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-bg-card border border-white/10 rounded-xl p-3 text-center">
              <div className="text-lg font-bold">{total}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-success">{hadir.length}</div>
              <div className="text-xs text-text-muted">Hadir</div>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-warning">{izin.length}</div>
              <div className="text-xs text-text-muted">Izin</div>
            </div>
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-danger">{alfa.length}</div>
              <div className="text-xs text-text-muted">Alfa</div>
            </div>
          </div>

          {/* Persentase */}
          {total > 0 && (
            <div className="bg-bg-card rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                <span>Kehadiran</span>
                <span className="font-medium text-text">
                  {Math.round((hadir.length / total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-success rounded-full h-2 transition-all"
                  style={{ width: `${(hadir.length / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Detail per status */}
          <div className="space-y-3">
            <StatusList title="✅ Hadir" items={hadirEntries} color="text-success" />
            <StatusList title="📝 Izin" items={izinEntries} color="text-warning" />
            <StatusList title="❌ Tidak Hadir" items={alfaEntries} color="text-danger" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleShare}
              className="flex-1 bg-[#25D366] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1eba57] transition"
            >
              📱 Share ke WhatsApp
            </button>
            <button
              onClick={handleExport}
              className="flex-1 bg-secondary text-bg px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary-light transition"
            >
              📥 Unduh CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StatusList({
  title,
  items,
  color,
}: {
  title: string
  items: StatusEntry[]
  color: string
}) {
  if (items.length === 0) return null
  return (
    <div className="bg-bg-card rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className={`text-sm font-medium ${color}`}>{title}</span>
        <span className="text-xs text-text-muted">{items.length} orang</span>
      </div>
      <div className="divide-y divide-white/5">
        {items.map((entry, i) => (
          <div key={entry.id} className="px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-text-muted w-5 text-right">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{entry.name}</p>
              {entry.group && <p className="text-xs text-text-muted truncate">{entry.group}</p>}
              {entry.note && (
                <p className="text-xs text-text-muted truncate mt-0.5" title={entry.note}>
                  📝 {entry.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
