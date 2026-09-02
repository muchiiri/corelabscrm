import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { validateWorkspaceName } from '@/lib/validateWorkspaceName'
import { validateAddMemberForm } from '@/lib/validateAddMemberForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'

const ADD_MEMBER_INITIAL_VALUES = { email: '', role: 'Editor' }

function WorkspaceSettingsPage() {
  const { currentWorkspace, refetch } = useWorkspace()
  const { members, refetch: refetchMembers } = useWorkspaceMembers(currentWorkspace?.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace?.id)
  const [name, setName] = useState(currentWorkspace?.name ?? '')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdmin = myRole === 'Admin'

  const [addMemberValues, setAddMemberValues] = useState(ADD_MEMBER_INITIAL_VALUES)
  const [addMemberErrors, setAddMemberErrors] = useState({})
  const [addMemberSubmitError, setAddMemberSubmitError] = useState(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [removeError, setRemoveError] = useState(null)

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

    await refetchMembers()
    setAddMemberValues(ADD_MEMBER_INITIAL_VALUES)
    setIsAddingMember(false)
  }

  function handleChange(event) {
    setName(event.target.value)
    setSaveSuccess(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateWorkspaceName({ name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setSaveSuccess(false)
    setIsSubmitting(true)

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', currentWorkspace.id)

    if (updateError) {
      console.error('Failed to update workspace:', updateError)
      setSubmitError('Something went wrong saving your changes. Please try again.')
      setIsSubmitting(false)
      return
    }

    await refetch()
    setSaveSuccess(true)
    setIsSubmitting(false)
  }

  return (
    <div className="p-8">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Workspace settings</CardTitle>
          <CardDescription>
            Created{' '}
            {currentWorkspace &&
              new Date(currentWorkspace.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
            {saveSuccess && (
              <p className="rounded-sm bg-border px-3 py-2 text-sm text-text">Saved.</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
            </div>
            <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Members</CardTitle>
          <CardDescription>Everyone with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {removeError && (
            <p className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{removeError}</p>
          )}
          <ul className="flex flex-col gap-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-text">
                  <Avatar name={member.name} email={member.email} />
                  {member.name || member.email}
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
    </div>
  )
}

export default WorkspaceSettingsPage
