import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function ModeKetuaPage() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!pin) {
      setError('PIN wajib diisi')
      return
    }

    setLoading(true)

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_verify_pin', {
        p_pin: pin,
      })

      if (rpcError) throw rpcError

      if (data === true) {
        localStorage.setItem('aptama_admin_pin', pin)
        navigate('/admin')
      } else {
        setError('PIN salah')
      }
    } catch (err: any) {
      console.error('Verifikasi PIN gagal:', err)
      setError('Gagal verifikasi PIN: ' + (err?.message || 'error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-bold">Mode Ketua</h1>
          <p className="text-sm text-text-muted">
            Masukkan PIN rahasia untuk akses dashboard admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
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
