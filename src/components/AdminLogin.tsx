import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'

export function AdminLogin() {
  const { login } = useAdmin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(pin)
    setLoading(false)
    if (!ok) {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16 space-y-6 text-center">
      <div className="space-y-2">
        <div className="text-4xl">🔐</div>
        <h1 className="text-xl font-bold">Mode Ketua</h1>
        <p className="text-text-muted text-sm">
          Masukkan PIN admin untuk mengakses fitur kelola data.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Masukkan PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] text-text focus:outline-none focus:border-primary"
          autoFocus
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {loading ? 'Memverifikasi...' : '🔓 Masuk'}
        </button>
      </form>
    </div>
  )
}

export function AdminBadge() {
  const { isAdmin, logout } = useAdmin()

  if (!isAdmin) return null

  return (
    <button
      onClick={logout}
      className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition"
      title="Klik untuk keluar mode admin"
    >
      🔑 Ketua
    </button>
  )
}
