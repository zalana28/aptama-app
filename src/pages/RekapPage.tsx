import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Calendar } from 'lucide-react'

type Tab = 'absen' | 'kegiatan'

export function RekapPage() {
  const [activeTab, setActiveTab] = useState<Tab>('absen')

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">📊</div>
        <h1 className="text-xl font-bold">Rekap</h1>
        <p className="text-sm text-text-muted">
          Lihat statistik absensi dan kegiatan.
        </p>
      </div>

      <div className="flex gap-2 bg-bg-card border border-white/10 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('absen')}
          className={[
            'flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition',
            activeTab === 'absen'
              ? 'bg-primary text-white'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          Rekap Absen
        </button>
        <button
          onClick={() => setActiveTab('kegiatan')}
          className={[
            'flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition',
            activeTab === 'kegiatan'
              ? 'bg-primary text-white'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          Rekap Kegiatan
        </button>
      </div>

      {activeTab === 'absen' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted text-center">
            Rekap absensi per anggota akan tampil di sini.
          </p>
          <Link
            to="/rekap"
            className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-primary/50 transition"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <BarChart3 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Lihat Rekap Lengkap</p>
                <p className="text-xs text-text-muted mt-1">
                  Persentase kehadiran, izin, alfa per anggota.
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {activeTab === 'kegiatan' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted text-center">
            Rekap per kegiatan akan tampil di sini.
          </p>
          <Link
            to="/kegiatan"
            className="block bg-bg-card border border-white/10 rounded-xl p-4 hover:border-secondary/50 transition"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
                <Calendar size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Lihat Daftar Kegiatan</p>
                <p className="text-xs text-text-muted mt-1">
                  Jumlah hadir, izin, alfa per kegiatan.
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
