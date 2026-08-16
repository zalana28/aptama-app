import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Scan, PenLine } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

interface ActiveQr {
  event_id: string
  title: string
  date: string
  time?: string
  location?: string
  checkin_token: string
  checkin_expires_at: string
}

export function ScanQrPage() {
  const { data: activeQrEvent, isLoading } = useQuery({
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

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">📱</div>
        <h1 className="text-xl font-bold">Scan QR</h1>
        <p className="text-sm text-text-muted">
          Scan QR dari ketua, lalu tanda tangan untuk absen hadir.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-bg-card p-5 text-center">
          <p className="text-text-muted">Memuat QR aktif...</p>
        </div>
      ) : activeQrEvent ? (
        <div className="rounded-3xl border border-primary/40 bg-bg-card p-5 text-center">
          <h2 className="text-lg font-bold text-text">QR Absen Aktif</h2>
          <p className="mt-1 text-sm text-text-muted">{activeQrEvent.title}</p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeSVG
              value={`${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`}
              size={220}
            />
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Berlaku sampai:{' '}
            {new Date(activeQrEvent.checkin_expires_at).toLocaleString('id-ID')}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-bg-card p-5 text-center">
          <p className="text-text-muted">
            Belum ada QR aktif. Ketua perlu generate QR dulu di menu Pengurus.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Link
          to="/scan"
          className="block bg-bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Scan size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Scan QR Kegiatan</p>
              <p className="text-xs text-text-muted mt-1">
                Buka link QR lalu tanda tangan untuk absen.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/checkin"
          className="block bg-bg-card border border-border rounded-xl p-4 hover:border-secondary/50 transition"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <PenLine size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Check-in dari Rumah</p>
              <p className="text-xs text-text-muted mt-1">
                Absen sebelum jam mulai dengan tanda tangan digital.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">ℹ️ Catatan</h2>
        <ul className="space-y-2 text-xs text-text-muted">
          <li>• QR aktif hanya saat kegiatan berlangsung</li>
          <li>• Pilih namamu lalu tanda tangan sebagai bukti kehadiran</li>
          <li>• Tanda tangan tersimpan dan bisa dicek ketua</li>
          <li>• Check-in dari rumah hanya bisa sebelum jam mulai kegiatan</li>
        </ul>
      </div>
    </div>
  )
}
