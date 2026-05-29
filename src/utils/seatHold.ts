/**
 * 키오스크 임시 좌석 점유 — localStorage 기반 고객 UUID
 *
 * UUID 유지: 창 닫기/새로고침/결제 페이지 이동 (재접속 시 동일 userId로 서버 복구)
 * UUID 삭제: 결제 완료, 뒤로가기, 로고/홈, 비활성 타이머 만료 (+ 서버 즉시 해제)
 */
import apiClient from '../api/apiClient'

/** localStorage — 키오스크 WebSocket userId (탭/창 닫아도 유지) */
export const KIOSK_WS_USER_ID_KEY = 'cineos_kiosk_ws_user_id'

const HOLD_KEY = 'cineos_seat_hold'

/** 이전 키 (마이그레이션 후 제거) */
const LEGACY_LOCAL_USER_KEY = 'ws_user_id'
const LEGACY_SESSION_USER_KEY = 'cineos_ws_user_id'

export interface SeatHold {
    scheduleId: number
    userId: string
    seats?: string[]
}

function readLocal(key: string): string | null {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

function writeLocal(key: string, value: string): void {
    try {
        localStorage.setItem(key, value)
    } catch {
        /* ignore */
    }
}

function removeLocal(key: string): void {
    try {
        localStorage.removeItem(key)
    } catch {
        /* ignore */
    }
}

/** localStorage에 없으면 생성. sessionStorage/구 키는 한 번만 이전 */
export function getOrCreateKioskWsUserId(): string {
    const existing = readLocal(KIOSK_WS_USER_ID_KEY)
    if (existing?.trim()) return existing.trim()

    let migrated: string | null = readLocal(LEGACY_LOCAL_USER_KEY)
    if (!migrated) {
        try {
            migrated = sessionStorage.getItem(LEGACY_SESSION_USER_KEY)
        } catch {
            /* ignore */
        }
    }

    const userId = migrated?.trim() || crypto.randomUUID()
    writeLocal(KIOSK_WS_USER_ID_KEY, userId)
    removeLocal(LEGACY_LOCAL_USER_KEY)
    try {
        sessionStorage.removeItem(LEGACY_SESSION_USER_KEY)
    } catch {
        /* ignore */
    }
    return userId
}

export function getKioskWsUserId(): string | null {
    const id = readLocal(KIOSK_WS_USER_ID_KEY)
    return id?.trim() ? id.trim() : null
}

export function getSeatHold(): SeatHold | null {
    try {
        const raw = readLocal(HOLD_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as SeatHold
        if (parsed?.scheduleId != null && parsed?.userId) return parsed
    } catch {
        /* ignore */
    }
    return null
}

export function setSeatHold(scheduleId: number, userId: string, seats: string[] = []): void {
    writeLocal(HOLD_KEY, JSON.stringify({scheduleId, userId, seats}))
}

export function getRestoredMySeats(scheduleId: number, userId: string): string[] {
    const hold = getSeatHold()
    if (!hold || hold.scheduleId !== scheduleId || hold.userId !== userId) return []
    return hold.seats ?? []
}

/** 점유 메타만 삭제 (UUID 유지 — 좌석 전부 해제 토글 시) */
export function clearSeatHold(): void {
    removeLocal(HOLD_KEY)
}

/**
 * 결제 완료/뒤로가기/홈/타이머 만료 시 호출.
 * localStorage UUID + hold 제거 (다음 예매는 새 UUID).
 */
export function clearKioskSeatIdentity(): void {
    removeLocal(KIOSK_WS_USER_ID_KEY)
    removeLocal(HOLD_KEY)
    removeLocal(LEGACY_LOCAL_USER_KEY)
    try {
        sessionStorage.removeItem(LEGACY_SESSION_USER_KEY)
    } catch {
        /* ignore */
    }
}

/** REST 즉시 해제 후 키오스크 UUID 삭제 */
export async function releaseSeatHoldApi(hold?: SeatHold | null): Promise<void> {
    const target = hold ?? getSeatHold()
    const userId = target?.userId ?? getKioskWsUserId()
    const scheduleId = target?.scheduleId

    if (userId && scheduleId != null) {
        try {
            await apiClient.post('/reservation/seat/release', {userId, scheduleId})
        } catch (e) {
            console.warn('[SeatHold] REST 해제 실패:', e)
        }
    }
    clearKioskSeatIdentity()
}
