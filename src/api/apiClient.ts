/**
 * apiClient.ts — 공통 axios 인스턴스
 *
 * - baseURL: '/api' → Vite dev server proxy → http://localhost:8080/api
 * - 빌드 후에는 Spring Boot가 직접 서빙하므로 상대 경로 그대로 동작
 * - 모든 API 호출에서 이 인스턴스를 import해서 사용
 *
 * [에러 처리 흐름]
 *   백엔드 GlobalExceptionHandler가 던지는 에러를 Toast로 표시:
 *   400 — IllegalArgumentException: 잘못된 요청 (body에 메시지 있음)
 *   202 — IllegalStateException: 이미 처리됨 / 중복 (body에 메시지 있음)
 *   404 — NoSuchElementException: 데이터 없음 (body 없음)
 *   500 — RuntimeException: 서버 내부 오류 (body에 메시지 있음)
 *   401/403 — 토큰 인증 오류: 기존 재발급 로직 유지 (Toast 미사용)
 */
import axios from 'axios'
import { showToast } from '../utils/toast'

const apiClient = axios.create({
    baseURL: '/api',
    timeout: 15_000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// ── 요청 인터셉터 (JWT 토큰 첨부) ────────────────────────
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── 응답 인터셉터 ────────────────────────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status
        const url = error.config?.url ?? '(unknown)'
        console.error(`[API Error] ${status ?? 'network'} → ${url}`, error.message)

        /* ── 백엔드 GlobalExceptionHandler 에러 → Toast 표시 ──────────
           401/403은 아래의 토큰 재발급 로직이 처리하므로 여기서 제외.
           응답 body(string)가 있으면 해당 메시지를 표시하고,
           없으면 기본 메시지를 사용.
        ──────────────────────────────────────────────────────────── */
        if (status === 400) {
          // 400: IllegalArgumentException — 잘못된 요청 (body에 상세 메시지)
          const detail = typeof error.response?.data === 'string'
            ? error.response.data
            : '잘못된 요청입니다.'
          showToast(detail, 'error')
        } else if (status === 202 && error.response?.data) {
          // 202: IllegalStateException — 중복·이미 처리됨 (body에 상세 메시지)
          // ※ 정상 202 응답과 구분하기 위해 body가 있을 때만 경고로 표시
          const detail = typeof error.response.data === 'string'
            ? error.response.data
            : '이미 처리된 요청입니다.'
          showToast(detail, 'warning')
        } else if (status === 404 && !url.includes('/member/')) {
          // 404: NoSuchElementException — 데이터 없음
          // /member/ 경로는 PaymentPage에서 신규 회원 판단용으로 404를 직접 사용하므로 제외
          showToast('해당 정보를 찾을 수 없습니다.', 'error')
        } else if (status === 500) {
          // 500: RuntimeException — 서버 내부 오류
          const detail = typeof error.response?.data === 'string'
            ? error.response.data
            : '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          showToast(detail, 'error')
        } else if (!status) {
          // 네트워크 오류 (서버 응답 자체가 없음)
          showToast('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.', 'error')
        }

        // 401 처리
        // 로그인 요청(/admin/login) 자체가 401이면 재발급 시도 없이 바로 실패로 반환
        // — 이 경우 AuthContext.login()의 catch 블록이 처리함
        if (status === 401 && !url.includes('/admin/login') && !url.includes('/remember_me/auth')) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('cineos_admin')
            sessionStorage.removeItem('cineos_admin')
            window.location.href = '/admin/login'
            return Promise.reject(error)
        }

        if (status === 403 && !url.includes('/admin/login') && !url.includes('/admin/refresh') && !url.includes('/remember_me/auth')) {
            const accessToken = localStorage.getItem('accessToken')
            const refreshToken = localStorage.getItem('refreshToken')

            if (error.config._retry) {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('cineos_admin')
                sessionStorage.removeItem('cineos_admin')
                window.location.href = '/admin/login'
                return Promise.reject(error)
            }

            error.config._retry = true // 재시도 플래그 설정

            try {
                // RefreshToken으로 AccessToken 재발급 시도
                const res = await apiClient.post('/admin/refresh', {accessToken, refreshToken})
                localStorage.setItem('accessToken', res.data.accessToken)
                localStorage.setItem('refreshToken', res.data.refreshToken)

                // 실패한 요청 재시도 (새 AccessToken 첨부)
                error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
                return apiClient(error.config)
            } catch {

                try {
                    const res = await apiClient.post('/admin/remember_me/auth', {}, {withCredentials: true})
                    localStorage.setItem('accessToken', res.data)

                    error.config.headers.Authorization = `Bearer ${res.data}`
                    return apiClient(error.config)
                } catch {
                    // 자동로그인도 실패 → 로그인 페이지로
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    localStorage.removeItem('cineos_admin')
                    sessionStorage.removeItem('cineos_admin')
                    window.location.href = '/admin/login'
                }
            }
        }
        return Promise.reject(error)
    },
)

