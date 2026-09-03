import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

function BulkActionToolbar({
  selectedCount,
  onClear,
  onMarkDone,
  onDelete,
  onStatusChange,
  onAssign,
  members,
  isPending,
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [statusValue, setStatusValue] = useState('')
  const [assignValue, setAssignValue] = useState('')

  async function handleDeleteConfirm() {
    await onDelete()
    setIsConfirmingDelete(false)
  }

  function handleStatusSelect(event) {
    const value = event.target.value
    setStatusValue('')
    if (value) {
      onStatusChange(value)
    }
  }

  function handleAssignSelect(event) {
    const value = event.target.value
    setAssignValue('')
    if (value) {
      onAssign(value)
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm bg-border px-3 py-2 text-sm text-text">
      <span>{selectedCount} selected</span>
      <Button type="button" variant="outline" onClick={onMarkDone} disabled={isPending}>
        Mark Done
      </Button>

      <Select
        value={statusValue}
        onChange={handleStatusSelect}
        disabled={isPending}
        aria-label="Change status"
        className="w-auto"
      >
        <option value="">Change status...</option>
        <option value="Todo">Todo</option>
        <option value="In Progress">In Progress</option>
        <option value="Blocked">Blocked</option>
        <option value="Waiting">Waiting</option>
        <option value="Done">Done</option>
      </Select>

      <Select
        value={assignValue}
        onChange={handleAssignSelect}
        disabled={isPending}
        aria-label="Assign to"
        className="w-auto"
      >
        <option value="">Assign to...</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name || member.email}
          </option>
        ))}
        <option value="unassign">Unassign</option>
      </Select>

      {isConfirmingDelete ? (
        <>
          <span className="text-sm text-text">
            Delete {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'}? This can&apos;t be undone.
          </span>
          <Button type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-danger"
            onClick={handleDeleteConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="text-danger"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isPending}
        >
          Delete
        </Button>
      )}

      <Button type="button" variant="outline" onClick={onClear} disabled={isPending}>
        Clear
      </Button>
    </div>
  )
}

export default BulkActionToolbar
