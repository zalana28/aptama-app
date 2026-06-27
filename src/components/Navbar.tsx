import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { Drawer } from './Drawer'

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          {/* Left: Logo + title */}
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-heading font-bold text-sm text-white">Beranda</span>
          </Link>

          {/* Right: Hamburger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
            aria-label="Menu"
          >
            <Menu size={20} className="text-text-secondary" />
          </motion.button>
        </div>
      </nav>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
