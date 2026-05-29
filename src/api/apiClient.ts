import axios from 'axios'
import {showToast} from '../utils/toast'

// ── AccessToken 메모리 저장소 ────────────────────────────
// localStorage 대신 메모리에 저장 (XSS 방어)
// 브라우저 새로고침/재접속시 사라짐 → AuthProvider에서 재발급 처리
let inMemoryAccessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
    inMemoryAccessToken = token;
};
export const getAccessToken = () => inMemoryAccessToken;

const apiClient = axios.create({
    baseURL: '/api',
    timeout: 15_000,
    headers: {'Content-Type': 'application/json'},
    withCredentials: true, // RefreshToken 쿠키 자동 전송을 위해 추가
})

// ── 요청 인터셉터 ────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
    // localStorage 대신 메모리에서 꺼냄
    if (inMemoryAccessToken) {
        config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
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

        // 기존 Toast 에러 처리 코드 그대로 유지
        if (status === 400) {
            const detail = typeof error.response?.data === 'string'
                ? error.response.data : '잘못된 요청입니다.'
            showToast(detail, 'error')
        } else if (status === 202 && error.response?.data) {
            const detail = typeof error.response.data === 'string'
                ? error.response.data : '이미 처리된 요청입니다.'
            showToast(detail, 'warning')
        } else if (status === 404 && !url.includes('/member/')) {
            showToast('해당 정보를 찾을 수 없습니다.', 'error')
        } else if (status === 500) {
            const detail = typeof error.response?.data === 'string'
                ? error.response.data : '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            showToast(detail, 'error')
        } else if (!status) {
            showToast('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.', 'error')
        }

        // ── 401 처리 ─────────────────────────────────────────
        if (status === 401 && !url.includes('/admin/login')) {
            inMemoryAccessToken = null // 메모리 토큰 초기화
            localStorage.removeItem('cineos_admin')
            sessionStorage.removeItem('cineos_admin')
            window.location.href = '/admin/login'
            return Promise.reject(error)
        }

        // ── 403 처리 (AccessToken 만료) ───────────────────────
        if (status === 403 && !url.includes('/admin/login') && !url.includes('/admin/refresh')) {

            if (error.config._retry) {
                // 재발급도 실패 → 로그인 페이지
                inMemoryAccessToken = null
                localStorage.removeItem('cineos_admin')
                sessionStorage.removeItem('cineos_admin')
                window.location.href = '/admin/login'
                return Promise.reject(error)
            }

            error.config._retry = true

            try {
                // RefreshToken 쿠키로 AccessToken 재발급 (쿠키는 withCredentials로 자동 전송)
                const res = await apiClient.post('/admin/refresh', {
                    accessToken: inMemoryAccessToken // 만료된 AccessToken 전송
                })

                inMemoryAccessToken = res.data.accessToken // 메모리에 저장

                // 실패했던 요청 새 AccessToken으로 재시도
                error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
                return apiClient(error.config)
            } catch {
                // RefreshToken도 만료 → 로그인 페이지
                inMemoryAccessToken = null
                localStorage.removeItem('cineos_admin')
                sessionStorage.removeItem('cineos_admin')
                window.location.href = '/admin/login'
            }
        }

        return Promise.reject(error)
    },
)

export default apiClient

// 기존 유틸 함수들 (getKSTDateString, getDateFromISO 등) 그대로 유지
export function getKSTDateString(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA')
}

export function getDateFromISO(isoStr: string): string {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-CA')
}

export function getTimeFromISO(isoStr: string): string {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
}

export interface MovieDTO {
    movieId: number;
    title: string;
    genre: string | null;
    rating: string;
    runtime: number;
    director: string | null;
    actors: string | null;
    description: string | null;
    startAt: string;
    endAt: string | null;
    createAt: string | null;
    posterPath: string | null;
    image: null
}

export interface ScheduleDTO {
    id: number;
    no: number;
    movieId: number;
    startAt: string;
    endAt: string;
    activation: boolean
}

export interface TheaterDTO {
    no: number;
    policyId: number;
    cleanupTime: number;
    rows: number;
    cols: number;
    hasRecliner: boolean
}

export interface SeatPolicyDTO {
    policyId: number;
    name: string;
    cost: number
}

export interface DiscountPolicyDTO {
    id: number;
    policyName: string;
    discountType: 'RATIO' | 'WON';
    discountValue: number;
    conditionType: 'TIME' | 'AGE' | 'JOB' | 'COUPON';
    startAt: string;
    endAt: string | null;
    activation: boolean
}

export interface MemberDTO {
    phone: string;
    point: number;
    createAt: string
}

export interface PointHistoryDTO {
    pointId: number;
    paymentId: string | null;
    phone: string;
    type: 'EARN' | 'USE' | 'REFUND_EARN' | 'REFUND_USE';
    amountPoint: number;
    createAt: string
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

/**
 * DB posterPath → 화면 표시용 URL
 * - /uploads/... : 백엔드 uploads 폴더 (백엔드에서 서빙)
 * - http(s)://... : 레거시 TMDB full URL
 * - /abc.jpg      : 레거시 TMDB 상대 경로
 */
export function resolvePosterUrl(posterPath: string | null | undefined): string {
    if (!posterPath) return '/placeholder-poster.jpg'
    if (posterPath.startsWith('http')) return posterPath // 레거시 TMDB full URL
    // uploads 폴더 정적 경로 (Vite/프론트 서버가 /uploads/** 서빙)
    if (posterPath.startsWith('/uploads/')) return `https://cineos-server.duckdns.org${posterPath}`
    return `${TMDB_IMAGE_BASE}${posterPath}` // 레거시 TMDB 상대 경로
}

export function theaterName(no: number): string {
    return `${no}관`
}
