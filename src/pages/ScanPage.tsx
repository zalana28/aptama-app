import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Member } from '../types'

export function ScanPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [members, setMembers] = useState<Member[]>([])
  const [memberId, setMemberId] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => setMembers((data ?? []) as Member[]))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !token) return
    setError('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('scan_qr_attendance', {
      p_token: token,
      p_member_id: memberId,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message || 'Gagal absen. Coba lagi.')
      return
    }
    setDone(true)
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">QR Tidak Valid</h1>
        <p className="text-text-muted text-sm">
          Link QR tidak ditemukan. Minta ketua untuk generate QR baru.
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-success">Absen Berhasil!</h1>
        <p className="text-text-muted text-sm">
          Kehadiranmu sudah tercatat. Sampai jumpa di lokasi!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">📱</div>
        <h1 className="text-xl font-bold">Scan Absen</h1>
        <p className="text-text-muted text-sm">
          Pilih namamu untuk menandai kehadiran.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Nama</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-3 text-base text-text focus:outline-none focus:border-primary"
            required
            autoFocus
          >
            <option value="">— Pilih nama —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !memberId}
          className="w-full bg-primary text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-primary-light transition disabled:opacity-50"
        >
          {loading ? 'Memproses...' : '✅ Absen Sekarang'}
        </button>
      </form>
    </div>
  )
}
