import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Copy, Check, Sparkles, AlertCircle, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'

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
  const { isAdmin } = useAdmin()
  const [copied, setCopied] = useState(false)

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

  function handleCopyLink() {
    if (!activeQrEvent) return
    const link = `${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-1.5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <QrCode size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Presensi Digital</h1>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          Scan QR atau klik tombol untuk tanda tangan kehadiran.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-bg-card p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          <p className="text-text-muted text-sm">Mengecek sesi QR aktif...</p>
        </div>
      ) : activeQrEvent ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl border border-primary/30 bg-bg-card p-6 text-center space-y-4 shadow-lg shadow-primary/5 relative overflow-hidden"
        >
          {/* Active indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>ABSENSI DIBUKA</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-text">{activeQrEvent.title}</h2>
            <p className="mt-1 text-xs text-text-muted">
              📅 {activeQrEvent.date} {activeQrEvent.time ? `· ⏰ ${activeQrEvent.time} WIB` : ''} {activeQrEvent.location ? `· 📍 ${activeQrEvent.location}` : ''}
            </p>
          </div>

          {/* Glowing QR Container */}
          <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-xl border-4 border-primary/20">
            <QRCodeSVG
              value={`${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`}
              size={220}
              level="M"
            />
          </div>

          <p className="text-xs text-text-muted">
            Berlaku sampai: <span className="font-semibold text-text">{new Date(activeQrEvent.checkin_expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </p>

          <div className="space-y-2 pt-1">
            <Link
              to={`/scan?token=${activeQrEvent.checkin_token}`}
              className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3.5 px-4 rounded-xl text-sm font-semibold hover:bg-primary-light transition active:scale-95 shadow-lg shadow-primary/25"
            >
              <Sparkles size={16} />
              <span>Absen Sekarang (Buka Form Tanda Tangan)</span>
            </Link>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 w-full bg-bg-elevated border border-border text-text py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-bg-card-hover transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-success" />
                  <span className="text-success font-semibold">Link Absensi Disalin!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-text-muted" />
                  <span>Salin Link Absen Kegiatan</span>
                </>
              )}
            </button>

            {/* Admin Live Monitor & Management Shortcut */}
            {isAdmin && (
              <div className="pt-2 border-t border-border/60">
                <Link
                  to="/generate-qr"
                  className="flex items-center justify-center gap-2 w-full bg-primary/10 border border-primary/30 text-primary py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-primary/20 transition"
                >
                  <BarChart3 size={15} />
                  <span>👀 Buka Live Monitor & Kelola Sesi QR</span>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl border border-border bg-bg-card p-8 text-center space-y-3 shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-text/[0.05] text-text-muted">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-base font-semibold text-text">Belum Ada QR Absen Aktif</h2>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Ketua perlu mengaktifkan QR absensi terlebih dahulu di menu <strong>Pengurus → QR Absen</strong> saat kegiatan dimulai.
          </p>
          <Link
            to="/kegiatan"
            className="inline-block mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Lihat Jadwal Kegiatan →
          </Link>
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <span>📢</span>
          <span>Petunjuk Presensi Mandiri</span>
        </h2>
        <ul className="space-y-2 text-xs text-text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Buka halaman ini atau scan QR yang ditampilkan oleh panitia.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>Ketik dan pilih namamu pada daftar 50 anggota.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>Buat tanda tangan langsung di layar HP kamu.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>Tekan kirim — tanda tangan tersimpan dan statusmu langsung <strong>Hadir</strong>!</span>
          </li>
        </ul>
      </div>
    </motion.div>
  )
}
