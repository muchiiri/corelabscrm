const AVATAR_COLORS = ['gray', 'red', 'orange', 'green', 'blue', 'purple']

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getAvatarColor(name, email) {
  const key = (name ?? '').trim() || (email ?? '').trim()
  if (!key) {
    return AVATAR_COLORS[0]
  }
  return AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length]
}
