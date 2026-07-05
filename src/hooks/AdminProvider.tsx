import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AdminContext } from './AdminContext'

const STORAGE_KEY = 'aptama_admin_verified'

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return !!sessionStorage.getItem(STORAGE_KEY)
  })

  // Re-verify on mount — session-only, no persistent flag
  useEffect(() => {
    const verified = sessionStorage.getItem(STORAGE_KEY)
    if (!verified) return
  }, [])

  async function login(pin: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_verify_pin', { p_pin: pin })
    if (error || data !== true) return false
    sessionStorage.setItem(STORAGE_KEY, '1')
    sessionStorage.setItem('aptama_admin_pin', pin)
    setIsAdmin(true)
    return true
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('aptama_admin_pin')
    setIsAdmin(false)
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}
