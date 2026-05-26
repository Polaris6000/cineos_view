/**
 * statsApi.ts — 관리자 통계 API 공통 모듈
 *
 * 백엔드 단일 엔드포인트:
 *   GET /api/admin/statistics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&type=TYPE
 *
 * type 값에 따른 응답 필드 활용:
 *   DAY   → date(개별 날짜), day(요일 영문), revenue, customerCount
 *   MONTH → date(해당 월 1일, e.g. 2026-04-01), revenue, customerCount
 *   YEAR  → date(해당 년 1월 1일, e.g. 2026-01-01), revenue, customerCount
 *   HOUR  → title("HH시"), revenue, customerCount  (date = null)
 *   MOVIE → title(영화 제목), revenue, customerCount  (date = null)
 */
import apiClient from './apiClient'

// ── 타입 정의 ────────────────────────────────────────────

/** 백엔드 Days enum → 프론트 유니언 타입 */
export type DayOfWeek =
    | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY'
    | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'

/** 통계 조회 type 파라미터 */
export type StatType = 'DAY' | 'MONTH' | 'YEAR' | 'HOUR' | 'MOVIE'

/**
 * 백엔드 StatisticsDTO 매핑
 * - customerCount: 관람객 수 (프론트에서 tickets 역할)
 * - title: HOUR="HH시", MOVIE=영화제목, 나머지=null
 * - day: DAY 타입에서만 채워짐 (SUNDAY~SATURDAY)
 */
export interface StatisticsDTO {
    id: number | null
    day: DayOfWeek | null
    revenue: number
    customerCount: number
    date: string | null   // 'YYYY-MM-DD' — HOUR/MOVIE 타입은 null
    title: string | null  // HOUR="HH시", MOVIE=영화제목
}

// ── API 함수 ─────────────────────────────────────────────

/**
 * 통계 데이터 조회
 * @param startDate 시작일 'YYYY-MM-DD'
 * @param endDate   종료일 'YYYY-MM-DD'
 * @param type      집계 단위 (DAY | MONTH | YEAR | HOUR | MOVIE)
 * @returns StatisticsDTO 배열
 * @throws 네트워크 오류나 서버 오류 시 throw (호출부에서 catch 필수)
 */
export async function fetchStatistics(
    startDate: string,
    endDate: string,
    type: StatType,
): Promise<StatisticsDTO[]> {
    const res = await apiClient.get<StatisticsDTO[]>('/admin/statistics', {
        params: {startDate, endDate, type},
    })
    return res.data
}

// ── 유틸 상수 ────────────────────────────────────────────

/** 영문 요일 → 한글 2글자 (일~토) */
export const DAY_KR: Record<DayOfWeek, string> = {
    SUNDAY: '일',
    MONDAY: '월',
    TUESDAY: '화',
    WEDNESDAY: '수',
    THURSDAY: '목',
    FRIDAY: '금',
    SATURDAY: '토',
}

/** 요일 표시 순서 (일 ~ 토) */
export const DAY_ORDER: DayOfWeek[] = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]
