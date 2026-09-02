import { cn } from '@/lib/utils'

const TAG_COLOR_CLASS = {
  gray: 'bg-tag-gray-bg text-tag-gray-text',
  red: 'bg-tag-red-bg text-tag-red-text',
  orange: 'bg-tag-orange-bg text-tag-orange-text',
  green: 'bg-tag-green-bg text-tag-green-text',
  blue: 'bg-tag-blue-bg text-tag-blue-text',
  purple: 'bg-tag-purple-bg text-tag-purple-text',
}

function TagBadge({ name, color }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TAG_COLOR_CLASS[color] ?? TAG_COLOR_CLASS.gray,
      )}
    >
      {name}
    </span>
  )
}

export default TagBadge
