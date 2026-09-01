export function validateWorkspaceName({ name }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Workspace name is required.'
  }

  return errors
}
