import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '🏠 Beranda' },
  { to: '/anggota', label: '👥 Anggota' },
  { to: '/kegiatan', label: '📅 Kegiatan' },
  { to: '/absensi', label: '📋 Absensi' },
  { to: '/rekap', label: '📊 Rekap' },
]

export function Navbar() {
  return (
    <nav className="bg-bg-card border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
