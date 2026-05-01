/**
 * theaterConfig.ts — 상영관 좌석 배치 설정 (프론트 고정 상수)
 *
 * DB에 rows/cols/hasRecliner 컬럼이 없으므로 프론트에서 고정 상수로 관리.
 * 상영관 좌석 구성은 개관 시 결정되며 이후 변경이 없다는 전제.
 *
 * !!! 상영관 추가/변경 시 이 파일만 수정하면
 *   SeatPage(고객) / SeatListPage(관리자) 양쪽에 자동 반영됨.
 *
 * | 관 | 행×열  | 총 석 | 리클라이너 | 통로        |
 * |----|--------|-------|-----------|------------|
 * | 1  | 8 × 10 | 80석  | ✗ (전좌석 일반) | 양쪽 2칸 |
 * | 2  | 10× 10 | 100석 | ✗ (전좌석 일반) | 양쪽 2칸 |
 * | 3  | 6 × 10 | 60석  | ✗ (전좌석 일반) | 양쪽 2칸 |
 * | 4  | 6 × 6  | 36석  | ✓ (전좌석 리클라이너) | 통로 없음 |
 */

/** 상영관 좌석 배치 설정 타입 */
export interface TheaterConfig {
    rows: number   // 행 수
    cols: number   // 열 수
    /**
     * 리클라이너 관 여부
     * true  → 해당 관의 전 좌석이 RECLINER (통로도 없음 — cols <= 6 조건으로 자동 처리)
     * false → 해당 관의 전 좌석이 NORMAL
     */
    hasRecliner: boolean
}

/**
 * 상영관 번호(no) → 좌석 배치 설정 매핑
 */
export const THEATER_CONFIG: Record<number, TheaterConfig> = {
    1: {rows: 8, cols: 10, hasRecliner: false},
    2: {rows: 10, cols: 10, hasRecliner: false},
    3: {rows: 7, cols: 6, hasRecliner: true},
    4: {rows: 6, cols: 6, hasRecliner: true}, // 리클라이너 전용관 — 전좌석 리클라이너, 통로 없음
}

/** 설정이 없는 상영관에 적용할 기본값 (예상치 못한 상영관 번호 대비) */
export const DEFAULT_THEATER_CONFIG: TheaterConfig = {
    rows: 8,
    cols: 10,
    hasRecliner: false,
}
