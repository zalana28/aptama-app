import { useNavigate } from 'react-router-dom'
import {
  QrCode,
  Users,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Upload,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'

const adminMenus = [
  {
    title: 'QR Absen',
    desc: 'Generate QR untuk kegiatan.',
    icon: QrCode,
    to: '/generate-qr',
  },
  {
    title: 'Kelola Anggota',
    desc: 'Tambah, edit, hapus anggota.',
    icon: Users,
    to: '/anggota',
  },
  {
    title: 'Kelola Kegiatan',
    desc: 'Atur kegiatan dan jadwal selapanan.',
    icon: Calendar,
    to: '/kegiatan',
  },
  {
    title: 'Absen Manual',
    desc: 'Tandai hadir/izin/alfa manual.',
    icon: ClipboardCheck,
    to: '/absensi',
  },
  {
    title: 'Rekap Admin',
    desc: 'Export dan share rekap.',
    icon: BarChart3,
    to: '/rekap',
  },
  {
    title: 'Import Rekap Lama',
    desc: 'Masukkan data absensi lama.',
    icon: Upload,
    to: '/import',
  },
  {
    title: 'Ganti PIN',
    desc: 'Ubah PIN ketua.',
    icon: KeyRound,
    to: '/ganti-pin',
  },
]

export function PengurusDashboard() {
  const navigate = useNavigate()
  const { logout } = useAdmin()

  function handleLogout() {
    logout()
    // Stay on same page, will show ModeKetuaGate
  }

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#1B7A3D]/15 text-[#1B7A3D]">
          <KeyRound size={32} />
        </div>
        <h1 className="text-2xl font-bold">Pengurus</h1>
        <p className="text-sm text-text-muted">
          Menu khusus ketua untuk mengelola absensi APTAMA.
        </p>
      </div>

      <div className="space-y-3">
        {adminMenus.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate(item.to)}
              className="w-full flex items-start gap-4 rounded-2xl border border-border bg-bg-card p-4 text-left hover:border-primary/50 transition active:scale-[0.98] shadow-sm"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-text-muted mt-1">{item.desc}</p>
              </div>
            </button>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-start gap-4 rounded-xl border border-danger/20 bg-danger/10 p-4 text-left hover:border-danger/50 transition active:scale-[0.98]"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger">
            <LogOut size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-danger">
              Keluar Mode Ketua
            </h3>
            <p className="text-xs text-danger/70 mt-1">
              Kunci kembali menu pengurus.
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
