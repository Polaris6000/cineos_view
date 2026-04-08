/**
 * apiClient.ts — 공통 axios 인스턴스
 *
 * - baseURL: '/api' → Vite dev server proxy → http://localhost:8080/api
 * - 빌드 후에는 Spring Boot가 직접 서빙하므로 상대 경로 그대로 동작
 * - 모든 API 호출에서 이 인스턴스를 import해서 사용
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',        // Vite proxy: /api → localhost:8080
  timeout: 10_000,        // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 응답 에러 인터셉터 ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url    = error.config?.url ?? '(unknown)'
    console.error(`[API Error] ${status ?? 'network'} → ${url}`, error.message)
    return Promise.reject(error)
  },
)

export default apiClient

/* ────────────────────────────────────────────────────────
   백엔드 DTO 타입 정의 (MovieDTO / ScheduleDTO / TheaterDTO 등)
   - camelCase 필드명 (Spring @JsonProperty 기본값)
   - 프론트 내부 타입과 구분하기 위해 접두사 없이 명시적으로 네이밍
   ─────────────────────────────────────────────────────── */

/** GET /api/movie/all, /api/movie/realAll 응답 */
export interface MovieDTO {
  movieId:     number
  title:       string
  genre:       string | null
  /** 'ALL' | '12' | '15' | '19' */
  rating:      string
  runtime:     number
  director:    string | null
  actors:      string | null       // 프론트 cast 에 해당
  description: string | null       // 프론트 synopsis 에 해당
  startAt:     string              // 'YYYY-MM-DD'
  endAt:       string | null       // ISO datetime or null
  createAt:    string | null
  posterPath:  string | null       // TMDB 경로 또는 로컬 파일 경로
  image:       null                // 업로드 전용, 응답에는 항상 null
}

/** GET /api/admin/schedule/list, /api/admin/schedule/{movieId}/movie 응답 */
export interface ScheduleDTO {
  id:         number
  no:         number               // 상영관 번호 (theater.no)
  movieId:    number
  startAt:    string               // ISO datetime 'YYYY-MM-DDTHH:mm:ss'
  endAt:      string               // ISO datetime
  activation: boolean
}

/** GET /api/admin/theater/list, /api/admin/theater/{no} 응답 */
export interface TheaterDTO {
  no:          number
  policyId:    number              // seat_policy FK
  cleanupTime: number              // 분 단위
}

/** GET /api/admin/seat-policy/list, /api/admin/seat-policy/{no} 응답 */
export interface SeatPolicyDTO {
  policyId: number
  name:     string                 // '일반', '리클라이너'
  cost:     number                 // 원 단위
}

/** GET /api/admin/discount-policy/list 응답 */
export interface DiscountPolicyDTO {
  id:            number
  policyName:    string
  discountType:  'RATIO' | 'WON'
  discountValue: number
  conditionType: 'TIME' | 'AGE' | 'JOB' | 'COUPON'
  startAt:       string            // ISO datetime
  endAt:         string | null
  activation:    boolean
}

/** GET /api/admin/member/list 응답 */
export interface MemberDTO {
  phone:    string
  point:    number
  createAt: string                 // ISO datetime
}

/** GET /api/admin/member/{phone}/point-list 응답 */
export interface PointHistoryDTO {
  pointId:     number
  paymentId:   string | null
  phone:       string
  type:        'EARN' | 'USE' | 'REFUND_EARN' | 'REFUND_USE'
  amountPoint: number              // 항상 양수 (부호는 type으로 판단)
  createAt:    string              // ISO datetime
}

/* ────────────────────────────────────────────────────────
   유틸: 포스터 URL 생성
   - TMDB 경로('/' 시작): TMDB 이미지 CDN 접두사 붙임
   - http(s) 로 시작: 그대로 사용
   - null / 빈 문자열: placeholder 이미지
   ─────────────────────────────────────────────────────── */
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

export function resolvePosterUrl(posterPath: string | null | undefined): string {
  if (!posterPath) return '/placeholder-poster.jpg'
  if (posterPath.startsWith('http')) return posterPath
  return `${TMDB_IMAGE_BASE}${posterPath}`
}

/* ────────────────────────────────────────────────────────
   유틸: 상영관 번호 → 표시 이름
   e.g.  1 → '1관'  /  5 → '5관'
   ─────────────────────────────────────────────────────── */
export function theaterName(no: number): string {
  return `${no}관`
}
