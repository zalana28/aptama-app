import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/useTheme'

export function TopBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0B0F0D]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/logos/aptama-logo.png"
            alt="Logo APTAMA"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <div>
            <p className="font-display text-sm font-bold text-white">APTAMA</p>
            <p className="text-[10px] text-zinc-500">Absensi</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Ganti mode terang atau gelap"
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 transition"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
