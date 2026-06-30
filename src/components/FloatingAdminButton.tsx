import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

export function FloatingAdminButton() {
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()

  return (
    <button
      type="button"
      aria-label="Masuk Mode Ketua"
      onClick={() => navigate(isAdmin ? '/admin' : '/mode-ketua')}
      className="fixed bottom-20 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-[#9A8C2E]/40 bg-[#1B7A3D] text-white shadow-lg shadow-[#1B7A3D]/30 active:scale-95 transition"
    >
      <KeyRound size={20} />
    </button>
  )
}
