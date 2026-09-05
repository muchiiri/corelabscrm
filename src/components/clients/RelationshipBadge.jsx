import { cn } from '@/lib/utils'

const RELATIONSHIP_CLASS = {
  Active: 'bg-success-bg text-success',
  Prospect: 'bg-secondary-bg text-secondary',
  Churned: 'bg-danger-bg text-danger',
}

function RelationshipBadge({ relationship }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        RELATIONSHIP_CLASS[relationship],
      )}
    >
      {relationship}
    </span>
  )
}

export default RelationshipBadge
