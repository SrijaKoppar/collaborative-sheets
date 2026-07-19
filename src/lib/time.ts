/**
 * Formats a millisecond timestamp as a short relative time string,
 * e.g. "just now", "5m ago", "3h ago", or a locale date for anything older.
 */
export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "Unknown"

  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}
