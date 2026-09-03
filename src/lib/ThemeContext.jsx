import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

const ThemeContext = createContext(undefined)
const STORAGE_KEY = 'taskflow.theme'

function getPersistedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'light'
  } catch {
    return 'light'
  }
}

function setPersistedTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing or storage disabled - the choice just won't survive a reload.
  }
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState(getPersistedTheme)
  const [error, setError] = useState(null)

  // useLayoutEffect, not useEffect - applies before the browser paints, so a
  // repeat visit shows the right theme immediately instead of flashing light
  // first (the CSS only overrides [data-theme='dark']; :root is already light).
  useLayoutEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark'
    } else {
      delete document.documentElement.dataset.theme
    }
  }, [theme])

  useEffect(() => {
    if (!user) {
      return
    }
    let cancelled = false

    supabase
      .from('profiles')
      .select('theme_preference')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) {
          return
        }
        if (fetchError) {
          // Background reconcile - fails open, keeps whatever's already applied.
          console.error('Failed to load theme preference:', fetchError)
          return
        }
        setTheme(data.theme_preference)
        setPersistedTheme(data.theme_preference)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function toggleTheme() {
    if (!user) {
      return
    }
    setError(null)
    const previousTheme = theme
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    setPersistedTheme(nextTheme)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ theme_preference: nextTheme })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to save theme preference:', updateError)
      setTheme(previousTheme)
      setPersistedTheme(previousTheme)
      setError('Something went wrong saving your theme. Please try again.')
    }
  }

  const value = { theme, toggleTheme, error }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
