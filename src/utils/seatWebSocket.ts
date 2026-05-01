/** SeatPage / PaymentPage 동일 — 서버 TextWebSocketHandler 엔드포인트 */
export function buildSeatWebSocketUrl(scheduleId: number, userId: string): string {
    return `ws://localhost:8080/ws/seats?scheduleId=${scheduleId}&userId=${encodeURIComponent(userId)}`
}
