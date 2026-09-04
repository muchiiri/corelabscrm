import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'
import { cn } from '@/lib/utils'

function ThemeToggle() {
  const { theme, toggleTheme, error } = useTheme()

  function segmentClasses(isActive) {
    return cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium transition',
      isActive ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-0.5 rounded-sm border border-border bg-surface-hover p-0.5">
        <button
          type="button"
          onClick={() => theme !== 'light' && toggleTheme()}
          className={segmentClasses(theme === 'light')}
        >
          <Sun className="h-3.5 w-3.5" />
          Light
        </button>
        <button
          type="button"
          onClick={() => theme !== 'dark' && toggleTheme()}
          className={segmentClasses(theme === 'dark')}
        >
          <Moon className="h-3.5 w-3.5" />
          Dark
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default ThemeToggle
