import { getInitials } from '@/lib/getInitials'
import { cn } from '@/lib/utils'

function Avatar({ name, email, className }) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-ink',
        className,
      )}
    >
      {getInitials(name, email)}
    </span>
  )
}

export { Avatar }
