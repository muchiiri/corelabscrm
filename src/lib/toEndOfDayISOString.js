export function toEndOfDayISOString(dateString) {
  if (!dateString) {
    return null
  }
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
}
