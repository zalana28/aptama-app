import { useEffect, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AdminProvider } from './hooks/AdminProvider'
import { ThemeProvider } from './hooks/ThemeContext'
import { AppShell } from './layouts/AppShell'
import { AdminGate } from './components/AdminGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Logo } from './components/Logo'
import { isConfigured } from './lib/supabase'
import { SplashScreen } from './components/SplashScreen'

// Lazy-load pages to reduce initial bundle size.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const ScanQrPage = lazy(() => import('./pages/ScanQrPage').then((m) => ({ default: m.ScanQrPage })))
const RekapPage = lazy(() => import('./pages/RekapPage').then((m) => ({ default: m.RekapPage })))
const PengurusPage = lazy(() => import('./pages/PengurusPage').then((m) => ({ default: m.PengurusPage })))
const Members = lazy(() => import('./pages/Members').then((m) => ({ default: m.Members })))
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })))
const Attendance = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })))
const AjukanIzin = lazy(() => import('./pages/AjukanIzin').then((m) => ({ default: m.AjukanIzin })))
const CheckInPage = lazy(() => import('./pages/CheckInPage').then((m) => ({ default: m.CheckInPage })))
const GenerateQR = lazy(() => import('./pages/GenerateQR').then((m) => ({ default: m.GenerateQR })))
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })))
const ImportData = lazy(() => import('./pages/ImportData').then((m) => ({ default: m.ImportData })))
const ChangePin = lazy(() => import('./pages/ChangePin').then((m) => ({ default: m.ChangePin })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
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

function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-5xl">🔍</div>
      <h1 className="text-xl font-bold">Halaman Tidak Ditemukan</h1>
      <p className="text-text-muted text-sm">
        URL yang kamu buka tidak valid.
      </p>
      <a href="/" className="inline-block text-primary text-sm hover:underline">
        ← Kembali ke Beranda
      </a>
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <SetupNotice />
      </motion.div>
    )
  }

  return (
    <AdminProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="home" element={<HomePage />} />
              <Route path="scan-qr" element={<ScanQrPage />} />
              <Route path="rekap" element={<RekapPage />} />
              <Route path="pengurus" element={<PengurusPage />} />
              <Route path="anggota" element={<AdminGate><Members /></AdminGate>} />
              <Route path="kegiatan" element={<AdminGate><Events /></AdminGate>} />
              <Route path="absensi" element={<AdminGate><Attendance /></AdminGate>} />
              <Route path="generate-qr" element={<AdminGate><GenerateQR /></AdminGate>} />
              <Route path="izin" element={<AjukanIzin />} />
              <Route path="checkin" element={<CheckInPage />} />
              <Route path="scan" element={<ScanPage />} />
              <Route path="import" element={<AdminGate><ImportData /></AdminGate>} />
              <Route path="ganti-pin" element={<AdminGate><ChangePin /></AdminGate>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AdminProvider>
  )
}

function App() {
  const showSplash = useSplash()
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {showSplash ? (
              <SplashScreen key="splash" />
            ) : (
              <MainApp key="main" />
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
