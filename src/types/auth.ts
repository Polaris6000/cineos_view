/**
 * types/auth.ts — 인증/권한 관련 타입 정의
 *
 * 역할 체계:
 *   SUPER_ADMIN (최고관리자) — 모든 기능 접근 가능
 *   MANAGER     (일반관리자) — 매장 운영 기능만 허용, 통계/정책/계정관리 불가
 */

/* ── 역할 ──────────────────────────────────────────── */
export type AdminRole = 'MASTER' | 'STAFF'

/* ── 개별 권한 단위 ─────────────────────────────────── */
export type Permission =
    | 'ROLE_REFUND' // 환불 처리         (UC-17)
    | 'ROLE_MOVIE_LIST' // 영화 목록 조회
    | 'ROLE_MOVIE_REGISTER'// 영화 등록          (UC-18)
    | 'ROLE_MOVIE_EDIT' // 영화 수정          (UC-19)
    | 'ROLE_MOVIE_DELETE' // 영화 삭제          (UC-20)
    | 'ROLE_THEATER_LIST' // 상영관 조회
    | 'ROLE_THEATER_EDIT' // 상영관/좌석 수정   (UC-21)
    | 'ROLE_POLICY_LIST' // 정책 조회          (SUPER_ADMIN only)
    | 'ROLE_POLICY_EDIT' // 정책 수정          (SUPER_ADMIN only)
    | 'ROLE_STATISTICS' // 통계 전체          (SUPER_ADMIN only)
    | 'ROLE_MEMBER_MANAGEMENT' // 회원 조회          (SUPER_ADMIN only)
    | 'ROLE_ADMIN_MANAGEMENT' // 관리자 계정 관리   (SUPER_ADMIN only)

/* ── 역할별 기본 권한 셋 ────────────────────────────── */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
    MASTER: [
        'ROLE_REFUND',
        'ROLE_MOVIE_LIST', 'ROLE_MOVIE_REGISTER', 'ROLE_MOVIE_EDIT', 'ROLE_MOVIE_DELETE',
        'ROLE_THEATER_LIST', 'ROLE_THEATER_EDIT',
        'ROLE_POLICY_LIST', 'ROLE_POLICY_EDIT',
        'ROLE_STATISTICS',
        'ROLE_MEMBER_MANAGEMENT',
        'ROLE_ADMIN_MANAGEMENT',
    ],
    STAFF: [],
}

/* ── 관리자 계정 타입 ────────────────────────────────── */
export interface AdminUser {
    adminId: number // 관리자 인덱스
    loginId: string // 로그인한 아이디
    password: string
    name?: string // 관리자 이름
    adminPhone: string // 관리자 전화번호
    level: boolean // false: MASTER, true: STAFF
    uuid: string // 자동로그인을 위한 토큰
    createdAt: string // 생성일

    permissions: string[] // 권한 리스트 — 동적 API 응답이므로 string[]로 처리
}