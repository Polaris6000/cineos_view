/**
 * statsTestData.ts — 관리자 통계 페이지용 임시 테스트 데이터
 *
 * 백엔드 통계 API(GET /api/admin/stats/*)가 완성되면 이 파일을 제거하고
 * 각 Stats 페이지에서 직접 API 연동으로 교체할 것.
 *
 * 연동 예정 엔드포인트:
 *   - GET /api/admin/stats/daily   → MOCK_DAILY_STATS
 *   - GET /api/admin/stats/monthly → MOCK_MONTHLY_STATS
 *   - GET /api/admin/stats/by-day  → MOCK_DAY_STATS
 *   - GET /api/admin/stats/by-hour → MOCK_HOUR_STATS
 *   - GET /api/admin/stats/by-movie → MOCK_MOVIE_STATS
 */

/** 날짜 포맷 헬퍼 (YYYY-MM-DD) */
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 최근 30일 일별 통계 */
export const MOCK_DAILY_STATS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  const isWeekend = d.getDay() === 0 || d.getDay() === 6
  const base = isWeekend ? 350 : 180
  const tickets = base + (i * 7) % 100
  return {
    date:    fmt(d),
    tickets,
    revenue: tickets * 14000,
  }
})

/** 최근 12개월 월별 통계 */
export const MOCK_MONTHLY_STATS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - (11 - i))
  const tickets = 5000 + i * 500 + (i % 3) * 1000
  return {
    month:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    tickets,
    revenue: tickets * 14000,
  }
})

/** 요일별 평균 통계 (0=일 ~ 6=토) */
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토']
export const MOCK_DAY_STATS = DAYS_KR.map((day, i) => {
  const isWeekend = i === 0 || i === 6
  const tickets = isWeekend ? 420 + i * 10 : 150 + i * 30
  return { day, tickets, revenue: tickets * 14000 }
})

/** 시간대별 평균 통계 (09시~22시) */
export const MOCK_HOUR_STATS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 9
  const isPeak = hour >= 18 && hour <= 21
  const tickets = isPeak ? 90 + i * 5 : 20 + i * 3
  return {
    hour:    `${String(hour).padStart(2, '0')}:00`,
    tickets,
    revenue: tickets * 14000,
  }
})

/** 영화별 통계 (샘플 — 실제 영화 목록으로 교체 필요) */
export const MOCK_MOVIE_STATS = [
  { movieId: 1, title: '오펜하이머',    tickets: 4800, revenue: 4800 * 14000, rating: '15' },
  { movieId: 2, title: '범죄도시 4',    tickets: 4200, revenue: 4200 * 14000, rating: '15' },
  { movieId: 3, title: '인사이드 아웃 2', tickets: 3600, revenue: 3600 * 14000, rating: 'ALL' },
  { movieId: 4, title: '파묘',          tickets: 3100, revenue: 3100 * 14000, rating: '15' },
  { movieId: 5, title: '패스트 라이브즈', tickets: 2500, revenue: 2500 * 14000, rating: '12' },
  { movieId: 6, title: '듄: 파트2',     tickets: 2200, revenue: 2200 * 14000, rating: '12' },
  { movieId: 7, title: '웡카',         tickets: 1800, revenue: 1800 * 14000, rating: 'ALL' },
  { movieId: 8, title: '아가일',        tickets: 1500, revenue: 1500 * 14000, rating: '12' },
]