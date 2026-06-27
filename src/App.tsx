import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminProvider } from './hooks/useAdmin'
import { Navbar } from './components/Navbar'
import { AdminGate } from './components/AdminGate'
import { isConfigured } from './lib/supabase'
import { Home } from './pages/Home'
import { Members } from './pages/Members'
import { Events } from './pages/Events'
import { Attendance } from './pages/Attendance'
import { Recap } from './pages/Recap'
import { AjukanIzin } from './pages/AjukanIzin'
import { SelfCheckIn } from './pages/SelfCheckIn'

const queryClient = new QueryClient()

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">⚙️</div>
        <h1 className="text-xl font-bold text-primary">APTAMA</h1>
        <p className="text-text-muted text-sm">
          Aplikasi belum dikonfigurasi. Set environment variables Supabase di Vercel:
        </p>
        <div className="bg-bg-card border border-white/10 rounded-xl p-4 text-left text-xs font-mono space-y-1">
          <p className="text-secondary">VITE_SUPABASE_URL</p>
          <p className="text-text-muted">https://xxxxxxx.supabase.co</p>
          <p className="text-secondary mt-2">VITE_SUPABASE_ANON_KEY</p>
          <p className="text-text-muted">eyJhbG...</p>
        </div>
        <p className="text-text-muted text-xs">
          Vercel Dashboard → Settings → Environment Variables → Redeploy
        </p>
      </div>
    </div>
  )
}

function App() {
  if (!isConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <SetupNotice />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anggota" element={<AdminGate><Members /></AdminGate>} />
            <Route path="/kegiatan" element={<AdminGate><Events /></AdminGate>} />
            <Route path="/absensi" element={<AdminGate><Attendance /></AdminGate>} />
            <Route path="/rekap" element={<Recap />} />
            <Route path="/izin" element={<AjukanIzin />} />
            <Route path="/checkin" element={<SelfCheckIn />} />
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </QueryClientProvider>
  )
}

export default App
