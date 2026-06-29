import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMembers, useAddMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers'
import { errorMessage } from '../lib/errors'
import type { Member } from '../types'

type FormData = { name: string; group: string; phone: string }

const emptyForm: FormData = { name: '', group: '', phone: '' }

function FaceStatusBadge({ status }: { status?: Member['face_status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    approved: { label: '✓ Wajah', className: 'text-success' },
    pending: { label: '⏳ Wajah', className: 'text-warning' },
    none: { label: '✕ Wajah', className: 'text-text-muted' },
  }
  const cfg = map[status ?? 'none']
  return (
    <Link to="/daftar-wajah" className={`text-xs hover:underline ${cfg.className}`}>
      {cfg.label}
    </Link>
  )
}

export function Members() {
  const { data: members, isLoading } = useMembers()
  const addMember = useAddMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function clearError() {
    setErrorMsg('')
    addMember.reset()
    updateMember.reset()
    deleteMember.reset()
  }

  function startEdit(m: Member) {
    setEditingId(m.id)
    setForm({ name: m.name, group: m.group ?? '', phone: m.phone ?? '' })
    setShowForm(true)
    clearError()
  }

  function cancelForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
    clearError()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    clearError()

    try {
      if (editingId) {
        await updateMember.mutateAsync({
          id: editingId,
          name: form.name.trim(),
          group: form.group.trim() || undefined,
          phone: form.phone.trim() || undefined,
        })
      } else {
        await addMember.mutateAsync({
          name: form.name.trim(),
          group: form.group.trim() || undefined,
          phone: form.phone.trim() || undefined,
        })
      }
      cancelForm()
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan anggota.'))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus anggota "${name}"?`)) return
    clearError()
    try {
      await deleteMember.mutateAsync(id)
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Gagal menghapus anggota.'))
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">👥 Anggota</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-light transition"
          >
            + Tambah
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card rounded-xl p-4 space-y-3 border border-white/10">
          <h2 className="font-medium text-sm">
            {editingId ? '✏️ Edit Anggota' : '➕ Anggota Baru'}
          </h2>
          <input
            type="text"
            placeholder="Nama lengkap *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            required
            autoFocus
          />
          <input
            type="text"
            placeholder="RT/RW atau divisi (opsional)"
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <input
            type="tel"
            placeholder="No. HP (opsional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          {errorMsg && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 space-y-1">
              <p className="text-danger text-xs">⚠️ {errorMsg}</p>
              <p className="text-text-muted text-[10px]">
                Diagnostik: jalanin query ini di Supabase SQL Editor untuk cek status RLS:
              </p>
              <code className="block bg-bg-input text-text-muted text-[10px] px-2 py-1 rounded font-mono whitespace-pre">
                SELECT relname, relrowsecurity{'\n'}FROM pg_class{'\n'}WHERE relname IN ('members','events','attendances');
              </code>
              <p className="text-text-muted text-[10px]">
                Kalau relrowsecurity = true, RLS aktif — pastikan setup-full.sql versi terbaru sudah dijalankan.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addMember.isPending || updateMember.isPending}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
            >
              {editingId ? 'Simpan' : 'Tambah'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-text-muted text-sm text-center py-8">Memuat...</p>
      ) : members && members.length > 0 ? (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-bg-card rounded-xl px-4 py-3 flex items-center justify-between border border-white/10"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-text-muted text-xs truncate">
                  {m.group && <span>{m.group}</span>}
                  {m.group && m.phone && <span> · </span>}
                  {m.phone && <span>{m.phone}</span>}
                  {!m.group && !m.phone && <FaceStatusBadge status={m.face_status} />}
                </p>
                {(m.group || m.phone) && (
                  <p className="text-text-muted text-xs truncate mt-0.5">
                    <FaceStatusBadge status={m.face_status} />
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-3 shrink-0">
                <button
                  onClick={() => startEdit(m)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-secondary hover:bg-white/5 transition text-xs"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-white/5 transition text-xs"
                  title="Hapus"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          <p className="text-text-muted text-xs text-center pt-2">
            {members.length} anggota
          </p>
        </div>
      ) : (
        <div className="text-center py-12 space-y-2">
          <p className="text-text-muted text-sm">Belum ada anggota</p>
          <p className="text-text-muted text-xs">Tekan tombol + Tambah untuk menambah anggota</p>
        </div>
      )}
    </div>
  )
}
