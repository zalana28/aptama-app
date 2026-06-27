import { motion, AnimatePresence } from 'framer-motion'
import { X, Home, LogIn, FileText, BarChart3, QrCode, KeyRound, Users, Calendar, ClipboardCheck, Lock } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
import { Logo } from './Logo'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

const publicLinks = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/checkin', label: 'Check-in dari Rumah', icon: LogIn },
  { to: '/izin', label: 'Ajukan Izin', icon: FileText },
  { to: '/rekap', label: 'Rekap', icon: BarChart3 },
]

const adminLinks = [
  { to: '/generate-qr', label: 'QR Absen', icon: QrCode },
  { to: '/anggota', label: 'Kelola Anggota', icon: Users },
  { to: '/kegiatan', label: 'Kelola Kegiatan', icon: Calendar },
  { to: '/absensi', label: 'Absensi', icon: ClipboardCheck },
]

export function Drawer({ open, onClose }: DrawerProps) {
  const { isAdmin, login, logout } = useAdmin()
  const location = useLocation()

  async function handleAdminToggle() {
    if (isAdmin) {
      logout()
      onClose()
    } else {
      const pin = prompt('Masukkan PIN Ketua:')
      if (pin) {
        const ok = await login(pin)
        if (!ok) alert('PIN salah')
        else onClose()
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 drawer-overlay"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[280px] max-w-[85vw] z-50 bg-bg-elevated border-l border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Logo size={28} />
                <span className="font-heading font-bold text-sm gradient-text">APTAMA</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <X size={18} className="text-text-secondary" />
              </motion.button>
            </div>

            {/* Menu items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold px-3 py-2">Menu</p>
              {publicLinks.map((link) => {
                const Icon = link.icon
                const active = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                )
              })}

              <div className="h-px bg-border my-3" />

              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold px-3 py-2">Mode Ketua</p>
              {adminLinks.map((link) => {
                const Icon = link.icon
                const active = location.pathname === link.to
                if (!isAdmin) {
                  return (
                    <div
                      key={link.to}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted/40 cursor-not-allowed"
                    >
                      <Lock size={16} className="opacity-40" />
                      <span>{link.label}</span>
                    </div>
                  )
                }
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Footer: Admin toggle */}
            <div className="p-4 border-t border-border">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAdminToggle}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isAdmin
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-white/5 text-text-secondary border border-border hover:border-primary/40 hover:text-white'
                }`}
              >
                <KeyRound size={16} />
                {isAdmin ? 'Keluar Mode Ketua' : 'Masuk Mode Ketua'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
