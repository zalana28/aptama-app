import { NavLink } from 'react-router-dom'
import { AdminBadge } from './AdminLogin'
import { Logo } from './Logo'

const links = [
  { to: '/', label: '🏠 Beranda', admin: false },
  { to: '/anggota', label: '👥 Anggota', admin: true },
  { to: '/kegiatan', label: '📅 Kegiatan', admin: true },
  { to: '/absensi', label: '📋 Absensi', admin: true },
  { to: '/generate-qr', label: '📱 QR', admin: true },
  { to: '/rekap', label: '📊 Rekap', admin: false },
]

export function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <Logo size={28} className="shrink-0" />
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                isActive
                  ? 'bg-primary text-white font-medium shadow-lg shadow-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
              }`
            }
          >
            {l.label}
            {l.admin && <span className="ml-0.5 text-[10px] opacity-50">🔑</span>}
          </NavLink>
        ))}
        <div className="ml-auto shrink-0">
          <AdminBadge />
        </div>
      </div>
    </nav>
  )
}
