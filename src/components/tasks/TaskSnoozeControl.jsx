import { useEffect, useRef, useState } from 'react'
import { isTaskSnoozed } from '@/lib/isTaskSnoozed'
import { toEndOfDayISOString } from '@/lib/toEndOfDayISOString'

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function TaskSnoozeControl({ task, onSnooze, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  function applyPreset(daysFromNow) {
    const target = new Date()
    target.setDate(target.getDate() + daysFromNow)
    onSnooze(toEndOfDayISOString(toDateInputValue(target)))
    setIsOpen(false)
  }

  function applyCustomDate(event) {
    onSnooze(toEndOfDayISOString(event.target.value))
    setIsOpen(false)
  }

  if (disabled) {
    return null
  }

  if (isTaskSnoozed(task)) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-faint">
        Snoozed until {new Date(task.snoozed_until).toLocaleDateString()}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSnooze(null)
          }}
          className="text-secondary hover:underline"
        >
          Clear
        </button>
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-block" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-xs text-secondary hover:underline"
      >
        Snooze
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 flex flex-col gap-1 rounded-sm border border-border bg-bg p-2 shadow-md">
          <button
            type="button"
            onClick={() => applyPreset(1)}
            className="rounded-sm px-2 py-1 text-left text-xs text-text hover:bg-border"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="rounded-sm px-2 py-1 text-left text-xs text-text hover:bg-border"
          >
            Next week
          </button>
          <input
            type="date"
            onChange={applyCustomDate}
            className="rounded-sm border border-border bg-bg px-2 py-1 text-xs text-text"
          />
        </div>
      )}
    </div>
  )
}

export default TaskSnoozeControl
