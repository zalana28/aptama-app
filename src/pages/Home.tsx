import { motion } from 'framer-motion'
import { LogIn, FileText, BarChart3, QrCode, KeyRound, Clock, ScanFace, ShieldCheck, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'
import { useAttendanceByEvent } from '../hooks/useAttendance'
import { useAdmin } from '../hooks/useAdmin'

function sisaHari(tanggal: string) {
  return Math.ceil((new Date(tanggal).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function Home() {
  const { data: events } = useEvents()
  const { data: members } = useMembers()
  const { isAdmin } = useAdmin()

  // Kegiatan berikutnya
  const upcoming = events?.filter((e) => sisaHari(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0]
  const hari = upcoming ? sisaHari(upcoming.date) : null

  // Stats dari kegiatan terakhir
  const latestEvent = events?.[0]
  const { data: attendance } = useAttendanceByEvent(latestEvent?.id ?? '')
  const totalMembers = members?.length ?? 0
  const hadir = attendance?.filter((a) => a.status === 'hadir').length ?? 0
  const izin = attendance?.filter((a) => a.status === 'izin').length ?? 0
  const alfa = totalMembers - hadir - izin

  return (
    <div className="max-w-lg mx-auto px-4 pb-8 space-y-6">
      {/* ---- Hero ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-bg text-center pt-10 pb-6 -mx-4 px-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, delay: 0.1 }}
        >
          <Logo size={72} className="mx-auto glow-green rounded-2xl" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-heading font-bold gradient-text mt-4"
        >
          APTAMA
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-text-secondary text-sm mt-1"
        >
          Absensi Kegiatan Pilah Sampah
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-text-muted text-xs mt-1"
        >
          Satu tap, absensi beres.
        </motion.p>
      </motion.section>

      {/* ---- Kegiatan Berikutnya ---- */}
      {upcoming && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card glow="green" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Clock size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Kegiatan Berikutnya</p>
                <p className="text-sm font-semibold mt-0.5 truncate">{upcoming.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {new Date(upcoming.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · 08.15 WIB
                </p>
              </div>
            </div>
            {hari !== null && (
              <div className="mt-3 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  hari === 0 ? 'bg-primary/20 text-primary animate-pulse-dot' : 'bg-secondary/15 text-secondary'
                }`}>
                  {hari === 0 ? 'Hari ini!' : `H-${hari}`}
                </span>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* ---- Primary Actions ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/checkin">
          <Card className="text-center group" glow="green">
            <div className="inline-flex p-3 rounded-2xl bg-primary/15 mb-2 group-hover:bg-primary/25 transition">
              <LogIn size={24} className="text-primary" />
            </div>
            <p className="text-sm font-semibold">Check-in</p>
            <p className="text-[10px] text-text-muted mt-0.5">Verifikasi Wajah</p>
          </Card>
        </Link>
        <Link to="/izin">
          <Card className="text-center group" glow="gold">
            <div className="inline-flex p-3 rounded-2xl bg-secondary/15 mb-2 group-hover:bg-secondary/25 transition">
              <FileText size={24} className="text-secondary" />
            </div>
            <p className="text-sm font-semibold">Ajukan Izin</p>
            <p className="text-[10px] text-text-muted mt-0.5">Alasan privat</p>
          </Card>
          </Link>
        </motion.div>

        {/* ---- Face & Import ---- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link to="/daftar-wajah">
            <Card className="text-center group" glow="green">
              <div className="inline-flex p-3 rounded-2xl bg-primary/15 mb-2 group-hover:bg-primary/25 transition">
                <ScanFace size={24} className="text-primary" />
              </div>
              <p className="text-sm font-semibold">Daftar Wajah</p>
              <p className="text-[10px] text-text-muted mt-0.5">Untuk absen QR</p>
            </Card>
          </Link>

          <Link to={isAdmin ? '/verifikasi-wajah' : '#'} onClick={(e) => { if (!isAdmin) e.preventDefault() }}>
            <Card className={`text-center group ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} glow="gold">
              <div className="inline-flex p-3 rounded-2xl bg-secondary/15 mb-2 group-hover:bg-secondary/25 transition">
                <ShieldCheck size={24} className="text-secondary" />
              </div>
              <p className="text-sm font-semibold">Approve Wajah</p>
              <p className="text-[10px] text-text-muted mt-0.5">{isAdmin ? 'Mode ketua' : 'Butuh Mode Ketua'}</p>
            </Card>
          </Link>
        </motion.div>

      {/* ---- Quick Stats ---- */}
      {latestEvent && totalMembers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">
            Statistik Terakhir — {latestEvent.title}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard label="Hadir" value={hadir} color="green" delay={0.55} />
            <StatCard label="Izin" value={izin} color="gold" delay={0.6} />
            <StatCard label="Alfa" value={alfa} color="red" delay={0.65} />
          </div>
        </motion.div>
      )}

      {/* ---- Menu Cards ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-2.5"
      >
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Menu</p>

        <Link to="/rekap">
          <Card className="flex items-center gap-3 group">
            <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-primary/15 transition">
              <BarChart3 size={18} className="text-text-secondary group-hover:text-primary transition" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Rekap Kehadiran</p>
              <p className="text-[10px] text-text-muted">Lihat statistik & share ke WhatsApp</p>
            </div>
          </Card>
        </Link>

        <Link to={isAdmin ? '/generate-qr' : '#'} onClick={(e) => { if (!isAdmin) e.preventDefault() }}>
          <Card className={`flex items-center gap-3 group ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-primary/15 transition">
              <QrCode size={18} className="text-text-secondary group-hover:text-primary transition" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">QR Absen</p>
              <p className="text-[10px] text-text-muted">{isAdmin ? 'Generate QR code untuk kegiatan' : 'Butuh Mode Ketua'}</p>
            </div>
            {!isAdmin && <div className="text-text-muted/40"><KeyRound size={14} /></div>}
          </Card>
        </Link>

        <Link to={isAdmin ? '/import' : '#'} onClick={(e) => { if (!isAdmin) e.preventDefault() }}>
          <Card className={`flex items-center gap-3 group ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-primary/15 transition">
              <Upload size={18} className="text-text-secondary group-hover:text-primary transition" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Import Rekap Lama</p>
              <p className="text-[10px] text-text-muted">{isAdmin ? 'Bulk backfill data lama' : 'Butuh Mode Ketua'}</p>
            </div>
            {!isAdmin && <div className="text-text-muted/40"><KeyRound size={14} /></div>}
          </Card>
        </Link>
      </motion.div>
    </div>
  )
}
