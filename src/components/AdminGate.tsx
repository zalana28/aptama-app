import type { ReactNode } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { AdminLogin } from './AdminLogin'

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin()
  if (!isAdmin) return <AdminLogin />
  return <>{children}</>
}
