import { Link } from 'react-router-dom'
import { QrCode, FileText, Calendar, PenLine } from 'lucide-react'

export function HomePage() {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold gradient-text">
          Selamat Datang di APTAMA
        </h1>
        <p className="text-sm text-text-muted">
          Daftar Hadir Kegiatan Kepemudaan
        </p>
      </div>

      <div className="space-y-3">
        <Link
          to="/scan-qr"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-primary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <QrCode size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Scan QR Absen</p>
              <p className="text-xs text-text-muted mt-1">
                Buka link QR dari ketua lalu tanda tangan untuk hadir.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/checkin"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-secondary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <PenLine size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Check-in dari Rumah</p>
              <p className="text-xs text-text-muted mt-1">
                Absen sebelum jam mulai pakai tanda tangan digital.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/izin"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-secondary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Ajukan Izin</p>
              <p className="text-xs text-text-muted mt-1">
                Tidak bisa hadir? Kirim alasan privat ke ketua.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/kegiatan"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-success/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Kegiatan Berikutnya</p>
              <p className="text-xs text-text-muted mt-1">
                Lihat jadwal dan countdown kegiatan.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-bg-card border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">📢 Cara Absen</h2>
        <ol className="space-y-2 text-xs text-text-muted">
          <li>1. Saat kegiatan, scan QR yang ditampilkan ketua</li>
          <li>2. Pilih namamu di daftar</li>
          <li>3. Tanda tangan digital sebagai bukti kehadiran</li>
          <li>4. Kehadiranmu langsung tercatat</li>
        </ol>
      </div>
    </div>
  )
}
