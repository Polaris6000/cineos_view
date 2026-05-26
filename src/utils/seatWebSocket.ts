/** SeatPage / PaymentPage — 서버 MyWebSocketHandler 엔드포인트 URL */

/** 현재 페이지와 동일 호스트 (LAN·다른 PC 접속 포함). 개발 시 Vite /ws → 8080 프록시 */
export function getSeatWebSocketBase(): string {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
}

/**
 * 쿼리 순서 고정: userId → page → scheduleId (MyWebSocketHandler.java)
 */
export function buildSeatWebSocketUrl(scheduleId: number, userId: string): string {
    return `${getSeatWebSocketBase()}/ws/seats?userId=${encodeURIComponent(userId)}&page=seat&scheduleId=${scheduleId}`
}
