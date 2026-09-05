export function validateProfileName({ name }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Name is required.'
  }

  return errors
}
