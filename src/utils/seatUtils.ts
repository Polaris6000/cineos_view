/**
 * seatUtils.ts — 좌석 배치 생성 및 통로 분할 공용 유틸
 *
 * SeatPage(고객) / SeatListPage(관리자) 양쪽에서 동일하게 import해서 사용.
 * 두 페이지의 좌석 배치가 항상 일치하도록 단일 소스로 관리.
 */
import {DEFAULT_THEATER_CONFIG, THEATER_CONFIG} from '../config/theaterConfig'

/* ── 타입 ─────────────────────────────────────────────────────── */

/** 좌석 하나의 데이터 */
export interface SeatItem {
    id: string              // "A1", "B3" 형식 — WebSocket seatNumber와 동일
    row: string              // 행 라벨 (A, B, C ...)
    col: number              // 열 번호 (1~N)
    seatType: 'NORMAL' | 'RECLINER'
}

/* ── 좌석 배치 생성 ─────────────────────────────────────────────── */

/**
 * 상영관 번호(theaterNo) 기반 좌석 배치 생성
 *
 * - THEATER_CONFIG에 없는 번호는 DEFAULT_THEATER_CONFIG로 fallback
 * - hasRecliner=true  → 해당 관의 전 좌석이 모두 RECLINER
 * - hasRecliner=false → 해당 관의 전 좌석이 모두 NORMAL
 *
 * @param theaterNo - 상영관 번호 (THEATER_CONFIG 키)
 * @returns 행×열 순서로 정렬된 SeatItem 배열
 */
export function generateSeats(theaterNo: number): SeatItem[] {
    const config = THEATER_CONFIG[theaterNo] ?? DEFAULT_THEATER_CONFIG
    const {rows, cols, hasRecliner} = config

    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const seats: SeatItem[] = []

    for (let r = 0; r < rows; r++) {
        // hasRecliner=true면 전 좌석 RECLINER, false면 전 좌석 NORMAL
        const seatType: SeatItem['seatType'] = hasRecliner ? 'RECLINER' : 'NORMAL'

        for (let c = 1; c <= cols; c++) {
            seats.push({
                id: `${rowLabels[r]}${c}`,
                row: rowLabels[r],
                col: c,
                seatType,
            })
        }
    }

    return seats
}

/* ── 통로 분할 ──────────────────────────────────────────────────── */

/**
 * 한 행의 좌석을 통로 기준으로 세 그룹(left / middle / right)으로 분리
 *
 * 통로 규칙:
 *  - 열 수 <= 6 : 통로 없음 (리클라이너 전용관 — 6x6)
 *  - 열 수 >  6 : 양쪽 가장자리 2칸씩 고정 분리
 *
 * | 열 수 | sideCount | left | middle | right |
 * |-------|-----------|------|--------|-------|
 * | <= 6  | 0         | 전체 | (없음) | (없음)|
 * | 8     | 2         | 2    | 4      | 2     |
 * | 10    | 2         | 2    | 6      | 2     |
 *
 * @param rowSeats - 한 행의 좌석 배열 (col 순 정렬 보장 없음)
 */
export function splitRowByAisle(rowSeats: SeatItem[]): {
    left: SeatItem[]
    middle: SeatItem[]
    right: SeatItem[]
    sideCount: number   // 좌/우 그룹 크기 (헤더 열 번호 표시에도 사용)
} {
    const sorted = [...rowSeats].sort((a, b) => a.col - b.col)

    // 열 수 6 이하: 통로 없음 (리클라이너 전용관 등 소형 상영관)
    if (sorted.length <= 6) {
        return {left: sorted, middle: [], right: [], sideCount: 0}
    }

    // 열 수 7 이상: 양쪽 가장자리 2칸씩 고정
    const sideCount = 2
    return {
        left: sorted.slice(0, sideCount),                           // 1~2번 좌석
        middle: sorted.slice(sideCount, sorted.length - sideCount),   // 3~(N-2)번 좌석
        right: sorted.slice(-sideCount),                             // (N-1)~N번 좌석
        sideCount,
    }
}
