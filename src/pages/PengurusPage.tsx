import { Users, Mail, Phone } from 'lucide-react'

export function PengurusPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">👥</div>
        <h1 className="text-xl font-bold">Pengurus APTAMA</h1>
        <p className="text-sm text-text-muted">
          Struktur organisasi dan kontak pengurus.
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-bg-card border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Ketua</p>
              <p className="text-xs text-text-muted mt-1">
                [Nama Ketua]
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                <Phone size={12} />
                <span>081234567890</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Wakil Ketua</p>
              <p className="text-xs text-text-muted mt-1">
                [Nama Wakil]
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success shrink-0">
              <Mail size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Sekretaris</p>
              <p className="text-xs text-text-muted mt-1">
                [Nama Sekretaris]
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-white/10 rounded-xl p-4">
        <p className="text-xs text-text-muted text-center">
          💡 Untuk perubahan data pengurus, masuk Mode Ketua.
        </p>
      </div>
    </div>
  )
}
