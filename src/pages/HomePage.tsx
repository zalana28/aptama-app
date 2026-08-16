import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode, FileText, Calendar, Users, Sparkles, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { useMembers } from '../hooks/useMembers'
import { useEvents } from '../hooks/useEvents'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

function formatCountdown(dateStr: string): string {
  const target = new Date(dateStr + 'T00:00:00').getTime()
  const now = new Date().setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hari ini!'
  if (diffDays === 1) return 'Besok'
  if (diffDays < 0) return 'Selesai'
  return `${diffDays} hari lagi`
}

export function HomePage() {
  const { data: members = [] } = useMembers()
  const { data: events = [] } = useEvents()

  const { data: activeQr } = useQuery({
    queryKey: ['active-qr-events'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_active_checkin_qr')
      const row = Array.isArray(data) ? data[0] : data
      return row ?? null
    },
    staleTime: 5000,
  })

  // Find upcoming event
  const upcomingEvent = events.find((e) => {
    const evDate = new Date(e.date + 'T23:59:59').getTime()
    return evDate >= Date.now()
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 py-4"
    >
      {/* Hero Welcome Card */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-bg-card to-secondary/10 p-5 backdrop-blur-sm shadow-sm"
      >
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-semibold tracking-wide">
            <Sparkles size={13} className="animate-spin-slow" />
            <span>APTAMA KEPEMUDAAN</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">
            {getGreeting()}, <span className="gradient-text">Pemuda!</span>
          </h1>
          <p className="text-xs text-text-muted max-w-[280px]">
            Sistem presensi digital kegiatan gotong royong & selapanan pemuda.
          </p>
        </div>

        {/* Floating Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2.5 bg-bg-elevated/70 backdrop-blur-md rounded-2xl p-2.5 border border-border">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Total Anggota</p>
              <p className="text-sm font-bold text-text">{members.length || '50'} Orang</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-bg-elevated/70 backdrop-blur-md rounded-2xl p-2.5 border border-border">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary/10 text-secondary">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Kegiatan</p>
              <p className="text-sm font-bold text-text">{events.length} Terjadwal</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Check-in Banner (If live) */}
      {activeQr && (
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Link
            to={`/scan?token=${activeQr.checkin_token}`}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/25 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                  Absensi Sedang Dibuka!
                </p>
                <p className="font-bold text-sm text-white">{activeQr.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <span>Absen</span>
              <ChevronRight size={14} />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Upcoming Event Preview (If any) */}
      {upcomingEvent && !activeQr && (
        <motion.div variants={item}>
          <Link
            to="/kegiatan"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-bg-card hover:border-primary/40 transition shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Clock size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                    {formatCountdown(upcomingEvent.date)}
                  </span>
                  <span className="text-xs text-text-muted truncate">{upcomingEvent.date}</span>
                </div>
                <p className="font-semibold text-sm text-text truncate mt-0.5">
                  {upcomingEvent.title}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0 ml-2" />
          </Link>
        </motion.div>
      )}

      {/* Main Navigation Actions */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
          Menu Utama
        </h2>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/scan-qr"
            className="flex items-start gap-3.5 bg-bg-card border border-border rounded-2xl p-4 hover:border-primary/50 transition shadow-sm"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary shrink-0">
              <QrCode size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-text">Scan QR / Buka Absen</p>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Absen kehadiran cepat dengan tanda tangan digital langsung dari HP.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/izin"
            className="flex items-start gap-3.5 bg-bg-card border border-border rounded-2xl p-4 hover:border-secondary/50 transition shadow-sm"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/15 text-secondary shrink-0">
              <FileText size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-text">Ajukan Izin</p>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Berhalangan hadir? Kirim alasan izin secara privat ke ketua.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/kegiatan"
            className="flex items-start gap-3.5 bg-bg-card border border-border rounded-2xl p-4 hover:border-success/50 transition shadow-sm"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-success/15 text-success shrink-0">
              <Calendar size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-text">Jadwal Kegiatan</p>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Lihat jadwal selapanan dan hitung mundur kegiatan berikutnya.
              </p>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Step by step attendance info */}
      <motion.div variants={item} className="bg-bg-card border border-border rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-2.5 flex items-center gap-1.5">
          <CheckCircle2 size={16} className="text-primary" />
          <span>Cara Absen Praktis</span>
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="p-2 rounded-xl bg-bg-elevated border border-border/50">
            <span className="inline-block h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold leading-5 mb-1">
              1
            </span>
            <p className="text-[11px] font-medium text-text">Buka Absen</p>
            <p className="text-[10px] text-text-muted mt-0.5">Scan QR / Link</p>
          </div>
          <div className="p-2 rounded-xl bg-bg-elevated border border-border/50">
            <span className="inline-block h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold leading-5 mb-1">
              2
            </span>
            <p className="text-[11px] font-medium text-text">Pilih Nama</p>
            <p className="text-[10px] text-text-muted mt-0.5">Cari namamu</p>
          </div>
          <div className="p-2 rounded-xl bg-bg-elevated border border-border/50">
            <span className="inline-block h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold leading-5 mb-1">
              3
            </span>
            <p className="text-[11px] font-medium text-text">Tanda Tangan</p>
            <p className="text-[10px] text-text-muted mt-0.5">Kirim bukti</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
