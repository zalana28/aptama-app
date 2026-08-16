import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import { useMembers } from '../hooks/useMembers'
import { useAdmin } from '../hooks/useAdmin'
import { getAdminToken } from '../lib/admin'
import { supabase } from '../lib/supabase'

interface ImportRow {
  name: string
  status: string
  note?: string
  found?: boolean
}

function parseInput(text: string): ImportRow[] {
  const rows: ImportRow[] = []
  const lines = text.trim().split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Support: Nama,Status | Nama,Status,Note | Nama\tStatus
    const parts = trimmed.split(/[,\t|]/).map((s) => s.trim())
    if (parts.length < 2) continue
    const name = parts[0]
    const statusRaw = parts[1].toLowerCase()
    const status = statusRaw === 'tidak izin' || statusRaw === 'tidak hadir' ? 'alfa' : statusRaw
    const note = parts.slice(2).join(', ') || undefined
    rows.push({ name, status, note })
  }
  return rows
}

export function ImportData() {
  const { data: events } = useEvents()
  const { data: members } = useMembers()
  const { isAdmin } = useAdmin()
  const [eventId, setEventId] = useState('')
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [error, setError] = useState('')

  function handleParse() {
    const parsed = parseInput(raw)
    const enriched = parsed.map((r) => ({
      ...r,
      found: members?.some((m) => m.name.toLowerCase() === r.name.toLowerCase()) ?? false,
    }))
    setRows(enriched)
    setImportedCount(null)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRaw(text)
    const parsed = parseInput(text)
    const enriched = parsed.map((r) => ({
      ...r,
      found: members?.some((m) => m.name.toLowerCase() === r.name.toLowerCase()) ?? false,
    }))
    setRows(enriched)
    setImportedCount(null)
  }

  async function handleImport() {
    if (!eventId || rows.length === 0) return
    let token: string
    try { token = getAdminToken() } catch { setError('Sesi admin berakhir. Login ulang.'); return }

    setLoading(true)
    setError('')
    setImportedCount(null)

    const payload = rows.map((r) => ({
      name: r.name,
      status: r.status,
      note: r.note,
    }))

    const { data, error: rpcError } = await supabase.rpc('import_attendances', {
      p_token: token,
      p_event_id: eventId,
      p_rows: payload,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message || 'Gagal import data.')
      return
    }

    setImportedCount(data ?? 0)
    setRows([])
    setRaw('')
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
      <h1 className="text-xl font-bold">📥 Import Rekap Lama</h1>
      <p className="text-text-muted text-sm">
        Masukkan data absensi lama untuk satu kegiatan. Format: <code className="bg-text/[0.10] px-1 rounded">Nama,Status</code> atau{' '}
        <code className="bg-text/[0.10] px-1 rounded">Nama,Status,Catatan</code>. Status: hadir / izin / alfa.
      </p>

      <div>
        <label className="text-xs text-text-muted mb-1 block">Kegiatan</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
        >
          <option value="">— Pilih kegiatan —</option>
          {events?.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-muted mb-1 block">Upload CSV / TXT</label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-text/[0.10] file:text-text hover:file:bg-white/20"
        />
      </div>

      <div>
        <label className="text-xs text-text-muted mb-1 block">Atau paste data</label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Budi, hadir&#10;Siti, izin, sakit&#10;Andi, alfa"
          rows={8}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
        />
      </div>

      <button
        onClick={handleParse}
        disabled={!raw.trim()}
        className="w-full bg-text/[0.05] text-text px-4 py-2 rounded-lg text-sm font-medium hover:bg-text/[0.10] transition disabled:opacity-50"
      >
        🔍 Parse Data
      </button>

      {rows.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium">Preview ({rows.length} baris)</span>
            <span className="text-xs text-text-muted">
              {rows.filter((r) => r.found).length} nama cocok
            </span>
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-auto">
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className={`truncate ${r.found ? 'text-text' : 'text-danger'}`}>
                    {r.name}
                  </p>
                  {r.note && <p className="text-[10px] text-text-muted truncate">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(r.status)}`}>
                    {r.status}
                  </span>
                  {!r.found && <span className="text-[10px] text-danger">tidak ada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {importedCount !== null && (
        <p className="text-success text-sm">
          ✅ Berhasil import {importedCount} baris.
        </p>
      )}

      <button
        onClick={handleImport}
        disabled={loading || rows.length === 0 || !eventId}
        className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
      >
        {loading ? 'Mengimport...' : '📥 Import ke Database'}
      </button>
    </div>
  )
}

function statusBadge(status: string): string {
  if (status === 'hadir') return 'bg-success/20 text-success'
  if (status === 'izin') return 'bg-warning/20 text-warning'
  return 'bg-danger/20 text-danger'
}
