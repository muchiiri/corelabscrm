export function validateCommentBody({ body }) {
  const errors = {}

  if (!body.trim()) {
    errors.body = 'Comment is required.'
  }

  return errors
}
