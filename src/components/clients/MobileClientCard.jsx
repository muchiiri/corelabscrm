import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import RelationshipBadge from '@/components/clients/RelationshipBadge'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

function MobileClientCard({
  client,
  owner,
  projectCount,
  openCount,
  completionRate,
  openValueByCurrency,
  lastContact,
}) {
  return (
    <Card className="p-3">
      <Link to={`/clients/${client.id}`} className="flex items-start gap-2.5">
        <Avatar name={client.name} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-text">{client.name}</span>
            <RelationshipBadge relationship={client.relationship} />
          </div>
          {client.company && <p className="truncate text-xs text-muted">{client.company}</p>}
        </div>
      </Link>

      <div className="mt-2 flex items-center justify-between text-xs">
        {owner ? (
          <span className="flex items-center gap-2 text-text">
            <Avatar name={owner.name} email={owner.email} />
            {owner.name || owner.email}
          </span>
        ) : (
          <span className="text-muted">No owner</span>
        )}
        <span className="text-muted">
          {projectCount} project{projectCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="shrink-0 text-xs text-muted">{openCount} open</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full rounded-full bg-accent" style={{ width: `${completionRate.rate}%` }} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {openValueByCurrency
            ? Object.entries(openValueByCurrency)
                .map(([currency, amount]) => formatCurrency(amount, currency))
                .join(', ')
            : '—'}
        </span>
        <span>{lastContact ? formatRelativeTime(lastContact) : 'No contact yet'}</span>
      </div>
    </Card>
  )
}

export default MobileClientCard
