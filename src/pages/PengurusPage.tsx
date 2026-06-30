import { useAdmin } from '../hooks/useAdmin'
import { ModeKetuaGate } from '../components/ModeKetuaGate'
import { PengurusDashboard } from '../components/PengurusDashboard'

export function PengurusPage() {
  const { isAdmin } = useAdmin()

  if (!isAdmin) {
    return <ModeKetuaGate />
  }

  return <PengurusDashboard />
}
