const KNOWN_MESSAGES = {
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed: 'Please confirm your email before logging in.',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  over_email_send_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
}

const DEFAULT_MESSAGE = 'Something went wrong logging you in. Please try again.'

export function getLoginErrorMessage(error) {
  if (KNOWN_MESSAGES[error.code]) {
    return KNOWN_MESSAGES[error.code]
  }
  if (/invalid login credentials/i.test(error.message)) {
    return KNOWN_MESSAGES.invalid_credentials
  }
  if (/email.*not.*confirmed/i.test(error.message)) {
    return KNOWN_MESSAGES.email_not_confirmed
  }
  if (/rate limit/i.test(error.message)) {
    return KNOWN_MESSAGES.over_request_rate_limit
  }
  return DEFAULT_MESSAGE
}
