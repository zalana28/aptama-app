export function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">🗑️ APTAMA</h1>
        <p className="text-text-muted text-sm">
          Aplikasi Absensi Pemuda — Kegiatan Bersih Sampah
        </p>
        <p className="text-secondary text-xs">
          Angkatan Pucanganom Tiga Muda
        </p>
      </div>

      {/* Menu anggota (publik) */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted uppercase tracking-wider">Untuk Anggota</p>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          <a
            href="/checkin"
            className="bg-bg-card border border-primary/30 rounded-xl p-4 text-center hover:border-primary transition"
          >
            <div className="text-2xl">🏠</div>
            <div className="text-xs mt-1 font-medium text-primary">Check-in</div>
            <div className="text-[10px] text-text-muted mt-0.5">dari Rumah</div>
          </a>
          <a
            href="/izin"
            className="bg-bg-card border border-warning/30 rounded-xl p-4 text-center hover:border-warning transition"
          >
            <div className="text-2xl">📝</div>
            <div className="text-xs mt-1 font-medium text-warning">Ajukan</div>
            <div className="text-[10px] text-text-muted mt-0.5">Izin</div>
          </a>
          <a
            href="/rekap"
            className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-white/30 transition"
          >
            <div className="text-2xl">📊</div>
            <div className="text-xs mt-1 text-text-muted">Rekap</div>
          </a>
        </div>
      </div>

      {/* Menu admin */}
      <div className="space-y-2 pt-4">
        <p className="text-xs text-text-muted uppercase tracking-wider">🔑 Mode Ketua</p>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto opacity-60">
          <a
            href="/anggota"
            className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-white/30 transition"
          >
            <div className="text-2xl">👥</div>
            <div className="text-xs mt-1 text-text-muted">Anggota</div>
          </a>
          <a
            href="/kegiatan"
            className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-white/30 transition"
          >
            <div className="text-2xl">📅</div>
            <div className="text-xs mt-1 text-text-muted">Kegiatan</div>
          </a>
          <a
            href="/absensi"
            className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-white/30 transition"
          >
            <div className="text-2xl">📋</div>
            <div className="text-xs mt-1 text-text-muted">Absensi</div>
          </a>
        </div>
      </div>
    </div>
  )
}
