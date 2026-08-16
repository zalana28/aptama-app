import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'
import { loginErrorMessage } from '../lib/admin'

export function ModeKetuaGate() {
  const [pinInput, setPinInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAdmin()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!pinInput.trim()) {
      setError('Masukkan PIN dulu')
      return
    }

    setLoading(true)

    try {
      const result = await login(pinInput.trim())
      if (!result.ok) setError(loginErrorMessage(result))
    } catch (err: unknown) {
      setError('Gagal verifikasi: ' + (err instanceof Error ? err.message : 'error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-bold">Mode Ketua</h1>
          <p className="text-sm text-text-muted">
            Masukkan PIN untuk mengakses menu pengurus.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              PIN Ketua
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Masukkan PIN"
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.3em] text-text focus:outline-none focus:border-primary shadow-sm"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-xs font-medium">⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
          >
            {loading ? 'Memverifikasi...' : '🔓 Masuk Mode Ketua'}
          </button>
        </form>

        <p className="text-xs text-text-muted text-center">
          Ganti PIN default segera setelah login pertama kali.
        </p>
      </div>
    </div>
  )
}
