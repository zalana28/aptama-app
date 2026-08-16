import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { loginErrorMessage } from '../lib/admin'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

export function AdminLogin() {
  const { login } = useAdmin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Lupa PIN
  const [showReset, setShowReset] = useState(false)
  const [recoveryPin, setRecoveryPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(pin)
    setLoading(false)
    if (!result.ok) {
      setError(loginErrorMessage(result))
      setPin('')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResetSuccess(false)

    if (!recoveryPin || !newPin || !confirmNewPin) {
      setError('Semua field wajib diisi.')
      return
    }
    if (newPin !== confirmNewPin) {
      setError('PIN baru dan konfirmasi tidak sama.')
      return
    }
    if (newPin.length < 4) {
      setError('PIN baru minimal 4 digit.')
      return
    }

    setResetLoading(true)
    const { error: rpcError } = await supabase.rpc('admin_reset_pin', {
      p_recovery_pin: recoveryPin,
      p_new_pin: newPin,
    })
    setResetLoading(false)

    if (rpcError) {
      setError(rpcError.message || 'Gagal reset PIN.')
      return
    }

    setResetSuccess(true)
    setRecoveryPin('')
    setNewPin('')
    setConfirmNewPin('')
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16 space-y-6 text-center">
      <div className="space-y-3 animate-fade-in">
        <Logo size={64} className="mx-auto" />
        <h1 className="text-xl font-bold font-heading gradient-text">Mode Ketua</h1>
        <p className="text-text-muted text-sm">
          Masukkan PIN admin untuk mengakses fitur kelola data.
        </p>
      </div>

      {!showReset ? (
        <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Masukkan PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            autoFocus
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {loading ? 'Memverifikasi...' : '🔓 Masuk'}
          </button>
          <button
            type="button"
            onClick={() => { setShowReset(true); setError('') }}
            className="text-xs text-text-muted hover:text-primary transition"
          >
            Lupa PIN?
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <p className="text-text-muted text-sm">Reset PIN pakai Recovery PIN</p>
          {resetSuccess && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-2 text-success text-xs">
              PIN berhasil direset. Silakan masuk dengan PIN baru.
            </div>
          )}
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Recovery PIN"
            value={recoveryPin}
            onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            autoFocus
          />
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="PIN baru"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Ulangi PIN baru"
            value={confirmNewPin}
            onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={resetLoading || !recoveryPin || !newPin || !confirmNewPin}
            className="w-full bg-secondary text-bg px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary-light transition disabled:opacity-50"
          >
            {resetLoading ? 'Mereset...' : '🔑 Reset PIN'}
          </button>
          <button
            type="button"
            onClick={() => { setShowReset(false); setError(''); setResetSuccess(false) }}
            className="text-xs text-text-muted hover:text-primary transition"
          >
            ← Kembali ke login
          </button>
        </form>
      )}
    </div>
  )
}

export function AdminBadge() {
  const { isAdmin, logout } = useAdmin()

  if (!isAdmin) return null

  return (
    <button
      onClick={logout}
      className="px-2 py-0.5 rounded-lg text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition font-medium"
      title="Klik untuk keluar mode admin"
    >
      🔑 Ketua
    </button>
  )
}
