import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'

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
      const { data, error: rpcError } = await supabase.rpc('admin_verify_pin', {
        p_pin: pinInput.trim(),
      })

      if (rpcError) throw rpcError

      if (data === true) {
        login(pinInput.trim())
      } else {
        setError('PIN salah')
      }
    } catch (err: any) {
      console.error('Gagal masuk Mode Ketua:', err)
      setError('Gagal masuk Mode Ketua: ' + (err?.message || 'error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#1B7A3D]/15 text-[#1B7A3D]">
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
              className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-sm text-text focus:outline-none focus:border-primary"
              required
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : '🔓 Masuk Mode Ketua'}
          </button>
        </form>

        <p className="text-xs text-text-muted text-center">
          PIN default: 1234 (segera ganti setelah masuk)
        </p>
      </div>
    </div>
  )
}
