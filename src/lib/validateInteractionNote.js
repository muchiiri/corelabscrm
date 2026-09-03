export function validateInteractionNote({ note }) {
  const errors = {}

  if (!note.trim()) {
    errors.note = 'Note is required.'
  }

  return errors
}
