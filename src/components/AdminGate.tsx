import type { ReactNode } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { AdminLogin } from './AdminLogin'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin()
  // PIN hanya diminta di device mobile/HP.
  // Di laptop/desktop: skip gate — ketua diasumsikan trusted (akses fisik).
  // Jika bukan admin DAN device mobile: tampilkan form PIN.
  if (!isAdmin && isMobileDevice()) return <AdminLogin />
  return <>{children}</>
}
