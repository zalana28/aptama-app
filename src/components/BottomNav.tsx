import { NavLink } from 'react-router-dom'
import { Home, QrCode, BarChart3, Users } from 'lucide-react'

const items = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/scan-qr', label: 'Scan QR', icon: QrCode },
  { to: '/rekap', label: 'Rekap', icon: BarChart3 },
  { to: '/pengurus', label: 'Pengurus', icon: Users },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition',
                  isActive ? 'text-secondary' : 'text-zinc-500',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={[
                      'grid h-8 w-8 place-items-center rounded-2xl transition',
                      isActive ? 'bg-primary/20 text-primary' : 'text-zinc-500',
                    ].join(' ')}
                  >
                    <Icon size={18} />
                  </div>
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
