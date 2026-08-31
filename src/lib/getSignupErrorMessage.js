const KNOWN_MESSAGES = {
  user_already_exists: 'An account with this email already exists. Try logging in instead.',
  over_email_send_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  weak_password: 'Choose a stronger password.',
  email_address_invalid: 'Enter a valid email address.',
}

const DEFAULT_MESSAGE = 'Something went wrong creating your account. Please try again.'

export function getSignupErrorMessage(error) {
  if (KNOWN_MESSAGES[error.code]) {
    return KNOWN_MESSAGES[error.code]
  }
  if (/already registered|already exists/i.test(error.message)) {
    return KNOWN_MESSAGES.user_already_exists
  }
  if (/rate limit/i.test(error.message)) {
    return KNOWN_MESSAGES.over_email_send_rate_limit
  }
  return DEFAULT_MESSAGE
}
