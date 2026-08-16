import { Outlet } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <main
        id="main-content"
        className="mx-auto min-h-screen w-full max-w-md px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
