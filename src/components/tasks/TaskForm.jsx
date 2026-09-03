import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import TagPicker from '@/components/tags/TagPicker'

function TaskForm({
  title,
  values,
  errors,
  submitError,
  isSubmitting,
  submitLabel,
  members = [],
  tags = [],
  projects = [],
  clients = [],
  onCreateTag,
  onChange,
  onSubmit,
  readOnly = false,
}) {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {submitError && (
            <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={values.title}
              onChange={onChange}
              aria-invalid={Boolean(errors.title)}
              disabled={readOnly}
            />
            {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={values.description}
              onChange={onChange}
              disabled={readOnly}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" value={values.priority} onChange={onChange} disabled={readOnly}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" value={values.status} onChange={onChange} disabled={readOnly}>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Waiting">Waiting</option>
                <option value="Done">Done</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueAt">Due date</Label>
            <Input
              id="dueAt"
              name="dueAt"
              type="datetime-local"
              value={values.dueAt}
              onChange={onChange}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recurrenceFrequency">Repeat</Label>
            <Select
              id="recurrenceFrequency"
              name="recurrenceFrequency"
              value={values.recurrenceFrequency}
              onChange={onChange}
              disabled={readOnly || !values.dueAt}
            >
              <option value="">Does not repeat</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </Select>
            {!values.dueAt && (
              <p className="text-xs text-muted">Set a due date to repeat this task.</p>
            )}
            {values.recurrenceFrequency && (
              <div className="mt-1 flex gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="recurrenceInterval">Every</Label>
                  <Input
                    id="recurrenceInterval"
                    name="recurrenceInterval"
                    type="number"
                    min="1"
                    step="1"
                    value={values.recurrenceInterval}
                    onChange={onChange}
                    aria-invalid={Boolean(errors.recurrenceInterval)}
                    disabled={readOnly}
                  />
                  {errors.recurrenceInterval && (
                    <p className="text-xs text-danger">{errors.recurrenceInterval}</p>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="recurrenceEndDate">Ends on</Label>
                  <Input
                    id="recurrenceEndDate"
                    name="recurrenceEndDate"
                    type="date"
                    value={values.recurrenceEndDate}
                    onChange={onChange}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assigneeId">Assignee</Label>
            <Select id="assigneeId" name="assigneeId" value={values.assigneeId} onChange={onChange} disabled={readOnly}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="projectId">Project</Label>
            <Select id="projectId" name="projectId" value={values.projectId} onChange={onChange} disabled={readOnly}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientId">Client</Label>
            <Select id="clientId" name="clientId" value={values.clientId} onChange={onChange} disabled={readOnly}>
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <TagPicker
              tags={tags}
              selectedTagIds={values.tagIds}
              onChange={(tagIds) => onChange({ target: { name: 'tagIds', value: tagIds } })}
              onCreateTag={onCreateTag}
              readOnly={readOnly}
            />
          </div>
          {!readOnly && (
            <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default TaskForm
