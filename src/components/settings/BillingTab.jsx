import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'

const PROJECT_CAP = 5
const MEMBER_CAP = 10

const INVOICES = [
  { date: 'Aug 1, 2026', plan: 'Free plan', amount: '$0.00' },
  { date: 'Jul 1, 2026', plan: 'Team trial', amount: '$0.00' },
  { date: 'Jun 1, 2026', plan: 'Team plan', amount: '$96.00' },
]

function usagePercent(count, cap) {
  return Math.min(100, Math.round((count / cap) * 100))
}

function UsageStat({ label, valueLabel, percent, barClassName }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="font-semibold text-text">{valueLabel}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
        <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function BillingTab() {
  const { currentWorkspace } = useWorkspace()
  const { projects } = useWorkspaceProjects(currentWorkspace?.id)
  const { members } = useWorkspaceMembers(currentWorkspace?.id)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current plan</p>
              <CardTitle className="text-heading">Free</CardTitle>
              <p className="mt-1 text-sm text-muted">No card on file - renews never</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              Upgrade to Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <UsageStat
              label="Projects"
              valueLabel={`${projects.length} of ${PROJECT_CAP}`}
              percent={usagePercent(projects.length, PROJECT_CAP)}
              barClassName="bg-accent"
            />
            <UsageStat
              label="Members"
              valueLabel={`${members.length} of ${MEMBER_CAP}`}
              percent={usagePercent(members.length, MEMBER_CAP)}
              barClassName="bg-secondary"
            />
            <UsageStat
              label="File storage"
              valueLabel="1.2 of 5 GB"
              percent={24}
              barClassName="bg-tag-blue-text"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {INVOICES.map((invoice) => (
              <li key={invoice.date} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-secondary">{invoice.date}</span>
                <span className="text-muted">{invoice.plan}</span>
                <span className="font-semibold text-text">{invoice.amount}</span>
                <Button type="button" variant="ghost" size="sm" className="text-secondary" disabled>
                  Receipt
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted">Billing is handled by the workspace owner</p>
    </div>
  )
}

export default BillingTab
