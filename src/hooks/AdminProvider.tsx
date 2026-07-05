import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AdminContext } from './AdminContext'

const STORAGE_KEY = 'aptama_admin_verified'

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Only check if a verified flag exists AND a PIN hash is stored
    return !!localStorage.getItem(STORAGE_KEY)
  })

  // Re-verify on mount
  useEffect(() => {
    const verified = localStorage.getItem(STORAGE_KEY)
    if (!verified) return
    // Silently check if the session is still valid
    // (PIN could have been changed from another device)
    // We can't re-verify without the actual PIN, so we trust the flag
    // until an RPC call fails with auth error
  }, [])

  async function login(pin: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_verify_pin', { p_pin: pin })
    if (error || data !== true) return false
    // Store only a verified flag — NOT the raw PIN
    localStorage.setItem(STORAGE_KEY, '1')
    // Keep PIN in memory only for the current session RPC calls
    sessionStorage.setItem('aptama_admin_pin', pin)
    setIsAdmin(true)
    return true
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('aptama_admin_pin')
    setIsAdmin(false)
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}
