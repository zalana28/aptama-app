import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminProvider } from './hooks/useAdmin'
import { Navbar } from './components/Navbar'
import { AdminGate } from './components/AdminGate'
import { Home } from './pages/Home'
import { Members } from './pages/Members'
import { Events } from './pages/Events'
import { Attendance } from './pages/Attendance'
import { Recap } from './pages/Recap'

const queryClient = new QueryClient()

function App() {
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
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </QueryClientProvider>
  )
}

export default App
