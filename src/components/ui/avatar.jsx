import { getInitials } from '@/lib/getInitials'
import { getAvatarColor } from '@/lib/getAvatarColor'
import { cn } from '@/lib/utils'

// Reuses the same six tag colors as TagPicker's swatch picker, as solid
// fills - kept local rather than importing TagPicker's SWATCH_CLASS so
// this ui/ primitive doesn't depend on a feature component.
const AVATAR_COLOR_CLASS = {
  gray: 'bg-tag-gray-text',
  red: 'bg-tag-red-text',
  orange: 'bg-tag-orange-text',
  green: 'bg-tag-green-text',
  blue: 'bg-tag-blue-text',
  purple: 'bg-tag-purple-text',
}

function Avatar({ name, email, className }) {
  const color = getAvatarColor(name, email)

  return (
    <span
      data-slot="avatar"
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-accent-ink',
        AVATAR_COLOR_CLASS[color],
        className,
      )}
    >
      {getInitials(name, email)}
    </span>
  )
}

export { Avatar }