export default apiClient

/* ────────────────────────────────────────────────────────
   KST 날짜 유틸
   - toISOString()은 UTC 기준이라 한국(UTC+9) 자정~오전 9시에 날짜가 하루 어긋남
   - toLocaleDateString('en-CA')는 'YYYY-MM-DD' 형식으로 로컬(KST) 날짜 반환
   ─────────────────────────────────────────────────────── */

/**
 * 현재 KST 기준 날짜를 'YYYY-MM-DD' 형식으로 반환
 * 시스템 타임존이 KST(UTC+9)로 설정된 경우 정확히 동작하며,
 * 그렇지 않아도 toLocaleDateString이 브라우저 로컬 타임존을 사용하므로
 * toISOString()보다 항상 안전함
 */
export function getKSTDateString(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA') // 'YYYY-MM-DD' 형식
}

/**
 * ISO datetime 문자열('YYYY-MM-DDTHH:mm:ss')에서 KST 기준 날짜 추출
 * 백엔드 응답의 startAt, endAt 등에 사용
 * @example getDateFromISO('2026-04-11T01:00:00') → '2026-04-11'
 */
export function getDateFromISO(isoStr: string): string {
    // 백엔드가 KST로 저장된 ISO string을 반환하면 단순 slice만으로 충분
    // UTC로 저장된다면 Date 파싱 → toLocaleDateString 방식으로 변환
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-CA')
}

/**
 * ISO datetime 문자열에서 'HH:MM' 형식 시각 추출
 * @example getTimeFromISO('2026-04-11T14:30:00') → '14:30'
 */
export function getTimeFromISO(isoStr: string): string {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
}

/* ────────────────────────────────────────────────────────
   TMDB 포스터 URL 변환
   ─────────────────────────────────────────────────────── */

/** GET /api/admin/movie/readAll 응답 (관리자용 전체 조회) */
export interface MovieDTO {
    movieId: number
    title: string
    genre: string | null
    /** 'ALL' | '12' | '15' | '19' */
    rating: string
    runtime: number
    director: string | null
    actors: string | null       // 프론트 cast 에 해당
    description: string | null       // 프론트 synopsis 에 해당
    startAt: string              // 'YYYY-MM-DD'
    endAt: string | null       // ISO datetime or null
    createAt: string | null
    posterPath: string | null       // TMDB 경로 또는 로컬 파일 경로
    image: null                // 업로드 전용, 응답에는 항상 null
}

/** GET /api/admin/schedule/list, /api/admin/schedule/{movieId}/movie 응답 */
export interface ScheduleDTO {
    id: number
    no: number               // 상영관 번호 (theater.no)
    movieId: number
    startAt: string               // ISO datetime 'YYYY-MM-DDTHH:mm:ss'
    endAt: string               // ISO datetime
    activation: boolean
}

/** GET /api/admin/theater/list, /api/admin/theater/{no} 응답 */
export interface TheaterDTO {
    no: number
    policyId: number              // seat_policy FK
    cleanupTime: number              // 분 단위
    rows: number              // 상영관 행 수 (백엔드 TheaterDTO 추가 필드)
    cols: number              // 상영관 열 수
    hasRecliner: boolean             // 리클라이너 좌석 포함 여부
}

/** GET /api/admin/seat-policy/list, /api/admin/seat-policy/{no} 응답 */
export interface SeatPolicyDTO {
    policyId: number
    name: string                 // '일반', '리클라이너'
    cost: number                 // 원 단위
}

/** GET /api/admin/discount-policy/list 응답 */
export interface DiscountPolicyDTO {
    id: number
    policyName: string
    discountType: 'RATIO' | 'WON'
    discountValue: number
    conditionType: 'TIME' | 'AGE' | 'JOB' | 'COUPON'
    startAt: string            // ISO datetime
    endAt: string | null
    activation: boolean
}

/** GET /api/admin/member/list 응답 */
export interface MemberDTO {
    phone: string
    point: number
    createAt: string                 // ISO datetime
}

/** GET /api/admin/member/{phone}/point-list 응답 */
export interface PointHistoryDTO {
    pointId: number
    paymentId: string | null
    phone: string
    type: 'EARN' | 'USE' | 'REFUND_EARN' | 'REFUND_USE'
    amountPoint: number              // 항상 양수 (부호는 type으로 판단)
    createAt: string              // ISO datetime
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
