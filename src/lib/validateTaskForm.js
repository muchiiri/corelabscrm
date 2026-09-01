export function validateTaskForm({ title }) {
  const errors = {}

  if (!title.trim()) {
    errors.title = 'Title is required.'
  }

  return errors
}
