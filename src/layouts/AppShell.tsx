import { Outlet } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <main
        id="main-content"
        className="mx-auto min-h-screen w-full max-w-md md:max-w-2xl lg:max-w-4xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))]"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
