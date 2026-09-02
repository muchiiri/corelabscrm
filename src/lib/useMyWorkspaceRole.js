import { useAuth } from '@/lib/AuthContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'

export function useMyWorkspaceRole(workspaceId) {
  const { user } = useAuth()
  const { members, loading } = useWorkspaceMembers(workspaceId)
  const role = members.find((member) => member.id === user?.id)?.role ?? null

  return { role, loading }
}
