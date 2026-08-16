import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, UserPlus, Edit3, Trash2, Users } from 'lucide-react'
import { useAdminMembers, useAddMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers'
import { errorMessage } from '../lib/errors'
import type { AdminMember } from '../hooks/useMembers'

type FormData = { name: string; group: string; phone: string }

const emptyForm: FormData = { name: '', group: '', phone: '' }

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (name[0] ?? '?').toUpperCase()
}

export function Members() {
  const { data: members = [], isLoading } = useAdminMembers()
  const addMember = useAddMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [search, setSearch] = useState('')
  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.group ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q)
    )
  }, [members, search])

  function clearError() {
    setErrorMsg('')
    addMember.reset()
    updateMember.reset()
    deleteMember.reset()
  }

  function startEdit(m: AdminMember) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Users size={22} className="text-primary" />
            <span>Kelola Anggota</span>
          </h1>
          <p className="text-xs text-text-muted">
            Total {members.length} pemuda terdaftar di APTAMA
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-primary-light transition shadow-sm active:scale-95"
          >
            <UserPlus size={15} />
            <span>+ Tambah</span>
          </button>
        )}
      </div>

      {/* Form Drawer / Card */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            onSubmit={handleSubmit}
            className="bg-bg-card rounded-2xl p-5 space-y-3.5 border border-primary/30 shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-text">
                {editingId ? '✏️ Edit Data Anggota' : '➕ Tambah Anggota Baru'}
              </h2>
              <button
                type="button"
                onClick={cancelForm}
                className="text-text-muted hover:text-text p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-text-muted mb-1 block">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Zaki Maulana"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted mb-1 block">
                    RT / RW / Divisi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: RT 01 / Anggota"
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                    className="w-full bg-bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted mb-1 block">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    placeholder="08..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
                <p className="text-danger text-xs font-medium">⚠️ {errorMsg}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={addMember.isPending || updateMember.isPending}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-primary-light transition disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {editingId ? '💾 Simpan Perubahan' : '➕ Tambahkan Anggota'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2.5 rounded-xl text-xs text-text-muted hover:text-text hover:bg-text/[0.05] transition"
              >
                Batal
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          placeholder="Cari anggota dari 50 nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-xl pl-10 pr-9 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* List Members */}
      {isLoading ? (
        <div className="text-center py-12 space-y-2">
          <div className="mx-auto h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-xs">Memuat daftar anggota...</p>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="space-y-2">
          {filteredMembers.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              className="bg-bg-card rounded-2xl px-4 py-3 flex items-center justify-between border border-border hover:border-primary/40 transition shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                  {getInitials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-text truncate">{m.name}</p>
                  <p className="text-text-muted text-xs truncate">
                    {m.group && <span>{m.group}</span>}
                    {m.group && m.phone && <span> · </span>}
                    {m.phone && <span className="font-mono text-[11px]">{m.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 ml-3 shrink-0">
                <button
                  onClick={() => startEdit(m)}
                  className="p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 transition text-xs"
                  title="Edit data anggota"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition text-xs"
                  title="Hapus anggota"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
          <p className="text-text-muted text-xs text-center pt-2">
            Menampilkan {filteredMembers.length} dari {members.length} anggota
          </p>
        </div>
      ) : (
        <div className="text-center py-12 space-y-2 rounded-2xl border border-dashed border-border bg-bg-card/50">
          <p className="text-text-muted text-sm font-medium">Tidak ada anggota ditemukan</p>
          <p className="text-text-muted text-xs">
            {search ? 'Coba cari dengan kata kunci lain' : 'Tekan tombol + Tambah untuk menambah anggota baru'}
          </p>
        </div>
      )}
    </div>
  )
}
