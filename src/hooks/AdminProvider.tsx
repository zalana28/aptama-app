import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AdminContext, type LoginResult } from './AdminContext'
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

  async function login(pin: string): Promise<LoginResult> {
    const { data } = await supabase.rpc('admin_login', { p_pin: pin })
    const res = data as
      | { success: true; token: string; expires_at?: string }
      | { success: false; error_code?: string; retry_after?: number }
      | undefined
    if (!res?.success) {
      if (res?.error_code === 'rate_limited') {
        return { ok: false, errorCode: 'rate_limited', retryAfter: res.retry_after }
      }
      return { ok: false, errorCode: 'invalid_pin' }
    }
    if (!res.token) return { ok: false, errorCode: 'invalid_pin' }
    setAdminSession(res.token, res.expires_at ?? '')
    setIsAdmin(true)
    return { ok: true }
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
