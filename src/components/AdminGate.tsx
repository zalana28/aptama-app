import type { ReactNode } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { AdminLogin } from './AdminLogin'

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin()
  // PIN wajib di semua device (laptop & HP). Tidak ada bypass.
  // Setiap browser menyimpan PIN-nya sendiri di localStorage —
  // pindah device / browser = harus input PIN lagi.
  if (!isAdmin) return <AdminLogin />
  return <>{children}</>
}
