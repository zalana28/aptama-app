import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Members } from './pages/Members'
import { Events } from './pages/Events'
import { Attendance } from './pages/Attendance'
import { Recap } from './pages/Recap'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anggota" element={<Members />} />
          <Route path="/kegiatan" element={<Events />} />
          <Route path="/absensi" element={<Attendance />} />
          <Route path="/rekap" element={<Recap />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
