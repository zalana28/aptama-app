import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const KEY = 'aptama_theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY)
    return (saved as Theme) || 'dark'
  })

  useEffect(() => {
    localStorage.setItem(KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
