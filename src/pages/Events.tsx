import { useState } from 'react'
import { useEvents, useAddEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents'
import type { Event } from '../types'

type FormData = { title: string; date: string; location: string }

const emptyForm: FormData = { title: '', date: '', location: '' }

function sisaHari(tanggal: string): number {
  const ms = new Date(tanggal).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function Events() {
  const { data: events, isLoading } = useEvents()
  const addEvent = useAddEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function clearError() {
    setErrorMsg('')
    addEvent.reset()
    updateEvent.reset()
    deleteEvent.reset()
  }

  function startEdit(ev: Event) {
    setEditingId(ev.id)
    setForm({ title: ev.title, date: ev.date, location: ev.location ?? '' })
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
    if (!form.title.trim() || !form.date) return
    clearError()

    try {
      if (editingId) {
        await updateEvent.mutateAsync({
          id: editingId,
          title: form.title.trim(),
          date: form.date,
          location: form.location.trim() || undefined,
        })
      } else {
        await addEvent.mutateAsync({
          title: form.title.trim(),
          date: form.date,
          location: form.location.trim() || undefined,
        })
      }
      cancelForm()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kegiatan.'
      setErrorMsg(msg)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus kegiatan "${title}"? Data absensi terkait juga akan terhapus.`)) return
    clearError()
    try {
      await deleteEvent.mutateAsync(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus kegiatan.'
      setErrorMsg(msg)
    }
  }

  // Pisahkan upcoming vs lampau
  const upcoming = events?.filter((ev) => sisaHari(ev.date) >= 0) ?? []
  const past = events?.filter((ev) => sisaHari(ev.date) < 0) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📅 Kegiatan</h1>
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
            {editingId ? '✏️ Edit Kegiatan' : '➕ Kegiatan Baru'}
          </h2>
          <input
            type="text"
            placeholder="Nama kegiatan *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            required
            autoFocus
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            required
          />
          <input
            type="text"
            placeholder="Lokasi (opsional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          {errorMsg && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              <p className="text-danger text-xs">⚠️ {errorMsg}</p>
              <p className="text-text-muted text-[10px] mt-1">
                Kalau pesan 'permission denied' atau 'new row violates row-level security',
                jalankan ulang supabase/setup-full.sql di SQL Editor (idempotent, aman).
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addEvent.isPending || updateEvent.isPending}
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
      ) : events && events.length > 0 ? (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider">Akan Datang</h2>
              {upcoming.map((ev) => {
                const hari = sisaHari(ev.date)
                return (
                  <div
                    key={ev.id}
                    className="bg-bg-card rounded-xl px-4 py-3 border border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {formatDate(ev.date)}
                          {ev.location && <span> · {ev.location}</span>}
                        </p>
                        <p className="text-primary text-xs mt-1 font-medium">
                          {hari === 0 ? '🔖 Hari ini!' : `⏱ ${hari} hari lagi`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(ev)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-secondary hover:bg-white/5 transition text-xs"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id, ev.title)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-white/5 transition text-xs"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider">Sudah Lewat</h2>
              {past.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-bg-card rounded-xl px-4 py-3 border border-white/10 opacity-70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{ev.title}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {formatDate(ev.date)}
                        {ev.location && <span> · {ev.location}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(ev)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-secondary hover:bg-white/5 transition text-xs"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id, ev.title)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-white/5 transition text-xs"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-text-muted text-xs text-center pt-2">
            {events.length} kegiatan
          </p>
        </div>
      ) : (
        <div className="text-center py-12 space-y-2">
          <p className="text-text-muted text-sm">Belum ada kegiatan</p>
          <p className="text-text-muted text-xs">Tekan tombol + Tambah untuk membuat kegiatan</p>
        </div>
      )}
    </div>
  )
}
