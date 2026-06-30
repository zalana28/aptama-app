import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, Sun, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { Drawer } from './Drawer'
import { SkipLink } from './SkipLink'
import { useTheme } from '../hooks/useTheme'

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <>
      <SkipLink />
      <nav className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border" aria-label="Navigasi utama">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center" aria-label="Kembali ke Beranda">
            <Logo size={26} />
          </Link>

          {/* Right: Theme toggle + Hamburger */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
              aria-label={resolvedTheme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun size={20} className="text-text-secondary" />
              ) : (
                <Moon size={20} className="text-text-secondary" />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
              aria-label="Buka menu"
              aria-expanded={drawerOpen}
              aria-controls="main-menu"
            >
              <Menu size={20} className="text-text-secondary" />
            </motion.button>
          </div>
        </div>
      </nav>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
