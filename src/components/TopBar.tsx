import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function TopBar() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/logos/aptama-logo-192.png"
            srcSet="/logos/aptama-logo-96.png 96w, /logos/aptama-logo-128.png 128w, /logos/aptama-logo-192.png 192w, /logos/aptama-logo-256.png 256w"
            sizes="32px"
            alt="Logo APTAMA"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <div>
            <p className="font-display text-sm font-bold text-text">APTAMA</p>
            <p className="text-[10px] text-text-muted">Absensi</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Ganti mode terang atau gelap"
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-card text-text hover:bg-bg-card-hover transition active:scale-95"
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
