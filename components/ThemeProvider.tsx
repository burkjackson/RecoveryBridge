'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('rb-theme') as Theme | null
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const resolved = stored ?? (mediaQuery.matches ? 'dark' : 'light')
    setTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')

    // Follow OS changes only when the user hasn't set a manual preference
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('rb-theme')) return
      const next: Theme = e.matches ? 'dark' : 'light'
      setTheme(next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('rb-theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
