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
