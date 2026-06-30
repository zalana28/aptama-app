import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAdmin } from '../hooks/useAdmin'

type MemberPending = {
  id: string
  name: string
  group: string | null
  face_status: string | null
  face_enrolled_at: string | null
  face_selfie_url: string | null
}

export function FaceApproval() {
  const { isAdmin } = useAdmin()
  const queryClient = useQueryClient()
  const [members, setMembers] = useState<MemberPending[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members_public')
      .select('id, name, group, face_status, face_enrolled_at')
      .eq('face_status', 'pending')
      .order('face_enrolled_at', { ascending: true })
    if (!error) setMembers((data ?? []) as MemberPending[])
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
      // Invalidate queries supaya list pending refresh
      await queryClient.invalidateQueries({ queryKey: ['pending-faces'] })
      await queryClient.invalidateQueries({ queryKey: ['members-need-face-enroll'] })
      await queryClient.invalidateQueries({ queryKey: ['members-public'] })
      
      // Remove dari list lokal (karena sudah approved/rejected, bukan pending lagi)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
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
        <div className="text-center py-12 space-y-2">
          <div className="text-5xl">✅</div>
          <p className="text-text-muted text-sm">Tidak ada pendaftaran wajah yang menunggu.</p>
          <p className="text-xs text-text-muted">
            Semua anggota yang daftar sudah di-approve atau di-reject.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-bg-card rounded-xl p-4 border border-white/10 flex items-start gap-4"
            >
              <div className="shrink-0 w-16 h-16 bg-text/[0.05] rounded-xl flex items-center justify-center overflow-hidden">
                <span className="text-2xl">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.name}</p>
                {m.group && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {m.group}
                  </p>
                )}
                {m.face_enrolled_at && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Daftar: {new Date(m.face_enrolled_at).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              {/* Semua di list ini adalah pending, jadi langsung tampilkan tombol */}
              {(
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
