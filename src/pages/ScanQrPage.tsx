import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
        <div className="rounded-3xl border border-border bg-bg-card p-6 text-center shadow-sm">
          <p className="text-text-muted text-sm">Memuat QR aktif...</p>
        </div>
      ) : activeQrEvent ? (
        <div className="rounded-3xl border border-primary/40 bg-bg-card p-6 text-center space-y-4 shadow-sm">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary mb-2">
              🟢 Absensi Sedang Dibuka
            </span>
            <h2 className="text-xl font-bold text-text">{activeQrEvent.title}</h2>
            <p className="mt-1 text-xs text-text-muted">
              {activeQrEvent.date} {activeQrEvent.time ? `· ${activeQrEvent.time} WIB` : ''} {activeQrEvent.location ? `· ${activeQrEvent.location}` : ''}
            </p>
          </div>

          <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-md">
            <QRCodeSVG
              value={`${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`}
              size={220}
            />
          </div>

          <p className="text-xs text-text-muted">
            Berlaku sampai: <span className="font-medium text-text">{new Date(activeQrEvent.checkin_expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </p>

          <Link
            to={`/scan?token=${activeQrEvent.checkin_token}`}
            className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition active:scale-95 shadow-lg shadow-primary/20"
          >
            ✍️ Absen Sekarang (Buka Form Tanda Tangan)
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-bg-card p-8 text-center space-y-3 shadow-sm">
          <div className="text-4xl">⏳</div>
          <h2 className="text-base font-semibold text-text">Belum Ada QR Absen Aktif</h2>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Ketua perlu mengaktifkan QR absensi terlebih dahulu di menu <strong>Pengurus → QR Absen</strong> saat kegiatan dimulai.
          </p>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-sm mb-3">📢 Cara Absen</h2>
        <ol className="space-y-2.5 text-xs text-text-muted">
          <li>1. Buka halaman ini saat kegiatan atau scan QR dari layar ketua</li>
          <li>2. Klik tombol <strong>"Absen Sekarang"</strong> di atas</li>
          <li>3. Cari dan pilih namamu di daftar anggota</li>
          <li>4. Tanda tangan digital di kotak tanda tangan</li>
          <li>5. Tekan tombol kirim dan kehadiranmu langsung tercatat!</li>
        </ol>
      </div>
    </div>
  )
}
