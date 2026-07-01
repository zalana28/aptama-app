import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { QrCode, Scan } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import type { Event } from '../types'

function isQrActive(event: Event) {
  const expiresAt = event.checkin_expires_at
  if (!event.checkin_token || !expiresAt) return false
  return new Date(expiresAt).getTime() > Date.now()
}

export function ScanQrPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['active-qr-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, checkin_token, checkin_expires_at')
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as Event[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const activeQrEvents = events.filter(isQrActive)
  const activeQrEvent = activeQrEvents[0] ?? null

  console.log('events from db:', events)
  console.log('activeQrEvents:', activeQrEvents)
  console.log('activeQrEvent:', activeQrEvent)
  console.log('now:', new Date().toISOString())

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">📱</div>
        <h1 className="text-xl font-bold">Scan QR</h1>
        <p className="text-sm text-text-muted">
          Scan QR dari ketua, lalu verifikasi wajah untuk absen hadir.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center">
          <p className="text-zinc-400">Memuat QR aktif...</p>
        </div>
      ) : activeQrEvent ? (
        <div className="rounded-3xl border border-[#1B7A3D]/40 bg-white/[0.06] p-5 text-center">
          <h2 className="text-lg font-bold">QR Absen Aktif</h2>
          <p className="mt-1 text-sm text-zinc-400">{activeQrEvent.title}</p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4">
            <QRCodeSVG
              value={`${window.location.origin}/scan?token=${activeQrEvent.checkin_token}`}
              size={220}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Berlaku sampai:{' '}
            {new Date(activeQrEvent.checkin_expires_at!).toLocaleString('id-ID')}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center">
          <p className="text-zinc-400">
            Belum ada QR aktif. Ketua perlu generate QR dulu di menu Pengurus.
          </p>
        </div>
      )}

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
