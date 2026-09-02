export function getInitials(name, email) {
  const trimmedName = (name ?? '').trim()
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/)
    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase()
    }
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
  }

  const trimmedEmail = (email ?? '').trim()
  if (trimmedEmail) {
    return trimmedEmail.slice(0, 1).toUpperCase()
  }

  return '?'
}
