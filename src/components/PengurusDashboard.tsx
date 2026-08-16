import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  QrCode,
  Users,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Upload,
  KeyRound,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'

const adminMenus = [
  {
    title: 'Generate QR Absen',
    desc: 'Buka sesi absensi baru & tampilkan QR.',
    icon: QrCode,
    to: '/generate-qr',
    badge: 'Presensi',
  },
  {
    title: 'Kelola Anggota',
    desc: 'Tambah, edit, dan kelola 50 anggota.',
    icon: Users,
    to: '/anggota',
    badge: 'Database',
  },
  {
    title: 'Kelola Kegiatan',
    desc: 'Atur jadwal selapanan & pertemuan.',
    icon: Calendar,
    to: '/kegiatan',
    badge: 'Jadwal',
  },
  {
    title: 'Absensi Manual',
    desc: 'Tandai kehadiran langsung & periksa tanda tangan.',
    icon: ClipboardCheck,
    to: '/absensi',
    badge: 'Realtime',
  },
  {
    title: 'Rekap & Laporan',
    desc: 'Export ke PDF, Excel, dan share ke WhatsApp.',
    icon: BarChart3,
    to: '/rekap',
    badge: 'Export',
  },
  {
    title: 'Import Rekap Lama',
    desc: 'Masukkan data absensi format teks / CSV.',
    icon: Upload,
    to: '/import',
    badge: 'Tools',
  },
  {
    title: 'Ganti PIN Ketua',
    desc: 'Ubah PIN keamanan & recovery PIN.',
    icon: KeyRound,
    to: '/ganti-pin',
    badge: 'Keamanan',
  },
]

export function PengurusDashboard() {
  const navigate = useNavigate()
  const { logout } = useAdmin()

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <Shield size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Dashboard Pengurus</h1>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Akses khusus Ketua dan Pengurus untuk mengelola seluruh sistem presensi APTAMA.
        </p>
      </div>

      {/* Responsive Grid on Tablet / Desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {adminMenus.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.title}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.to)}
              className="flex items-start gap-3.5 rounded-2xl border border-border bg-bg-card p-4 text-left hover:border-primary/50 transition shadow-xs group"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition">
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-sm text-text truncate">{item.title}</h3>
                  <span className="text-[9px] font-semibold text-text-muted px-1.5 py-0.5 rounded-md bg-bg-elevated">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0 self-center" />
            </motion.button>
          )
        })}

        {/* Logout Button */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="flex items-start gap-3.5 rounded-2xl border border-danger/25 bg-danger/10 p-4 text-left hover:border-danger/50 transition shadow-xs group sm:col-span-2"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger/20 text-danger group-hover:bg-danger group-hover:text-white transition">
            <LogOut size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-danger">Keluar Mode Ketua</h3>
            <p className="text-xs text-danger/70 mt-0.5">
              Kunci kembali menu pengurus agar tidak bisa diakses sembarang orang.
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  )
}
