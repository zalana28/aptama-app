import { Link } from 'react-router-dom'
import { QrCode, Scan } from 'lucide-react'

export function ScanQrPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">📱</div>
        <h1 className="text-xl font-bold">Scan QR</h1>
        <p className="text-sm text-text-muted">
          Scan QR dari ketua, lalu verifikasi wajah untuk absen hadir.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          to="/scan"
          className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-primary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Scan size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Scan QR Kegiatan</p>
              <p className="text-xs text-text-muted mt-1">
                Buka link QR atau scan dengan kamera.
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
              <QrCode size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Check-in Verifikasi Wajah</p>
              <p className="text-xs text-text-muted mt-1">
                Absen dari rumah sebelum jam mulai (harus sudah daftar wajah).
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-bg-card border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">ℹ️ Catatan</h2>
        <ul className="space-y-2 text-xs text-text-muted">
          <li>• QR aktif hanya saat kegiatan berlangsung</li>
          <li>• Wajahmu harus sudah diapprove ketua</li>
          <li>• Selfie saat absen akan dicocokan dengan wajah terdaftar</li>
          <li>• Check-in dari rumah hanya bisa sebelum jam mulai kegiatan</li>
        </ul>
      </div>
    </div>
  )
}
