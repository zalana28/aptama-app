import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AdminContext } from './AdminContext'
import { setAdminSession, clearAdminSession, hasAdminSession } from '../lib/admin'

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => hasAdminSession())

  // Re-verify the stored token against the server on mount (session-only,
  // never trust the frontend flag alone).
  useEffect(() => {
    if (!hasAdminSession()) return
    const token = sessionStorage.getItem('aptama_admin_token')
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase.rpc('admin_validate_session', { p_token: token })
        if (cancelled) return
        if (data !== true) {
          clearAdminSession()
          setIsAdmin(false)
        }
      } catch {
        if (cancelled) return
        clearAdminSession()
        setIsAdmin(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function login(pin: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_login', { p_pin: pin })
    if (error || !data) return false
    const session = data as { token?: string; expires_at?: string }
    if (!session.token) return false
    setAdminSession(session.token, session.expires_at ?? '')
    setIsAdmin(true)
    return true
  }

  function logout() {
    const token = sessionStorage.getItem('aptama_admin_token')
    clearAdminSession()
    setIsAdmin(false)
    if (token) {
      supabase.rpc('admin_logout', { p_token: token }).then(() => {}, () => {})
    }
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}
