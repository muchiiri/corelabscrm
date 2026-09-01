import { cn } from '@/lib/utils'

function Select({ className, children, ...props }) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex h-9 w-full rounded-sm border border-border bg-bg px-3 py-1 text-sm text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
