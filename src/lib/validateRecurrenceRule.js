export function validateRecurrenceRule({ frequency, interval, dueAt }) {
  const errors = {}

  if (!frequency) {
    return errors
  }

  if (!dueAt) {
    errors.recurrenceInterval = 'A due date is required to repeat a task.'
    return errors
  }

  const parsedInterval = Number(interval)
  if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
    errors.recurrenceInterval = 'Interval must be a whole number of 1 or more.'
  }

  return errors
}
