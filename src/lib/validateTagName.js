export function validateTagName({ name }, existingNames = []) {
  const errors = {}
  const trimmed = name.trim()

  if (!trimmed) {
    errors.name = 'Tag name is required.'
  } else if (trimmed.length > 30) {
    errors.name = 'Tag name must be 30 characters or fewer.'
  } else if (existingNames.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
    errors.name = 'A tag with this name already exists.'
  }

  return errors
}
