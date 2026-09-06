import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateAddMemberForm } from '@/lib/validateAddMemberForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'
import { supabase } from '@/lib/supabase'

const ADD_MEMBER_INITIAL_VALUES = { email: '', role: 'Editor' }

function TeamTab() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members, refetch: refetchMembers } = useWorkspaceMembers(currentWorkspace?.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace?.id)

  const isAdmin = myRole === 'Admin'

  const [addMemberValues, setAddMemberValues] = useState(ADD_MEMBER_INITIAL_VALUES)
  const [addMemberErrors, setAddMemberErrors] = useState({})
  const [addMemberSubmitError, setAddMemberSubmitError] = useState(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [removeError, setRemoveError] = useState(null)

  const addMemberEmailRef = useRef(null)

  async function handleRemoveMember(memberId) {
    setRemoveError(null)
    setRemovingMemberId(memberId)

    const { error: removeMemberError } = await supabase.rpc('remove_workspace_member', {
      target_workspace_id: currentWorkspace.id,
      target_user_id: memberId,
    })

    if (removeMemberError) {
      console.error('Failed to remove member:', removeMemberError)
      setRemoveError(removeMemberError.message)
      setRemovingMemberId(null)
      return
    }

    await refetchMembers()
    setRemovingMemberId(null)
  }

  function handleAddMemberChange(event) {
    const { name: fieldName, value } = event.target
    setAddMemberValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  async function handleAddMemberSubmit(event) {
    event.preventDefault()
    const validationErrors = validateAddMemberForm(addMemberValues)
    setAddMemberErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setAddMemberSubmitError(null)
    setIsAddingMember(true)

    const { error: addError } = await supabase.rpc('add_workspace_member', {
      target_workspace_id: currentWorkspace.id,
      member_email: addMemberValues.email.trim(),
      member_role: addMemberValues.role,
    })

    if (addError) {
      console.error('Failed to add member:', addError)
      setAddMemberSubmitError(addError.message)
      setIsAddingMember(false)
      return
    }

    const actorName = members.find((member) => member.id === user.id)?.name || user.email
    logActivity(
      currentWorkspace.id,
      user.id,
      `${actorName} added ${addMemberValues.email.trim()} as ${addMemberValues.role}`,
      'workspace_member',
    )

    await refetchMembers()
    setAddMemberValues(ADD_MEMBER_INITIAL_VALUES)
    setIsAddingMember(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-heading">Members</CardTitle>
            <CardDescription>{members.length} of 10 seats used on the Free plan.</CardDescription>
          </div>
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addMemberEmailRef.current?.focus()}
            >
              <Plus className="h-4 w-4" />
              Invite member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {removeError && (
          <p className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{removeError}</p>
        )}
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={member.name} email={member.email} />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text">
                    {member.name || member.email}
                    {member.id === user?.id && (
                      <span className="text-xs font-normal text-secondary">You</span>
                    )}
                  </span>
                  {member.name && <span className="truncate text-xs text-muted">{member.email}</span>}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-sm text-muted">{member.role}</span>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-danger"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingMemberId === member.id}
                  >
                    {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form className="mt-4 flex flex-col gap-3 border-t border-border pt-4" onSubmit={handleAddMemberSubmit} noValidate>
            {addMemberSubmitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{addMemberSubmitError}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addMemberEmail">Add member by email</Label>
              <Input
                ref={addMemberEmailRef}
                id="addMemberEmail"
                name="email"
                type="email"
                placeholder="person@example.com"
                value={addMemberValues.email}
                onChange={handleAddMemberChange}
                aria-invalid={Boolean(addMemberErrors.email)}
              />
              {addMemberErrors.email && <p className="text-xs text-danger">{addMemberErrors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addMemberRole">Role</Label>
              <Select id="addMemberRole" name="role" value={addMemberValues.role} onChange={handleAddMemberChange}>
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </Select>
            </div>
            <Button type="submit" variant="outline" className="self-start" disabled={isAddingMember}>
              {isAddingMember ? 'Adding...' : 'Add member'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamTab
