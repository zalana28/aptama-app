import { useEffect, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AdminProvider } from './hooks/AdminProvider'
import { ThemeProvider } from './hooks/ThemeContext'
import { Navbar } from './components/Navbar'
import { AdminGate } from './components/AdminGate'
import { Logo } from './components/Logo'
import { isConfigured } from './lib/supabase'
import { SplashScreen } from './components/SplashScreen'

// Lazy-load pages to reduce initial bundle size.
// Pages use named exports, so we map them to a default export for React.lazy.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Members = lazy(() => import('./pages/Members').then((m) => ({ default: m.Members })))
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })))
const Attendance = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })))
const Recap = lazy(() => import('./pages/Recap').then((m) => ({ default: m.Recap })))
const AjukanIzin = lazy(() => import('./pages/AjukanIzin').then((m) => ({ default: m.AjukanIzin })))
const SelfCheckIn = lazy(() => import('./pages/SelfCheckIn').then((m) => ({ default: m.SelfCheckIn })))
const GenerateQR = lazy(() => import('./pages/GenerateQR').then((m) => ({ default: m.GenerateQR })))
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })))
const EnrollFace = lazy(() => import('./pages/EnrollFace').then((m) => ({ default: m.EnrollFace })))
const FaceApproval = lazy(() => import('./pages/FaceApproval').then((m) => ({ default: m.FaceApproval })))
const ImportData = lazy(() => import('./pages/ImportData').then((m) => ({ default: m.ImportData })))
const ChangePin = lazy(() => import('./pages/ChangePin').then((m) => ({ default: m.ChangePin })))

const queryClient = new QueryClient()
const SPLASH_DURATION_MS = 3000

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

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-primary border-r-secondary animate-spin" />
    </div>
  )
}

function useSplash() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  return showSplash
}

function MainApp() {
  if (!isConfigured) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <SetupNotice />
      </motion.div>
    )
  }

  return (
    <AdminProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg">
          <Navbar />
          <main id="main-content" className="animate-fade-in">
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/ganti-pin" element={<AdminGate><ChangePin /></AdminGate>} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
    </AdminProvider>
  )
}

function App() {
  const showSplash = useSplash()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AnimatePresence mode="wait">
          {showSplash ? (
            <SplashScreen key="splash" />
          ) : (
            <MainApp key="main" />
          )}
        </AnimatePresence>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
