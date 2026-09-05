import { useState } from 'react'
import { Bell, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import WorkspaceTab from '@/components/settings/WorkspaceTab'
import TeamTab from '@/components/settings/TeamTab'
import BillingTab from '@/components/settings/BillingTab'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'team', label: 'Team' },
  { key: 'billing', label: 'Billing' },
  { key: 'workspace', label: 'Workspace' },
]

function ComingSoonTab({ title }) {
  return (
    <Card className="max-w-sm">
      <CardContent className="p-6">
        <CardTitle className="text-heading">{title}</CardTitle>
        <p className="mt-2 text-sm text-muted">Coming soon.</p>
      </CardContent>
    </Card>
  )
}

function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState('workspace')
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace?.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace?.id)
  const isAdmin = myRole === 'Admin'

  return (
    <div className="p-8">
      <PageHeader
        title="Settings"
        subtitle="Workspace and account preferences"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Search"
              className="bg-surface"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Notifications"
              className="bg-surface"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                type="button"
                onClick={() => setActiveTab('team')}
                className="bg-[#1F2937] text-white hover:bg-[#111827] hover:opacity-100"
              >
                <Plus className="h-4 w-4" />
                Invite member
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <nav className="flex flex-col gap-0.5 md:col-span-1">
          {TABS.map((tab) => {
            const active = tab.key === activeTab
            const badge = tab.key === 'team' ? members.length : tab.key === 'billing' ? 'Free' : null
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition',
                  active ? 'bg-accent-bg font-semibold text-accent' : 'text-text hover:bg-surface-hover',
                )}
              >
                <span>{tab.label}</span>
                {badge !== null && (
                  <span className={cn('text-xs', active ? 'text-accent' : 'text-muted')}>{badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="md:col-span-3">
          {activeTab === 'profile' && <ComingSoonTab title="Profile" />}
          {activeTab === 'notifications' && <ComingSoonTab title="Notifications" />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'workspace' && <WorkspaceTab />}
        </div>
      </div>
    </div>
  )
}

export default WorkspaceSettingsPage
