import { EMAIL_PATTERN } from './emailPattern.js'

export function validateAddMemberForm({ email, role }) {
  const errors = {}

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
    errors.role = 'Select a role.'
  }

  return errors
}
