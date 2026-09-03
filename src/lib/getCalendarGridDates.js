export function getCalendarGridDates(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

  const lastOfMonth = new Date(year, month + 1, 0)
  const gridEnd = new Date(year, month, lastOfMonth.getDate() + (6 - lastOfMonth.getDay()))

  const dates = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}
