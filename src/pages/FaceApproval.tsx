import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'
import type { Member } from '../types'

export function FaceApproval() {
  const { isAdmin } = useAdmin()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .in('face_status', ['pending', 'approved'])
      .order('face_enrolled_at', { ascending: false })
    if (!error) setMembers((data ?? []) as Member[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleApprove(memberId: string, approve: boolean) {
    const pin = localStorage.getItem('aptama_admin_pin')
    if (!pin) return
    setActionId(memberId)
    const { error } = await supabase.rpc('admin_approve_face', {
      p_pin: pin,
      p_member_id: memberId,
      p_approve: approve,
    })
    setActionId(null)
    if (!error) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, face_status: approve ? 'approved' : 'none' }
            : m,
        ),
      )
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🛡️ Verifikasi Wajah</h1>
        <button
          onClick={load}
          className="text-xs text-primary hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm text-center py-8">Memuat...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">Belum ada pendaftaran wajah.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-bg-card rounded-xl p-4 border border-white/10 flex items-start gap-4"
            >
              <div className="shrink-0 w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                {m.face_selfie_url ? (
                  <SelfieImage path={m.face_selfie_url} />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Status:{' '}
                  <span
                    className={`font-medium ${
                      m.face_status === 'approved'
                        ? 'text-success'
                        : m.face_status === 'pending'
                        ? 'text-warning'
                        : 'text-text-muted'
                    }`}
                  >
                    {m.face_status === 'approved'
                      ? 'Disetujui'
                      : m.face_status === 'pending'
                      ? 'Menunggu'
                      : 'Belum daftar'}
                  </span>
                </p>
                {m.face_enrolled_at && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Daftar: {new Date(m.face_enrolled_at).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              {m.face_status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(m.id, true)}
                    disabled={actionId === m.id}
                    className="bg-success text-bg px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-success/80 transition disabled:opacity-50"
                  >
                    {actionId === m.id ? '...' : 'Setuju'}
                  </button>
                  <button
                    onClick={() => handleApprove(m.id, false)}
                    disabled={actionId === m.id}
                    className="bg-danger text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-danger/80 transition disabled:opacity-50"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SelfieImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.storage
      .from('selfies')
      .createSignedUrl(path, 60)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) setUrl(data.signedUrl)
      })
  }, [path])

  if (!url) return <span className="text-2xl">📷</span>
  return (
    <img
      src={url}
      alt="selfie"
      className="w-full h-full object-cover"
    />
  )
}
