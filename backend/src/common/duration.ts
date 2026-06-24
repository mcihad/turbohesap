// Parse a JWT-style duration ("15m", "7d", "1h", "30s", or a bare number of
// seconds) into seconds. Used to report token lifetimes to clients.
export function durationToSeconds(input: string): number {
  const m = /^(\d+)\s*(s|m|h|d)?$/.exec(input.trim())
  if (!m) return 0
  const n = parseInt(m[1], 10)
  switch (m[2]) {
    case 'm':
      return n * 60
    case 'h':
      return n * 3600
    case 'd':
      return n * 86400
    default:
      return n
  }
}
