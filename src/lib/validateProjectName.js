export function validateProjectName({ name }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Project name is required.'
  }

  return errors
}
