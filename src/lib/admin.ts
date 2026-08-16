import type { LoginResult } from '../hooks/AdminContext'

const TOKEN_KEY = 'aptama_admin_token'
const EXPIRES_KEY = 'aptama_admin_expires'

export function getAdminToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) throw new Error('Sesi admin berakhir. Silakan masuk lagi.')
  return token
}

export function setAdminSession(token: string, expiresAt: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXPIRES_KEY, expiresAt)
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRES_KEY)
}

export function hasAdminSession(): boolean {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return false
  const expires = sessionStorage.getItem(EXPIRES_KEY)
  if (expires && new Date(expires).getTime() <= Date.now()) {
    clearAdminSession()
    return false
  }
  return true
}

export function loginErrorMessage(result: LoginResult): string {
  if (result.ok) return ''
  if (result.errorCode === 'rate_limited') {
    const minutes = result.retryAfter ? Math.max(1, Math.ceil(result.retryAfter / 60)) : 5
    return `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`
  }
  if (result.errorCode === 'error') {
    return result.message || 'Gagal terhubung ke database. Periksa konfigurasi Supabase.'
  }
  return 'PIN salah. Coba lagi.'
}
