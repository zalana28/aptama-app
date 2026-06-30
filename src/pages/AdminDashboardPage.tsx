import { Link } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
import { Users, Calendar, FileCheck, QrCode, ShieldCheck, Settings } from 'lucide-react'

export function AdminDashboardPage() {
  const { isAdmin, logout } = useAdmin()

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Halaman ini khusus ketua.</p>
          <Link to="/mode-ketua" className="text-primary text-sm hover:underline">
            Masuk Mode Ketua
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🛡️</div>
        <h1 className="text-xl font-bold gradient-text">Dashboard Ketua</h1>
        <p className="text-sm text-text-muted">
          Kelola anggota, kegiatan, dan verifikasi wajah.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          to="/anggota"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-primary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Kelola Anggota</p>
              <p className="text-xs text-text-muted mt-1">
                Tambah, edit, hapus data anggota.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/kegiatan"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-secondary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Kelola Kegiatan</p>
              <p className="text-xs text-text-muted mt-1">
                Buat kegiatan baru, atur jadwal, lokasi.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/verifikasi-wajah"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-success/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Verifikasi Wajah</p>
              <p className="text-xs text-text-muted mt-1">
                Approve/tolak pendaftaran wajah anggota.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/generate-qr"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-warning/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/10 text-warning shrink-0">
              <QrCode size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Generate QR Absen</p>
              <p className="text-xs text-text-muted mt-1">
                Buat QR code untuk absensi kegiatan.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/absensi"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-info/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info shrink-0">
              <FileCheck size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Kelola Absensi</p>
              <p className="text-xs text-text-muted mt-1">
                Lihat dan edit status absensi per kegiatan.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/ganti-pin"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-danger/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-danger/10 text-danger shrink-0">
              <Settings size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Ganti PIN</p>
              <p className="text-xs text-text-muted mt-1">
                Ubah PIN rahasia Mode Ketua.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <button
        onClick={logout}
        className="w-full bg-bg-card border border-danger/50 text-danger px-4 py-3 rounded-lg text-sm font-medium hover:bg-danger/10 transition"
      >
        🚪 Keluar Mode Ketua
      </button>
    </div>
  )
}
