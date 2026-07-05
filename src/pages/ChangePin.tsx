import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'

export function ChangePin() {
  const { isAdmin } = useAdmin()
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoveryPin, setRecoveryPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!oldPin || !newPin || !confirmPin) {
      setError('PIN lama, PIN baru, dan konfirmasi PIN wajib diisi.')
      return
    }
    if (newPin !== confirmPin) {
      setError('PIN baru dan konfirmasi PIN tidak sama.')
      return
    }
    if (newPin.length < 4) {
      setError('PIN baru minimal 4 digit.')
      return
    }

    setLoading(true)

    try {
      const { error: rpcError } = await supabase.rpc('admin_change_pin', {
        p_old_pin: oldPin,
        p_new_pin: newPin,
        p_recovery_pin: recoveryPin.trim() || null,
      })

      if (rpcError) {
        setError(rpcError.message || 'Gagal mengganti PIN.')
        return
      }

      // Update PIN in session storage so current session keeps working
      sessionStorage.setItem('aptama_admin_pin', newPin)

      setSuccess(true)
      setOldPin('')
      setNewPin('')
      setConfirmPin('')
      setRecoveryPin('')
    } catch (err: any) {
      setError('Gagal mengganti PIN: ' + (err?.message ?? 'error tidak diketahui'))
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Halaman ini khusus ketua.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">🔐</div>
        <h1 className="text-xl font-bold">Ganti PIN Ketua</h1>
        <p className="text-text-muted text-sm">
          Ubah PIN akses Mode Ketua. Isi Recovery PIN untuk bisa reset PIN kalau lupa.
        </p>
      </div>

      {success && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
          <p className="text-success text-sm font-medium">✅ PIN berhasil diganti!</p>
          <p className="text-text-muted text-xs mt-1">
            PIN baru sudah aktif dan tersimpan di perangkat ini.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">PIN Lama</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="PIN lama"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] text-text focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">PIN Baru</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="PIN baru"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] text-text focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Konfirmasi PIN Baru</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Ulangi PIN baru"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] text-text focus:outline-none focus:border-primary"
          />
        </div>

        <div className="pt-2 border-t border-white/10">
          <label className="text-xs text-text-muted mb-1 block">Recovery PIN (opsional)</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Atur recovery PIN"
            value={recoveryPin}
            onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] text-text focus:outline-none focus:border-primary"
          />
          <p className="text-[10px] text-text-muted mt-1">
            Recovery PIN dipakai kalau ketua lupa PIN. Default: 123456.
          </p>
        </div>

        {error && <p className="text-danger text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !oldPin || !newPin || !confirmPin}
          className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {loading ? 'Mengganti...' : '🔐 Simpan PIN Baru'}
        </button>
      </form>

      <p className="text-xs text-text-muted text-center">
        PIN disimpan sebagai hash di database. Pastikan kamu ingat PIN baru.
      </p>
    </div>
  )
}
