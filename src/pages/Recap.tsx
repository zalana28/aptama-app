import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  Search,
  X,
  Share2,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
} from 'lucide-react'
import { useMembers } from '../hooks/useMembers'
import { useEvents } from '../hooks/useEvents'
import { useAttendanceByEvent, useAdminAttendanceByEvent } from '../hooks/useAttendance'
import { useAdmin } from '../hooks/useAdmin'
import type { AttendanceStatus, Member, Attendance } from '../types'

type IzinEntry = { member: Member; note?: string }
type StatusEntry = { id: string; name: string; group?: string; note?: string; status: AttendanceStatus }

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (name[0] ?? '?').toUpperCase()
}

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
      ? arr.map((x, i) => `${i + 1}. ${x.member.name}${x.note ? ` — (${x.note})` : ''}`).join('\n')
      : '-'
  return `*📊 REKAP ABSENSI APTAMA*
*Kegiatan:* ${judul}
*Tanggal:* ${tanggal}

✅ *HADIR (${hadir.length})*
${daftar(hadir)}

📝 *IZIN (${izin.length})*
${daftarIzin(izin)}

❌ *BELUM HADIR (${alfa.length})*
${daftar(alfa)}

_Dicatat via APTAMA Digital App_`
}

function shareKeWhatsApp(teks: string) {
  const url = 'https://wa.me/?text=' + encodeURIComponent(teks)
  window.open(url, '_blank')
}

