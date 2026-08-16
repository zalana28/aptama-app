import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'
import { getAdminToken } from '../lib/admin'

export function ChangePin() {
  const { isAdmin } = useAdmin()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoveryPin, setRecoveryPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!newPin || !confirmPin) {
      setError('PIN baru dan konfirmasi PIN wajib diisi.')
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
      const token = getAdminToken()
      const { error: rpcError } = await supabase.rpc('admin_change_pin', {
        p_token: token,
        p_new_pin: newPin,
        p_recovery_pin: recoveryPin.trim() || null,
      })

      if (rpcError) {
        setError(rpcError.message || 'Gagal mengganti PIN.')
        return
      }

      setSuccess(true)
      setNewPin('')
      setConfirmPin('')
      setRecoveryPin('')
    } catch (err: unknown) {
      setError('Gagal mengganti PIN: ' + (err instanceof Error ? err.message : 'error tidak diketahui'))
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
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <div className="text-center space-y-1.5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <KeyRound size={28} />
        </div>
        <h1 className="text-2xl font-bold text-text">Ganti PIN Ketua</h1>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          Ubah PIN keamanan untuk mengakses Dashboard Pengurus.
        </p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-success/15 border border-success/30 rounded-2xl p-4 text-center space-y-1"
        >
          <div className="flex items-center justify-center gap-1.5 text-success font-bold text-sm">
            <CheckCircle2 size={18} />
            <span>PIN Berhasil Diperbarui!</span>
          </div>
          <p className="text-text-muted text-xs">
            Gunakan PIN baru ini saat masuk ke Dashboard Pengurus berikutnya.
          </p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl p-5 border border-border space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-text-muted">PIN Baru (4-6 Angka)</label>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showPin ? 'Sembunyikan' : 'Lihat'}</span>
          </button>
        </div>

        <div>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.3em] font-mono text-text focus:outline-none focus:border-primary shadow-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted mb-1 block">Konfirmasi PIN Baru</label>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-center text-lg tracking-[0.3em] font-mono text-text focus:outline-none focus:border-primary shadow-sm"
          />
        </div>

        <div className="pt-2 border-t border-border space-y-1">
          <label className="text-xs font-semibold text-text-muted block">Recovery PIN (Cadangan)</label>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Default: 123456"
            value={recoveryPin}
            onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-bg-input border border-border rounded-xl px-4 py-2.5 text-center text-sm tracking-[0.2em] font-mono text-text focus:outline-none focus:border-primary shadow-sm"
          />
          <p className="text-[10px] text-text-muted">
            Dipakai untuk reset jika Ketua lupa PIN.
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
            <p className="text-danger text-xs font-medium">⚠️ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !newPin || !confirmPin}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20"
        >
          <ShieldCheck size={16} />
          <span>{loading ? 'Menyimpan...' : 'Simpan PIN Baru'}</span>
        </button>
      </form>
    </div>
  )
}
