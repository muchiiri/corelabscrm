import { useNavigate, useSearchParams } from 'react-router-dom'
import TaskForm from '@/components/tasks/TaskForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useAuth } from '@/lib/AuthContext'
import { useCreateTask } from '@/lib/useCreateTask'

const VALID_STATUSES = ['Todo', 'In Progress', 'Blocked', 'Waiting', 'Done']
const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function CreateTaskPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const statusParam = searchParams.get('status')
  const dueDateParam = searchParams.get('dueDate')

  const { values, errors, submitError, isSubmitting, handleChange, handleSubmit } = useCreateTask({
    workspaceId: currentWorkspace.id,
    userId: user.id,
    userEmail: user.email,
    members,
    initialValues: {
      ...(VALID_STATUSES.includes(statusParam) ? { status: statusParam } : {}),
      ...(DUE_DATE_PATTERN.test(dueDateParam) ? { dueAt: `${dueDateParam}T09:00` } : {}),
    },
    onSuccess: () => navigate('/tasks'),
  })

  return (
    <div className="p-8">
      <TaskForm
        title="New task"
        values={values}
        errors={errors}
        submitError={submitError}
        isSubmitting={isSubmitting}
        submitLabel={isSubmitting ? 'Creating...' : 'Create task'}
        members={members}
        tags={tags}
        projects={projects}
        clients={clients}
        onCreateTag={createTag}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default CreateTaskPage
