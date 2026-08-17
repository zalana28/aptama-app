import { useState, useEffect, useMemo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode,
  Copy,
  Check,
  Printer,
  Sparkles,
  Clock,
  StopCircle,
  AlertTriangle,
  FileSignature,
  X,
  Search,
} from 'lucide-react'
import { useEvents, useCloseCheckinQr } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'
import { useAdmin } from '../hooks/useAdmin'
import { useAttendanceByEvent, useAdminAttendanceByEvent } from '../hooks/useAttendance'
import { getAdminToken } from '../lib/admin'
import { supabase } from '../lib/supabase'
import type { AdminAttendanceRow, Member } from '../types'

interface ActiveQr {
  event_id: string
  title: string
  date: string
  time?: string
  location?: string
  checkin_token: string
  checkin_expires_at: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (name[0] ?? '?').toUpperCase()
}

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return '-'
  return (
    new Date(isoStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'
  )
}

export function GenerateQR() {
  const qc = useQueryClient()
  const { data: events = [] } = useEvents()
  const { data: members = [] } = useMembers()
  const { isAdmin } = useAdmin()
  const closeQr = useCloseCheckinQr()

  const [selectedEvent, setSelectedEvent] = useState('')
  const [duration, setDuration] = useState(120)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [sigModal, setSigModal] = useState<{ name: string; url: string } | null>(null)
  const [liveNewIds, setLiveNewIds] = useState<Set<string>>(new Set())
  const [filterTab, setFilterTab] = useState<'hadir' | 'izin' | 'alfa' | 'all'>('hadir')
  const [search, setSearch] = useState('')

  // Query if there is already an active QR session
  const { data: activeQrEvent } = useQuery({
    queryKey: ['active-qr-events'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_checkin_qr')
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row ?? null) as ActiveQr | null
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // Auto-set selected event if there's an active QR
  useEffect(() => {
    if (activeQrEvent?.event_id && !selectedEvent) {
      setSelectedEvent(activeQrEvent.event_id)
    }
  }, [activeQrEvent, selectedEvent])

  const activeEventId = activeQrEvent?.event_id || selectedEvent
  const currentEvent = events.find((e) => e.id === activeEventId)

  // Use reliable attendance query hooks with session token / public view fallback
  const { data: publicRows = [] } = useAttendanceByEvent(activeEventId)
  const { data: adminRows = [] } = useAdminAttendanceByEvent(activeEventId)
  const attendanceRows = (isAdmin ? adminRows : publicRows) as AdminAttendanceRow[]

  // Supabase Realtime WebSocket listener
  useEffect(() => {
    if (!activeEventId) return

    const channel = supabase
      .channel(`generate-qr-live-${activeEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `event_id=eq.${activeEventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRow = payload.new as { member_id?: string }
            if (newRow?.member_id) {
              setLiveNewIds((prev) => new Set([...prev, newRow.member_id!]))
              setTimeout(() => {
                setLiveNewIds((prev) => {
                  const next = new Set(prev)
                  next.delete(newRow.member_id!)
                  return next
                })
              }, 6000)
            }
          }
          qc.invalidateQueries({ queryKey: ['attendance', activeEventId] })
          qc.invalidateQueries({ queryKey: ['admin_attendance', activeEventId] })
          qc.refetchQueries({ queryKey: ['admin_attendance', activeEventId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeEventId, qc])


  // Attendance map by member ID
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AdminAttendanceRow>()
    attendanceRows.forEach((r) => map.set(r.member_id, r))
    return map
  }, [attendanceRows])

  // Breakdown lists
  const { hadirList, izinList, alfaList } = useMemo(() => {
    const hadir: { member: Member; row?: AdminAttendanceRow }[] = []
    const izin: { member: Member; row?: AdminAttendanceRow }[] = []
    const alfa: { member: Member; row?: AdminAttendanceRow }[] = []

    members.forEach((m) => {
      const row = attendanceMap.get(m.id)
      if (row?.status === 'hadir') {
        hadir.push({ member: m, row })
      } else if (row?.status === 'izin') {
        izin.push({ member: m, row })
      } else {
        alfa.push({ member: m, row })
      }
    })

    return { hadirList: hadir, izinList: izin, alfaList: alfa }
  }, [members, attendanceMap])

  const totalMembers = members.length || 50
  const hadirCount = hadirList.length
  const hadirPct = Math.round((hadirCount / totalMembers) * 100)

  // Current display list based on tab & search
  const displayList = useMemo(() => {
    let source =
      filterTab === 'hadir'
        ? hadirList
        : filterTab === 'izin'
        ? izinList
        : filterTab === 'alfa'
        ? alfaList
        : [...hadirList, ...izinList, ...alfaList]

    const q = search.trim().toLowerCase()
    if (!q) return source

    return source.filter(
      (item) =>
        item.member.name.toLowerCase().includes(q) ||
        (item.member.group ?? '').toLowerCase().includes(q) ||
        (item.row?.note ?? '').toLowerCase().includes(q)
    )
  }, [filterTab, hadirList, izinList, alfaList, search])

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

    await qc.invalidateQueries({ queryKey: ['events'] })
    await qc.invalidateQueries({ queryKey: ['active-qr-events'] })
    await qc.refetchQueries({ queryKey: ['active-qr-events'] })
    qc.refetchQueries({ queryKey: ['admin_attendance', selectedEvent] })
  }

  async function handleCloseQr() {
    if (!activeEventId) return
    setError('')
    try {
      await closeQr.mutateAsync(activeEventId)
      setSelectedEvent('')
      setShowCloseModal(false)
      await qc.invalidateQueries({ queryKey: ['active-qr-events'] })
      qc.setQueryData(['active-qr-events'], null)
      await qc.refetchQueries({ queryKey: ['active-qr-events'] })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menutup sesi QR.')
    }
  }

  function handleCopy() {
    if (!activeQrEvent) return
    const url = `${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function viewSignature(row?: AdminAttendanceRow, memberName?: string) {
    if (!row?.signature_path) return
    try {
      const { data, error } = await supabase.rpc('admin_get_signature_url', {
        p_token: getAdminToken(),
        p_signature_path: row.signature_path,
      })
      if (error || !data) {
        alert('Gagal memuat tanda tangan.')
        return
      }
      setSigModal({ name: memberName ?? 'Anggota', url: data })
    } catch {
      alert('Gagal memuat tanda tangan.')
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Halaman ini khusus ketua.</p>
      </div>
    )
  }

  const qrUrl = activeQrEvent
    ? `${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`
    : ''

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <QrCode size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Sesi QR Presensi</h1>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          Aktifkan QR absensi, pantau siapa saja yang hadir realtime, dan tutup sesi kapan saja.
        </p>
      </div>

      {/* If Active QR exists */}
      {activeQrEvent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          {/* Active QR Card */}
          <div className="bg-white text-gray-900 rounded-3xl p-6 text-center space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SESI PRESENSI AKTIF</span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                {activeQrEvent.checkin_expires_at
                  ? `s/d ${new Date(activeQrEvent.checkin_expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                  : ''}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 inline-block shadow-inner">
              <QRCodeSVG value={qrUrl} size={220} className="mx-auto" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-extrabold text-gray-900">{activeQrEvent.title}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Clock size={13} />
                <span>
                  Berlaku sampai: {new Date(activeQrEvent.checkin_expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </p>
            </div>

            {/* Actions: Copy Link, Print, Close Session */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-200 transition active:scale-95"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Link Tersalin!' : 'Salin Link Absen'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-black transition active:scale-95 shadow-sm"
                >
                  <Printer size={14} />
                  <span>Cetak QR</span>
                </button>
              </div>

              {/* Red Button: Tutup Sesi QR Manual */}
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-danger text-white py-3 px-4 rounded-xl text-xs font-bold hover:bg-red-600 transition shadow-md shadow-danger/20 active:scale-98"
              >
                <StopCircle size={16} />
                <span>🛑 Tutup / Akhiri Sesi QR Sekarang</span>
              </button>
            </div>
          </div>

          {/* Live Attendance Monitor Widget */}
          <div className="bg-bg-card rounded-3xl border border-primary/30 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
                <h3 className="font-bold text-sm text-text">Live Monitor Presensi</h3>
              </div>
              <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                {hadirCount} Hadir ({hadirPct}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-bg-elevated overflow-hidden border border-border">
                <div
                  style={{ width: `${hadirPct}%` }}
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                />
              </div>
              <p className="text-[11px] text-text-muted text-right">
                {hadirCount} dari {totalMembers} Pemuda telah hadir
              </p>
            </div>

            {/* Interactive Status Filter Tabs */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setFilterTab('hadir')}
                className={`rounded-xl py-2 px-1 text-center transition border ${
                  filterTab === 'hadir'
                    ? 'bg-success/25 border-success text-success font-bold shadow-xs'
                    : 'bg-success/5 border-success/20 text-success/80 hover:bg-success/10'
                }`}
              >
                <div className="text-xs">{hadirList.length}</div>
                <div className="text-[10px] truncate">✅ Hadir</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('izin')}
                className={`rounded-xl py-2 px-1 text-center transition border ${
                  filterTab === 'izin'
                    ? 'bg-warning/25 border-warning text-warning font-bold shadow-xs'
                    : 'bg-warning/5 border-warning/20 text-warning/80 hover:bg-warning/10'
                }`}
              >
                <div className="text-xs">{izinList.length}</div>
                <div className="text-[10px] truncate">📝 Izin</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('alfa')}
                className={`rounded-xl py-2 px-1 text-center transition border ${
                  filterTab === 'alfa'
                    ? 'bg-danger/25 border-danger text-danger font-bold shadow-xs'
                    : 'bg-danger/5 border-danger/20 text-danger/80 hover:bg-danger/10'
                }`}
              >
                <div className="text-xs">{alfaList.length}</div>
                <div className="text-[10px] truncate">❌ Belum</div>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`rounded-xl py-2 px-1 text-center transition border ${
                  filterTab === 'all'
                    ? 'bg-primary/25 border-primary text-text font-bold shadow-xs'
                    : 'bg-bg-elevated border-border text-text-muted hover:border-primary/30'
                }`}
              >
                <div className="text-xs">{totalMembers}</div>
                <div className="text-[10px] truncate">Semua</div>
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Cari nama pemuda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Realtime Attendance Feed */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {displayList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-2xl bg-bg-elevated/40">
                  <p className="text-xs text-text-muted">
                    {search ? 'Tidak ada nama yang cocok.' : 'Belum ada data pada kategori ini.'}
                  </p>
                </div>
              ) : (
                displayList.map((item, idx) => {
                  const isHadir = item.row?.status === 'hadir'
                  const isIzin = item.row?.status === 'izin'
                  const isNew = liveNewIds.has(item.member.id)

                  return (
                    <motion.div
                      key={item.member.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl p-2.5 flex items-center justify-between border transition shadow-xs ${
                        isNew
                          ? 'bg-success/20 border-success ring-2 ring-success animate-pulse'
                          : isHadir
                          ? 'bg-success/5 border-success/30'
                          : isIzin
                          ? 'bg-warning/5 border-warning/30'
                          : 'bg-bg-elevated/60 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-bold text-text-muted w-4 text-center">
                          {idx + 1}.
                        </span>
                        <div
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
                            isHadir
                              ? 'bg-success/20 text-success'
                              : isIzin
                              ? 'bg-warning/20 text-warning'
                              : 'bg-text/10 text-text-muted'
                          }`}
                        >
                          {getInitials(item.member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-text truncate">
                            {item.member.name}
                          </p>
                          <p className="text-[10px] text-text-muted flex items-center gap-1 truncate">
                            {isHadir ? (
                              <span>⏱ {formatTime(item.row?.check_in_at ?? item.row?.submitted_at)}</span>
                            ) : isIzin ? (
                              <span className="text-warning">📝 Izin {item.row?.note ? `(${item.row.note})` : ''}</span>
                            ) : (
                              <span>Belum Absen</span>
                            )}
                            {item.member.group && <span>· {item.member.group}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Right Action / Badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isHadir && item.row?.signature_path && (
                          <button
                            type="button"
                            onClick={() => viewSignature(item.row, item.member.name)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-1 rounded-lg"
                          >
                            <FileSignature size={12} />
                            <span>Lihat TTD</span>
                          </button>
                        )}
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            isHadir
                              ? 'bg-success text-white'
                              : isIzin
                              ? 'bg-warning text-bg'
                              : 'bg-text/10 text-text-muted'
                          }`}
                        >
                          {isHadir ? 'Hadir' : isIzin ? 'Izin' : 'Belum'}
                        </span>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* Generator Form when no QR is active */
        <div className="bg-bg-card rounded-3xl p-5 border border-border space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1 block">Pilih Kegiatan *</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="">— Pilih kegiatan —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1 block">Durasi Aktif QR</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary shadow-sm"
            >
              <option value={30}>⏱ 30 Menit</option>
              <option value={60}>⏱ 1 Jam</option>
              <option value={120}>⏱ 2 Jam (Direkomendasikan)</option>
              <option value={240}>⏱ 4 Jam</option>
              <option value={480}>⏱ 8 Jam</option>
            </select>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-xs font-medium">⚠️ {error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedEvent}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20"
          >
            <Sparkles size={16} />
            <span>{loading ? 'Membuat QR...' : 'Aktifkan & Tampilkan QR Code'}</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal: Tutup Sesi QR */}
      <AnimatePresence>
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-bg-card border border-danger/30 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-danger/15 text-danger">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text">Tutup Sesi QR?</h3>
                  <p className="text-xs text-text-muted">Kegiatan: {currentEvent?.title}</p>
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Sesi presensi akan langsung diakhiri. Anggota tidak akan bisa scan atau kirim tanda tangan lagi setelah ini.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-muted hover:text-text transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCloseQr}
                  disabled={closeQr.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-danger text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition shadow-md shadow-danger/20"
                >
                  <StopCircle size={14} />
                  <span>{closeQr.isPending ? 'Menutup...' : 'Ya, Tutup Sekarang'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Signature Preview Modal */}
      <AnimatePresence>
        {sigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs rounded-3xl bg-bg-card border border-border p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-text">Tanda Tangan Digital</h3>
                  <p className="text-xs text-text-muted">{sigModal.name}</p>
                </div>
                <button
                  onClick={() => setSigModal(null)}
                  className="p-1 rounded-lg text-text-muted hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-white rounded-2xl p-3 border border-border shadow-inner">
                <img
                  src={sigModal.url}
                  alt={`Tanda tangan ${sigModal.name}`}
                  className="max-h-40 w-full object-contain mx-auto"
                />
              </div>

              <button
                type="button"
                onClick={() => setSigModal(null)}
                className="w-full py-2 bg-bg-elevated border border-border text-xs font-semibold rounded-xl text-text hover:bg-bg-card-hover transition"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
