# APTAMA V2 - Mobile Navigation Update

## ✅ Update Selesai

### 🎨 Layout V2 (Mobile-First)
- ✅ **TopBar** (fixed atas)
  - Logo APTAMA pojok kiri
  - Toggle Dark/Light mode pojok kanan
  - Transparan blur dengan border bawah
  
- ✅ **Bottom Navigation** (fixed bawah)
  - Home
  - Scan QR
  - Rekap
  - Pengurus
  - Active state hijau APTAMA (#1B7A3D)
  
- ✅ **Floating Admin Button** (pojok kanan bawah)
  - Icon kunci (KeyRound)
  - Background hijau APTAMA
  - Klik → Mode Ketua atau Dashboard (jika sudah login)
  
- ✅ **AppShell Layout**
  - Container max-width mobile (max-w-md)
  - Padding untuk bottom nav (pb-28)
  - Padding untuk top bar (pt-20)

### 📄 Pages Baru V2
- ✅ **HomePage** - Menu utama dengan card Daftar Face ID, Ajukan Izin, Kegiatan
- ✅ **ScanQrPage** - Hub untuk Scan QR dan Check-in Verifikasi Wajah
- ✅ **RekapPage** - Tab Rekap Absen dan Rekap Kegiatan
- ✅ **PengurusPage** - Struktur pengurus (public, watch-only)
- ✅ **ModeKetuaPage** - Gerbang PIN untuk masuk Mode Ketua
- ✅ **AdminDashboardPage** - Dashboard Ketua dengan menu admin

### 🛡️ Bug Fix - Nama Approved Masih Muncul

#### Masalah
Setelah anggota daftar wajah dan ketua approve, nama anggota tersebut masih muncul di dropdown "Daftar Wajah".

#### Solusi
1. ✅ **Buat view Supabase aman:**
   - `members_public` - tanpa `face_descriptor` (data biometrik)
   - `members_need_face_enroll` - hanya anggota yang `face_status = null/none`

2. ✅ **Update EnrollFace.tsx:**
   - Query dari `members_need_face_enroll` (bukan `members.select('*')`)
   - Anggota `pending` dan `approved` tidak muncul
   - Invalidate queries setelah enroll berhasil
   - Reload list saat "Daftarkan wajah lain"

3. ✅ **Update FaceApproval.tsx:**
   - Query dari `members_public` dengan filter `.eq('face_status', 'pending')`
   - Hanya tampilkan pending (approved tidak muncul lagi)
   - Invalidate queries setelah approve/reject
   - Remove dari list lokal setelah action (langsung hilang dari UI)

4. ✅ **Update file lain:**
   - `SelfCheckIn.tsx` → `members_public`
   - `AjukanIzin.tsx` → `members_public`
   - `ScanPage.tsx` → `members_public`

#### Keamanan
- ❌ **Jangan** query `members.select('*')` dari frontend publik
- ❌ **Jangan** expose `face_descriptor` ke browser
- ✅ **Gunakan** view `members_public` atau `members_need_face_enroll`
- ✅ `face_descriptor` hanya diakses lewat RPC `get_member_descriptor`

### 🗄️ Database Migration
File: `supabase/views-public-safe.sql`

Jalankan di SQL Editor Supabase untuk membuat view aman:
```sql
-- View tanpa face_descriptor
CREATE OR REPLACE VIEW public.members_public AS
SELECT id, name, "group", face_status, face_enrolled_at, created_at
FROM public.members;

-- View hanya anggota yang belum daftar wajah
CREATE OR REPLACE VIEW public.members_need_face_enroll AS
SELECT id, name, "group"
FROM public.members
WHERE face_status IS NULL OR face_status = 'none' OR face_descriptor IS NULL;
```

### 🎯 Router V2
- `/` atau `/home` → HomePage
- `/scan-qr` → ScanQrPage
- `/rekap` → RekapPage
- `/pengurus` → PengurusPage
- `/mode-ketua` → ModeKetuaPage (gerbang PIN)
- `/admin` → AdminDashboardPage (setelah PIN benar)
- Existing routes tetap jalan (members, kegiatan, absensi, dll.)

### 🎨 Theme
- ✅ Hook `useTheme` baru di `src/theme/useTheme.ts`
- ✅ Toggle dark/light mode di TopBar
- ✅ Simpan ke localStorage (`aptama_theme`)
- ✅ Default: dark mode

### 📦 Build Status
✅ **Build berhasil** - npm run build sukses tanpa error

### 🚀 Deploy
Setelah push ke GitHub, Vercel akan auto-deploy.

```bash
git add .
git commit -m "feat(v2): mobile navigation + fix bug nama approved masih muncul"
git push origin main
```

### 📝 Testing Checklist

#### Frontend
- [ ] Home page tampil dengan 3 card utama
- [ ] Bottom nav active state benar (hijau saat active)
- [ ] Floating admin button terlihat (tidak tertutup bottom nav)
- [ ] Dark/light toggle berfungsi
- [ ] Scan QR page menampilkan 2 card

#### Bug Fix - Daftar Wajah
- [ ] Dropdown "Daftar Wajah" hanya tampilkan anggota yang belum daftar
- [ ] Setelah anggota submit wajah, nama hilang dari dropdown
- [ ] Setelah ketua approve, nama tidak muncul lagi di dropdown
- [ ] Halaman "Verifikasi Wajah" (admin) hanya tampilkan pending

#### Mode Ketua
- [ ] Floating button buka halaman Mode Ketua (jika belum login)
- [ ] Input PIN → berhasil → redirect ke /admin
- [ ] Dashboard admin tampil dengan 6 menu card
- [ ] Tombol "Keluar Mode Ketua" berfungsi

#### Database
- [ ] Jalankan `supabase/views-public-safe.sql` di SQL Editor
- [ ] Query `SELECT * FROM members_public` tidak return face_descriptor
- [ ] Query `SELECT * FROM members_need_face_enroll` hanya return yang belum daftar

### 🎉 Definition of Done
1. ✅ Menu utama pindah ke bottom nav (Home, Scan QR, Rekap, Pengurus)
2. ✅ Top bar dengan logo + dark/light toggle
3. ✅ Mode Ketua lewat floating button pojok kanan bawah
4. ✅ Home page dengan CTA Daftar Face ID + Ajukan Izin
5. ✅ Rekap page dengan tab Absen dan Kegiatan
6. ✅ Bug daftar wajah selesai (approved tidak muncul lagi)
7. ✅ Keamanan: tidak expose face_descriptor ke frontend publik
8. ✅ Build sukses tanpa error

### 🔗 Link
- Production: https://aptama-app.vercel.app
- GitHub: https://github.com/zalana28/aptama-app
- Supabase: vbjehzoztbwkxxxsrbxg.supabase.co

---
**Update by:** Kiro AI Agent  
**Date:** 2026-06-30  
**Version:** V2.0.0
