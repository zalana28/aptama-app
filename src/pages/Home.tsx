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
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-4">
        <a
          href="/anggota"
          className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-primary/50 transition"
        >
          <div className="text-2xl">👥</div>
          <div className="text-xs mt-1 text-text-muted">Anggota</div>
        </a>
        <a
          href="/kegiatan"
          className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-primary/50 transition"
        >
          <div className="text-2xl">📅</div>
          <div className="text-xs mt-1 text-text-muted">Kegiatan</div>
        </a>
        <a
          href="/rekap"
          className="bg-bg-card border border-white/10 rounded-xl p-4 text-center hover:border-primary/50 transition"
        >
          <div className="text-2xl">📊</div>
          <div className="text-xs mt-1 text-text-muted">Rekap</div>
        </a>
        <div className="bg-bg-card border border-white/10 rounded-xl p-4 text-center opacity-50">
          <div className="text-2xl">📱</div>
          <div className="text-xs mt-1 text-text-muted">QR Scan</div>
        </div>
      </div>
    </div>
  )
}
