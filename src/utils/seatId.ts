/**
 * 서버 좌석 문자열(A01, A10 등)과 UI seat.id(A1, A10)를 동일 키로 맞춥니다.
 */
export function normalizeSeatId(raw: string): string {
  const s = raw.trim().toUpperCase()
  const m = s.match(/^([A-Z]+)(\d+)$/)
  if (!m) return s
  return `${m[1]}${parseInt(m[2], 10)}`
}

/** INIT_STATE.reserved: string[] 또는 { seatNumber: string }[] */
export function parseReservedSeatIds(reserved: unknown): string[] {
  if (!Array.isArray(reserved)) return []
  const out: string[] = []
  for (const item of reserved) {
    if (typeof item === 'string') {
      out.push(normalizeSeatId(item))
      continue
    }
    if (item && typeof item === 'object' && 'seatNumber' in item) {
      const sn = (item as { seatNumber?: unknown }).seatNumber
      if (typeof sn === 'string') out.push(normalizeSeatId(sn))
    }
  }
  return out
}

/**
 * "scheduleId:seatNumber:userId" → normalized seatNumber → userId
 */
export function parseOccupiedEntries(
  keys: string[],
  scheduleId: number
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const key of keys) {
    const parts = key.split(':')
    if (parts.length < 3) continue
    const sId = parts[0]
    const ownerId = parts[parts.length - 1]
    const seatNum = parts.slice(1, -1).join(':')
    if (Number(sId) !== Number(scheduleId)) continue
    map[normalizeSeatId(seatNum)] = ownerId
  }
  return map
}

/** OCCUPIED/RELEASED 항목에서 정규화된 seat id 추출 */
export function seatIdFromOccupiedKey(key: string): string | null {
  const parts = key.split(':')
  if (parts.length < 3) return null
  const seatNum = parts.slice(1, -1).join(':')
  return normalizeSeatId(seatNum)
}
