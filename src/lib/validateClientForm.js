import { EMAIL_PATTERN } from './emailPattern.js'

export function validateClientForm({ name, email }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Client name is required.'
  }

  if (email && email.trim() && !EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  return errors
}
