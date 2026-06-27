import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AdminCtx {
  isAdmin: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => void
}

const AdminContext = createContext<AdminCtx>({ isAdmin: false, login: async () => false, logout: () => {} })

const STORAGE_KEY = 'aptama_admin_pin'

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem(STORAGE_KEY))

  // Verify stored pin on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) verifyPin(stored).then((ok) => { if (!ok) logout() })
  }, [])

  async function verifyPin(pin: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_verify_pin', { p_pin: pin })
    console.log('[admin_verify_pin]', { data, error, pin })
    if (error) return false
    return data === true
  }

  async function login(pin: string): Promise<boolean> {
    const ok = await verifyPin(pin)
    if (ok) {
      localStorage.setItem(STORAGE_KEY, pin)
      setIsAdmin(true)
    }
    return ok
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setIsAdmin(false)
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