function exportCsv(baris: { name: string; group: string; status: string }[], judul: string) {
  const isi =
    'Nama,RT/RW,Status\n' +
    baris.map((r) => `"${r.name}","${r.group}","${r.status}"`).join('\n')
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rekap-${judul.toLowerCase().replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportExcel(
  judul: string,
  tanggal: string,
  baris: { name: string; group: string; status: string }[]
) {
  // Dynamic code-splitting: loads xlsx on demand (~350 kB saved from initial bundle)
  const XLSX = await import('xlsx')
  const rows = baris.map((r, i) => ({
    No: i + 1,
    Nama: r.name,
    'RT/RW / Divisi': r.group,
    Status: r.status.toUpperCase(),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi')
  XLSX.writeFile(wb, `rekap-${judul.toLowerCase().replace(/\s+/g, '-')}-${tanggal}.xlsx`)
}

async function exportPdf(
  judul: string,
  tanggal: string,
  baris: { name: string; group: string; status: string }[]
) {
  // Dynamic code-splitting: loads jspdf and autotable on demand (~360 kB saved from initial bundle)
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(15)
  doc.setTextColor(27, 122, 61)
  doc.text(`REKAP ABSENSI APTAMA`, 14, 16)
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text(`Kegiatan: ${judul} | Tanggal: ${tanggal}`, 14, 23)

  autoTable(doc, {
    startY: 28,
    head: [['No', 'Nama Lengkap', 'RT/RW / Divisi', 'Status Kehadiran']],
    body: baris.map((r, i) => [i + 1, r.name, r.group, r.status.toUpperCase()]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [27, 122, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 245] },
  })

  doc.save(`rekap-${judul.toLowerCase().replace(/\s+/g, '-')}-${tanggal}.pdf`)
}

export function Recap() {
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: members = [], isLoading: membersLoading } = useMembers()
  const { isAdmin } = useAdmin()

  const [selectedEvent, setSelectedEvent] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'izin' | 'alfa'>('all')
  const [search, setSearch] = useState('')
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null)

  // Auto-select latest event if not selected
  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0].id)
    }
  }, [events, selectedEvent])

  const { data: publicRows = [] } = useAttendanceByEvent(selectedEvent)
  const { data: adminRows = [] } = useAdminAttendanceByEvent(selectedEvent)
  const attendanceRows = isAdmin ? adminRows : publicRows

  const selectedEv = useMemo(() => events.find((e) => e.id === selectedEvent), [events, selectedEvent])

  const { statusMap, hadir, izin, alfa, total, allEntries } = useMemo(() => {
    const sm = new Map<string, AttendanceStatus>()
    const nm = new Map<string, string>()
    attendanceRows.forEach((r: Attendance) => {
      sm.set(r.member_id, r.status as AttendanceStatus)
      if (r.note) nm.set(r.member_id, r.note)
    })

    const h = members.filter((m) => sm.get(m.id) === 'hadir')
    const i: IzinEntry[] = members
      .filter((m) => sm.get(m.id) === 'izin')
      .map((m) => ({ member: m, note: nm.get(m.id) }))
    const a = members.filter((m) => !sm.has(m.id))
    const tot = members.length

    const entries: StatusEntry[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      group: m.group,
      note: nm.get(m.id),
      status: sm.get(m.id) ?? 'alfa',
    }))

    return {
      statusMap: sm,
      hadir: h,
      izin: i,
      alfa: a,
      total: tot,
      allEntries: entries,
    }
  }, [attendanceRows, members])

  const hadirPct = total > 0 ? Math.round((hadir.length / total) * 100) : 0
  const izinPct = total > 0 ? Math.round((izin.length / total) * 100) : 0
  const alfaPct = total > 0 ? Math.max(0, 100 - hadirPct - izinPct) : 0

  // Filtered members list based on status tab & search query
  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        (item.group ?? '').toLowerCase().includes(q) ||
        (item.note ?? '').toLowerCase().includes(q)
      )
    })
  }, [allEntries, filterStatus, search])

  function handleShare() {
    if (!selectedEv) return
    const teks = buatTeksRekap(selectedEv.title, selectedEv.date, hadir, izin, alfa)
    shareKeWhatsApp(teks)
  }

  function getExportRows() {
    return members.map((m) => ({
      name: m.name,
      group: m.group ?? '-',
      status: statusMap.get(m.id) ?? 'alfa',
    }))
  }

  function handleExportCsv() {
    if (!selectedEv) return
    exportCsv(getExportRows(), selectedEv.title)
  }

  async function handleExportExcel() {
    if (!selectedEv || exportingType) return
    try {
      setExportingType('excel')
      await exportExcel(selectedEv.title, selectedEv.date, getExportRows())
    } finally {
      setExportingType(null)
    }
  }

  async function handleExportPdf() {
    if (!selectedEv || exportingType) return
    try {
      setExportingType('pdf')
      await exportPdf(selectedEv.title, selectedEv.date, getExportRows())
    } finally {
      setExportingType(null)
    }
  }

  // Shimmer Skeleton Loading while data is loading
  if (eventsLoading || membersLoading) {
    return (
      <div className="space-y-4 py-3 animate-fade-in">
        <div className="space-y-1.5">
          <div className="h-6 w-40 bg-bg-card rounded-xl animate-shimmer border border-border/50" />
          <div className="h-4 w-60 bg-bg-card/60 rounded-lg animate-shimmer border border-border/40" />
        </div>
        <div className="h-20 bg-bg-card rounded-2xl animate-shimmer border border-border/50" />
        <div className="h-36 bg-bg-card rounded-2xl animate-shimmer border border-border/50" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-bg-card rounded-2xl animate-shimmer border border-border/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            <span>Rekap Absensi</span>
          </h1>
          <p className="text-xs text-text-muted">
            Laporan kehadiran & statistik kegiatan pemuda APTAMA
          </p>
        </div>
      </div>

      {/* Event Selector Dropdown */}
      <div className="bg-bg-card border border-border rounded-2xl p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-text-muted flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" />
            <span>Pilih Kegiatan:</span>
          </label>
          {selectedEv && (
            <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
              {selectedEv.date}
            </span>
          )}
        </div>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text focus:outline-none focus:border-primary shadow-xs"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} — {ev.date}
            </option>
          ))}
        </select>
      </div>

      {!selectedEvent ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-bg-card/50">
          <p className="text-text-muted text-sm">Belum ada data kegiatan untuk direkap.</p>
        </div>
      ) : (
        <motion.div
          key={selectedEvent}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3.5"
        >
          {/* Progress Percentage Gauge */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text">
                Tingkat Kehadiran: <span className="text-primary font-extrabold">{hadirPct}%</span>
              </span>
              <span className="text-text-muted">
                {hadir.length} dari {total} Pemuda
              </span>
            </div>

            {/* Segmented multi-color bar */}
            <div className="h-3 w-full rounded-full bg-bg-elevated overflow-hidden flex border border-border/60">
              <div
                style={{ width: `${hadirPct}%` }}
                className="bg-success transition-all duration-500"
                title={`Hadir: ${hadir.length}`}
              />
              <div
                style={{ width: `${izinPct}%` }}
                className="bg-warning transition-all duration-500"
                title={`Izin: ${izin.length}`}
              />
              <div
                style={{ width: `${alfaPct}%` }}
                className="bg-danger/50 transition-all duration-500"
                title={`Belum Hadir: ${alfa.length}`}
              />
            </div>

            {/* 4 Interactive Summary Badges */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`rounded-xl p-2 text-center transition border ${
                  filterStatus === 'all'
                    ? 'bg-primary/20 border-primary shadow-xs'
                    : 'bg-bg-elevated/70 border-border hover:border-primary/40'
                }`}
              >
                <div className="text-sm font-bold text-text">{total}</div>
                <div className="text-[10px] text-text-muted truncate">Total</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('hadir')}
                className={`rounded-xl p-2 text-center transition border ${
                  filterStatus === 'hadir'
                    ? 'bg-success/25 border-success shadow-xs'
                    : 'bg-success/10 border-success/30 hover:bg-success/15'
                }`}
              >
                <div className="text-sm font-bold text-success">{hadir.length}</div>
                <div className="text-[10px] text-success truncate">Hadir</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('izin')}
                className={`rounded-xl p-2 text-center transition border ${
                  filterStatus === 'izin'
                    ? 'bg-warning/25 border-warning shadow-xs'
                    : 'bg-warning/10 border-warning/30 hover:bg-warning/15'
                }`}
              >
                <div className="text-sm font-bold text-warning">{izin.length}</div>
                <div className="text-[10px] text-warning truncate">Izin</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('alfa')}
                className={`rounded-xl p-2 text-center transition border ${
                  filterStatus === 'alfa'
                    ? 'bg-danger/25 border-danger shadow-xs'
                    : 'bg-danger/10 border-danger/30 hover:bg-danger/15'
                }`}
              >
                <div className="text-sm font-bold text-danger">{alfa.length}</div>
                <div className="text-[10px] text-danger truncate">Belum Hadir</div>
              </button>
            </div>
          </div>

          {/* Quick Action Export & WhatsApp Share */}
          <div className="space-y-2">
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-2xl text-sm font-bold hover:bg-[#1eba57] transition shadow-md shadow-[#25D366]/20 active:scale-98"
            >
              <Share2 size={17} />
              <span>Bagikan Rekap ke Grup WhatsApp</span>
            </button>

            {/* Export Toolbar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleExportPdf}
                disabled={exportingType !== null}
                className="flex items-center justify-center gap-1.5 bg-bg-card border border-border text-text px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-danger/60 hover:text-danger transition active:scale-95 shadow-xs disabled:opacity-50"
              >
                {exportingType === 'pdf' ? (
                  <Loader2 size={14} className="animate-spin text-danger" />
                ) : (
                  <FileText size={14} className="text-danger" />
                )}
                <span>{exportingType === 'pdf' ? 'Membuat...' : 'Export PDF'}</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingType !== null}
                className="flex items-center justify-center gap-1.5 bg-bg-card border border-border text-text px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-success/60 hover:text-success transition active:scale-95 shadow-xs disabled:opacity-50"
              >
                {exportingType === 'excel' ? (
                  <Loader2 size={14} className="animate-spin text-success" />
                ) : (
                  <FileSpreadsheet size={14} className="text-success" />
                )}
                <span>{exportingType === 'excel' ? 'Membuat...' : 'Export Excel'}</span>
              </button>
              <button
                onClick={handleExportCsv}
                disabled={exportingType !== null}
                className="flex items-center justify-center gap-1.5 bg-bg-card border border-border text-text px-3 py-2.5 rounded-xl text-xs font-semibold hover:border-primary/60 transition active:scale-95 shadow-xs disabled:opacity-50"
              >
                <FileDown size={14} className="text-primary" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Live Search Inside Rekap */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Cari nama pemuda di rekap..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl pl-10 pr-9 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Member Attendance Breakdown List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Daftar Kehadiran ({filteredEntries.length})
              </h3>
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 bg-bg-card rounded-2xl border border-dashed border-border">
                <p className="text-xs text-text-muted">Tidak ada data yang cocok dengan pencarian.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredEntries.map((item, idx) => {
                  const isHadir = item.status === 'hadir'
                  const isIzin = item.status === 'izin'

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.2) }}
                      className={`rounded-2xl p-3 flex items-center justify-between border transition shadow-xs ${
                        isHadir
                          ? 'bg-success/5 border-success/30'
                          : isIzin
                          ? 'bg-warning/5 border-warning/30'
                          : 'bg-bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                            isHadir
                              ? 'bg-success/20 text-success'
                              : isIzin
                              ? 'bg-warning/20 text-warning'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-text truncate">{item.name}</p>
                          <p className="text-[10px] text-text-muted truncate">
                            {item.group ? `${item.group}` : 'Anggota'}
                          </p>
                          {item.note && (
                            <p className="text-[10px] text-warning truncate font-medium mt-0.5">
                              📝 {item.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                          isHadir
                            ? 'bg-success text-white'
                            : isIzin
                            ? 'bg-warning text-bg'
                            : 'bg-danger/20 text-danger'
                        }`}
                      >
                        {isHadir ? '✅ Hadir' : isIzin ? '📝 Izin' : '❌ Belum'}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
