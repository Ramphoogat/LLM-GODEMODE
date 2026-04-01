'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import type { Theme } from '@/store'

const STORAGE_KEY = 'g0dm0d3-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  // On mount: restore persisted theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (saved && ['matrix', 'hacker', 'glyph', 'minimal', 'solar'].includes(saved)) {
        setTheme(saved)
      }
    } catch {
      // localStorage unavailable (SSR / private browsing)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  // Whenever theme changes: apply to <html> AND save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  return <>{children}</>
}
