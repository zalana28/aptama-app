import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode, FileText, Calendar, Users, Sparkles, ChevronRight, BarChart3, Clock, CheckCircle2 } from 'lucide-react'
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
      transition: { staggerChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 py-2"
    >
      {/* 1. Sleek Compact Header */}
      <motion.div
        variants={item}
        className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/15 via-bg-card to-secondary/10 p-4 sm:p-5 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold tracking-wider">
            <Sparkles size={12} />
            <span>APTAMA APP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text">
            {getGreeting()}, <span className="gradient-text">Pemuda!</span>
          </h1>
          <p className="text-xs text-text-muted">
            Presensi digital kegiatan gotong royong & selapanan.
          </p>
        </div>

        {/* Inline Stats Chips */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-bg-elevated/80 border border-border px-3 py-1.5 rounded-2xl shadow-xs">
            <Users size={15} className="text-primary" />
            <div className="text-left">
              <p className="text-[9px] text-text-muted leading-tight font-medium">Anggota</p>
              <p className="text-xs font-bold text-text leading-tight">{members.length || '50'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-bg-elevated/80 border border-border px-3 py-1.5 rounded-2xl shadow-xs">
            <Calendar size={15} className="text-secondary" />
            <div className="text-left">
              <p className="text-[9px] text-text-muted leading-tight font-medium">Kegiatan</p>
              <p className="text-xs font-bold text-text leading-tight">{events.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Live Check-in Banner (When QR active) */}
      {activeQr && (
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Link
            to={`/scan?token=${activeQr.checkin_token}`}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/25 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/90">
                  Presensi Sedang Dibuka!
                </p>
                <p className="font-bold text-sm sm:text-base text-white">{activeQr.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white text-primary px-3.5 py-2 rounded-xl shadow-sm shrink-0">
              <span>✍️ Absen Sekarang</span>
              <ChevronRight size={14} />
            </div>
          </Link>
        </motion.div>
      )}

      {/* 3. Modern 2x2 Menu Grid (Mobile: 2 cols, Tablet/Desktop: 4 cols) */}
      <motion.div variants={item} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Menu Utama
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Scan QR */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/scan-qr"
              className="flex flex-col justify-between h-32 sm:h-36 rounded-2xl bg-bg-card border border-border hover:border-primary/50 p-3.5 sm:p-4 transition shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition">
                  <QrCode size={22} />
                </div>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                  Utama
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-text leading-snug">Scan QR</p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">Absen tanda tangan</p>
              </div>
            </Link>
          </motion.div>

          {/* Card 2: Ajukan Izin */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/izin"
              className="flex flex-col justify-between h-32 sm:h-36 rounded-2xl bg-bg-card border border-border hover:border-secondary/50 p-3.5 sm:p-4 transition shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/15 text-secondary group-hover:bg-secondary group-hover:text-bg transition">
                  <FileText size={22} />
                </div>
                <span className="text-[10px] font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">
                  Izin
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-text leading-snug">Ajukan Izin</p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">Konfirmasi absen</p>
              </div>
            </Link>
          </motion.div>

          {/* Card 3: Jadwal Kegiatan */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/kegiatan"
              className="flex flex-col justify-between h-32 sm:h-36 rounded-2xl bg-bg-card border border-border hover:border-success/50 p-3.5 sm:p-4 transition shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success/15 text-success group-hover:bg-success group-hover:text-white transition">
                  <Calendar size={22} />
                </div>
                {upcomingEvent && (
                  <span className="text-[10px] font-bold text-success px-2 py-0.5 rounded-full bg-success/10">
                    {formatCountdown(upcomingEvent.date)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-text leading-snug">Jadwal</p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">Agenda kegiatan</p>
              </div>
            </Link>
          </motion.div>

          {/* Card 4: Rekap Kehadiran */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/rekap"
              className="flex flex-col justify-between h-32 sm:h-36 rounded-2xl bg-bg-card border border-border hover:border-primary/50 p-3.5 sm:p-4 transition shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition">
                  <BarChart3 size={22} />
                </div>
                <span className="text-[10px] font-bold text-text-muted px-2 py-0.5 rounded-full bg-text/[0.06]">
                  Laporan
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-text leading-snug">Rekap Absen</p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">Export & share WA</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* 4. Responsive Bottom Grid (Upcoming Event + Quick Guide side by side on tablet/desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Upcoming Event Card */}
        {upcomingEvent && (
          <motion.div variants={item}>
            <Link
              to="/kegiatan"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-bg-card hover:border-primary/40 transition shadow-xs h-full"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Clock size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                      {formatCountdown(upcomingEvent.date)}
                    </span>
                    <span className="text-xs text-text-muted truncate">{upcomingEvent.date}</span>
                  </div>
                  <p className="font-bold text-sm text-text truncate mt-0.5">
                    {upcomingEvent.title}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0 ml-2" />
            </Link>
          </motion.div>
        )}

        {/* Quick Guide Card */}
        <motion.div variants={item} className="bg-bg-card border border-border rounded-2xl p-3.5 shadow-xs flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={15} className="text-primary" />
            <h3 className="font-bold text-xs text-text">Petunjuk Presensi 3 Langkah</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 rounded-xl bg-bg-elevated/70 border border-border/50">
              <p className="text-[10px] font-bold text-primary">1. Buka</p>
              <p className="text-[9px] text-text-muted truncate">Scan / Link</p>
            </div>
            <div className="p-1.5 rounded-xl bg-bg-elevated/70 border border-border/50">
              <p className="text-[10px] font-bold text-primary">2. Pilih</p>
              <p className="text-[9px] text-text-muted truncate">Nama Kamu</p>
            </div>
            <div className="p-1.5 rounded-xl bg-bg-elevated/70 border border-border/50">
              <p className="text-[10px] font-bold text-primary">3. TTD</p>
              <p className="text-[9px] text-text-muted truncate">Kirim Bukti</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
