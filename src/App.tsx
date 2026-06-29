import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminProvider } from './hooks/AdminProvider'
import { Navbar } from './components/Navbar'
import { AdminGate } from './components/AdminGate'
import { Logo } from './components/Logo'
import { isConfigured } from './lib/supabase'
import { Home } from './pages/Home'
import { Members } from './pages/Members'
import { Events } from './pages/Events'
import { Attendance } from './pages/Attendance'
import { Recap } from './pages/Recap'
import { AjukanIzin } from './pages/AjukanIzin'
import { SelfCheckIn } from './pages/SelfCheckIn'
import { GenerateQR } from './pages/GenerateQR'
import { ScanPage } from './pages/ScanPage'
import { EnrollFace } from './pages/EnrollFace'
import { FaceApproval } from './pages/FaceApproval'
import { ImportData } from './pages/ImportData'

const queryClient = new QueryClient()

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-bg">
      <div className="max-w-md text-center space-y-4">
        <Logo size={64} className="mx-auto glow-green rounded-2xl" />
        <h1 className="text-xl font-heading font-bold gradient-text">APTAMA</h1>
        <p className="text-text-secondary text-sm">
          Aplikasi belum dikonfigurasi. Set environment variables Supabase di Vercel.
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
          <div className="min-h-screen bg-bg">
            <Navbar />
            <main className="animate-fade-in">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/anggota" element={<AdminGate><Members /></AdminGate>} />
                <Route path="/kegiatan" element={<AdminGate><Events /></AdminGate>} />
                <Route path="/absensi" element={<AdminGate><Attendance /></AdminGate>} />
                <Route path="/generate-qr" element={<AdminGate><GenerateQR /></AdminGate>} />
                <Route path="/rekap" element={<Recap />} />
                <Route path="/izin" element={<AjukanIzin />} />
                <Route path="/checkin" element={<SelfCheckIn />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/daftar-wajah" element={<EnrollFace />} />
                <Route path="/verifikasi-wajah" element={<AdminGate><FaceApproval /></AdminGate>} />
                <Route path="/import" element={<AdminGate><ImportData /></AdminGate>} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AdminProvider>
    </QueryClientProvider>
  )
}

export default App
