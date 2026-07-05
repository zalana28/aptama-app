import type { ReactNode } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { AdminLogin } from './AdminLogin'

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin()
  // PIN wajib di semua device (laptop & HP). Tidak ada bypass.
  // Admin session disimpan di sessionStorage — tutup browser = logout otomatis.
  if (!isAdmin) return <AdminLogin />
  return <>{children}</>
}
