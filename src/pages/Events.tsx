import { useState } from 'react'
import { useEvents, useAddEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents'
import { useAdmin } from '../hooks/useAdmin'
import { errorMessage } from '../lib/errors'
import type { Event } from '../types'

type FormData = { title: string; date: string; time: string; location: string }

const emptyForm: FormData = { title: '', date: '', time: '', location: '' }

function sisaHari(tanggal: string): number {
  const ms = new Date(tanggal + 'T00:00:00').getTime() - Date.now()
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
  const { isAdmin } = useAdmin()
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
    setForm({ title: ev.title, date: ev.date, time: ev.time ?? '', location: ev.location ?? '' })
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
          time: form.time.trim() || undefined,
          location: form.location.trim() || undefined,
        })
      } else {
        await addEvent.mutateAsync({
          title: form.title.trim(),
          date: form.date,
          time: form.time.trim() || undefined,
          location: form.location.trim() || undefined,
        })
      }
      cancelForm()
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan kegiatan.'))
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus kegiatan "${title}"? Data absensi terkait juga akan terhapus.`)) return
    clearError()
    try {
      await deleteEvent.mutateAsync(id)
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Gagal menghapus kegiatan.'))
    }
  }

  // Pisahkan upcoming vs lampau
  const upcoming = events?.filter((ev) => sisaHari(ev.date) >= 0) ?? []
  const past = events?.filter((ev) => sisaHari(ev.date) < 0) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">📅 Kegiatan</h1>
          <p className="text-xs text-text-muted mt-0.5">Jadwal kegiatan kepemudaan APTAMA</p>
        </div>
        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-light transition shadow-md shadow-primary/20 active:scale-95"
          >
            + Tambah
          </button>
        )}
      </div>

      {/* Form (Admin only) */}
      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl p-4 space-y-3 border border-border shadow-sm">
          <h2 className="font-semibold text-sm">
            {editingId ? '✏️ Edit Kegiatan' : '➕ Kegiatan Baru'}
          </h2>
          <input
            type="text"
            placeholder="Nama kegiatan *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Tanggal *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Jam Mulai</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Lokasi (opsional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          {errorMsg && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-3 py-2">
              <p className="text-danger text-xs">⚠️ {errorMsg}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addEvent.isPending || updateEvent.isPending}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50 active:scale-95"
            >
              {editingId ? 'Simpan' : 'Tambah'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-text hover:bg-bg-card-hover transition"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-text-muted text-sm text-center py-8">Memuat kegiatan...</p>
      ) : events && events.length > 0 ? (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Akan Datang</h2>
              {upcoming.map((ev) => {
                const hari = sisaHari(ev.date)
                return (
                  <div
                    key={ev.id}
                    className="bg-bg-card rounded-2xl px-4 py-3.5 border border-primary/30 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-text">{ev.title}</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {formatDate(ev.date)}
                          {ev.time && <span> · {ev.time} WIB</span>}
                          {ev.location && <span> · {ev.location}</span>}
                        </p>
                        <p className="text-primary text-xs mt-1.5 font-semibold">
                          {hari === 0 ? '🔖 Hari ini!' : `⏱ ${hari} hari lagi`}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => startEdit(ev)}
                            className="p-2 rounded-xl text-text-muted hover:text-secondary hover:bg-bg-card-hover transition text-xs active:scale-95"
                            title="Edit"
                            aria-label={`Edit ${ev.title}`}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id, ev.title)}
                            className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-bg-card-hover transition text-xs active:scale-95"
                            title="Hapus"
                            aria-label={`Hapus ${ev.title}`}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sudah Lewat</h2>
              {past.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-bg-card rounded-2xl px-4 py-3.5 border border-border opacity-75"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-text">{ev.title}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {formatDate(ev.date)}
                        {ev.time && <span> · {ev.time} WIB</span>}
                        {ev.location && <span> · {ev.location}</span>}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => startEdit(ev)}
                          className="p-2 rounded-xl text-text-muted hover:text-secondary hover:bg-bg-card-hover transition text-xs active:scale-95"
                          title="Edit"
                          aria-label={`Edit ${ev.title}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id, ev.title)}
                          className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-bg-card-hover transition text-xs active:scale-95"
                          title="Hapus"
                          aria-label={`Hapus ${ev.title}`}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-text-muted text-xs text-center pt-2">
            {events.length} kegiatan tercatat
          </p>
        </div>
      ) : (
        <div className="text-center py-12 space-y-2 bg-bg-card border border-border rounded-2xl p-6">
          <p className="text-text-muted text-sm font-medium">Belum ada kegiatan</p>
          <p className="text-text-muted text-xs">
            {isAdmin ? 'Tekan tombol + Tambah untuk membuat jadwal kegiatan' : 'Belum ada kegiatan yang dijadwalkan oleh pengurus'}
          </p>
        </div>
      )}
    </div>
  )
}
