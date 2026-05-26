/** SeatPage / PaymentPage — 서버 MyWebSocketHandler 엔드포인트 URL */

/**
 * WebSocket 베이스 URL 반환
 *
 * 개발: window.location.host 사용 → Vite /ws 프록시 경유 → 8080 도달
 * 배포: VITE_WS_BASE 환경변수가 있으면 그 값 사용 (Vercel 등 WS 프록시 불가 환경)
 *        예) VITE_WS_BASE=wss://cineos.duckdns.org:8080
 */
export function getSeatWebSocketBase(): string {
  if (import.meta.env.VITE_WS_BASE) {
    return import.meta.env.VITE_WS_BASE as string
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

/**
 * 쿼리 순서 고정: userId → page → scheduleId (MyWebSocketHandler.java)
 */
export function buildSeatWebSocketUrl(scheduleId: number, userId: string): string {
  return `${getSeatWebSocketBase()}/ws/seats?userId=${encodeURIComponent(userId)}&page=seat&scheduleId=${scheduleId}`
}
