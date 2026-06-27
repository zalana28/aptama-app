import { Logo } from '../components/Logo'

export function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 animate-fade-in">
        <Logo size={80} className="mx-auto shadow-xl shadow-primary/20" />
        <div>
          <h1 className="text-2xl font-bold font-heading gradient-text">APTAMA</h1>
          <p className="text-text-muted text-sm mt-1">
            Angkatan Pucanganom Tiga Muda
          </p>
        </div>
        <p className="text-text-muted text-xs max-w-xs mx-auto">
          Aplikasi Absensi Pemuda — Kegiatan Bersih Sampah
        </p>
      </div>

      {/* Menu anggota (publik) */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Untuk Anggota</p>
        <div className="grid grid-cols-3 gap-3">
          <a
            href="/checkin"
            className="glass rounded-2xl p-4 text-center hover:border-primary/50 transition group"
          >
            <div className="text-3xl group-hover:scale-110 transition">🏠</div>
            <div className="text-xs mt-2 font-semibold text-primary">Check-in</div>
            <div className="text-[10px] text-text-muted mt-0.5">dari Rumah</div>
          </a>
          <a
            href="/izin"
            className="glass rounded-2xl p-4 text-center hover:border-warning/50 transition group"
          >
            <div className="text-3xl group-hover:scale-110 transition">📝</div>
            <div className="text-xs mt-2 font-semibold text-warning">Ajukan</div>
            <div className="text-[10px] text-text-muted mt-0.5">Izin</div>
          </a>
          <a
            href="/rekap"
            className="glass rounded-2xl p-4 text-center hover:border-white/30 transition group"
          >
            <div className="text-3xl group-hover:scale-110 transition">📊</div>
            <div className="text-xs mt-2 font-semibold">Rekap</div>
            <div className="text-[10px] text-text-muted mt-0.5">Kehadiran</div>
          </a>
        </div>
      </div>

      {/* Menu admin */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <p className="text-xs text-text-muted uppercase tracking-wider font-medium">🔑 Mode Ketua</p>
        <div className="grid grid-cols-3 gap-3 opacity-60">
          <a
            href="/anggota"
            className="glass rounded-2xl p-4 text-center hover:border-white/30 transition hover:opacity-100"
          >
            <div className="text-3xl">👥</div>
            <div className="text-xs mt-2 font-medium text-text-muted">Anggota</div>
          </a>
          <a
            href="/kegiatan"
            className="glass rounded-2xl p-4 text-center hover:border-white/30 transition hover:opacity-100"
          >
            <div className="text-3xl">📅</div>
            <div className="text-xs mt-2 font-medium text-text-muted">Kegiatan</div>
          </a>
          <a
            href="/absensi"
            className="glass rounded-2xl p-4 text-center hover:border-white/30 transition hover:opacity-100"
          >
            <div className="text-3xl">📋</div>
            <div className="text-xs mt-2 font-medium text-text-muted">Absensi</div>
          </a>
        </div>
      </div>
    </div>
  )
}
