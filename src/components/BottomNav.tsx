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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-90 relative py-1',
                  isActive ? 'text-primary' : 'text-text-muted hover:text-text',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={[
                      'grid h-8 w-12 place-items-center rounded-xl transition-all duration-200',
                      isActive ? 'bg-primary/15 text-primary shadow-sm' : 'text-text-muted',
                    ].join(' ')}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="h-1 w-1 rounded-full bg-primary absolute bottom-1" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
