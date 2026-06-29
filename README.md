# 🗑️ APTAMA Attendance

> Aplikasi absensi pemuda untuk kegiatan bersih sampah — **Angkatan Pucanganom Tiga Muda**.

[![Live](https://img.shields.io/badge/Live-aptama--app.vercel.app-1B7A3D)](https://aptama-app.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-React_19_+_TS_+_Supabase-9A8C2E)](#-tech-stack)

---

## ✨ Fitur

- **Home** — landing & ringkasan
- **Anggota** — CRUD data anggota + grup + kontak
- **Kegiatan** — CRUD kegiatan + countdown ke batas check-in
- **Absensi** — absensi per kegiatan (hadir / izin / alfa)
- **Rekap** — rekap per kegiatan & per anggota, share WhatsApp, export CSV
- **QR Scan** — generate QR code kegiatan + absen via scan (HP kedua)
- **Self-Service** — pengajuan izin mandiri + check-in rumah
- **Admin PIN Gate** — mode ketua/admin dilindungi PIN

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| UI | **React 19** + **TypeScript** (strict) |
| Build | **Vite 8** (HMR + bundler mode) |
| Styling | **Tailwind CSS 4** + custom theme hijau–emas |
| Routing | **React Router 7** |
| Data | **TanStack Query 5** |
| Backend | **Supabase** (Postgres + Auth + Realtime) |
| Misc | framer-motion · lucide-react · qrcode.react |
| Lint | oxlint |

## 📁 Struktur

```
src/
  components/      # AdminGate, Navbar, Drawer, Logo, ui/ (Button, Card, StatCard)
  hooks/           # useMembers, useEvents, useAttendance, useAdmin
  lib/             # supabase client
  pages/           # Home, Members, Events, Attendance, GenerateQR,
                   # ScanPage, Recap, AjukanIzin, SelfCheckIn
  types.ts
  index.css        # @theme palette (primary #1B7A3D · secondary #9A8C2E)
supabase/
  setup-full.sql   # ⭐ run ini di SQL Editor (idempotent)
  schema.sql       # legacy: tables + views + RPC
  admin-pin.sql    # konfigurasi PIN admin
  qr-tokens.sql    # tabel token QR scan
```

## 🚀 Setup

### 1. Clone & install

```bash
git clone https://github.com/zalana28/aptama-app
cd aptama-app
npm install
```

### 2. Provision Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** di dashboard.
3. Copy-paste isi `supabase/setup-full.sql` lalu **Run**. Script ini idempotent (aman diulang).
4. (Opsional) Ganti PIN admin default — lihat `supabase/admin-pin.sql`.
5. Buka **Settings → API**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Environment

```bash
cp .env.example .env
# edit .env, isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
```

> ⚠️ Tanpa env yang valid, aplikasi menampilkan **Setup Notice** alih-alih crash.

### 4. Jalankan

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # preview production build
```

## 🛣️ Routes

| Path | Halaman | Butuh Admin PIN |
|---|---|---|
| `/` | Home | — |
| `/anggota` | Members | ✓ |
| `/kegiatan` | Events | ✓ |
| `/absensi` | Attendance | ✓ |
| `/generate-qr` | GenerateQR | ✓ |
| `/rekap` | Recap | — |
| `/izin` | AjukanIzin | — |
| `/checkin` | SelfCheckIn | — |
| `/scan` | ScanPage | — |

Logika PIN: `src/hooks/useAdmin.tsx` + guard `<AdminGate>` di `src/components/AdminGate.tsx`.

## 🗃️ Database

Skema dipisah **view** untuk menjaga privasi anggota:

| Object | Tipe | Isi |
|---|---|---|
| `members` | table | data anggota + grup + phone |
| `events` | table | judul, tanggal, lokasi, batas check-in |
| `attendances` | table | hadir/izin/alfa + **note** (alasan izin) |
| `attendance_public` | view | attendances TANPA `note` |
| `event_recap` | view | rekap jumlah per kegiatan |
| `member_recap` | view | rekap jumlah per anggota |
| `admin_config` | table | konfigurasi (mis. PIN admin) |
| `qr_tokens` | table | token QR scan |

**RPC (security definer, grant ke `anon`):**
- `submit_izin(event_id, member_id, reason)` — izin mandiri, upsert dengan `note`
- `self_check_in(event_id, member_id)` — check-in sebelum jam kegiatan, validasi `now() < checkin_close_at`

## 🎨 Tema

| Token | Value |
|---|---|
| `--color-primary` | `#1B7A3D` (hijau) |
| `--color-secondary` | `#9A8C2E` (emas) |
| `--color-bg` | `#0B0F0D` (hijau-arang) |
| `--font-heading` | Sora |
| `--font-body` | Plus Jakarta Sans |

## 📦 Scripts

| Script | Perintah |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `lint` | `oxlint` |
| `preview` | `vite preview` |

## 🔒 Keamanan

- Row-Level Security **belum diaktifkan** — saat ini semua read/write lewat view publik + RPC `security definer`. Cocok untuk lingkungan internal/kepercayaan.
- Anon key boleh di-expose (sudah didesain publik); yang dirahasiakan hanya **service_role key** (jangan pernah pakai di frontend).

## 📄 Lisensi

Private — internal use only.
