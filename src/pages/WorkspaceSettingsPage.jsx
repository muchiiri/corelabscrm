import { useEffect, useState } from 'react'
import { Bell, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import WorkspaceTab from '@/components/settings/WorkspaceTab'
import TeamTab from '@/components/settings/TeamTab'
import BillingTab from '@/components/settings/BillingTab'
import ProfileTab from '@/components/settings/ProfileTab'
import NotificationsTab from '@/components/settings/NotificationsTab'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NOTIFICATION_COLUMNS = [
  'notify_assigned_to_me',
  'notify_mentions',
  'notify_due_soon',
  'notify_project_activity',
  'notify_product_news',
]

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'team', label: 'Team' },
  { key: 'billing', label: 'Billing' },
  { key: 'workspace', label: 'Workspace' },
]

function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState('workspace')
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace?.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace?.id)
  const isAdmin = myRole === 'Admin'
  const [notificationsOnCount, setNotificationsOnCount] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadNotificationCount() {
      const { data, error } = await supabase
        .from('profiles')
        .select(NOTIFICATION_COLUMNS.join(', '))
        .eq('id', user.id)
        .single()

      if (cancelled) {
        return
      }
      if (error || !data) {
        console.error('Failed to load notification count:', error)
        return
      }
      setNotificationsOnCount(Object.values(data).filter(Boolean).length)
    }

    loadNotificationCount()
    return () => {
      cancelled = true
    }
  }, [user.id, activeTab])

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
            const badge =
              tab.key === 'team'
                ? members.length
                : tab.key === 'billing'
                  ? 'Free'
                  : tab.key === 'notifications' && notificationsOnCount !== null
                    ? `${notificationsOnCount} on`
                    : null
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
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'workspace' && <WorkspaceTab />}
        </div>
      </div>
    </div>
  )
}

export default WorkspaceSettingsPage
