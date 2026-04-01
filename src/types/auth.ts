/**
 * types/auth.ts — 인증/권한 관련 타입 정의
 *
 * 역할 체계:
 *   SUPER_ADMIN (최고관리자) — 모든 기능 접근 가능
 *   MANAGER     (일반관리자) — 매장 운영 기능만 허용, 통계·정책·계정관리 불가
 */

/* ── 역할 ──────────────────────────────────────────── */
export type AdminRole = 'SUPER_ADMIN' | 'MANAGER'

/* ── 개별 권한 단위 ─────────────────────────────────── */
export type Permission =
  | 'refund'          // 환불 처리         (UC-17)
  | 'movie.view'      // 영화 목록 조회
  | 'movie.create'    // 영화 등록          (UC-18)
  | 'movie.edit'      // 영화 수정          (UC-19)
  | 'movie.delete'    // 영화 삭제          (UC-20)
  | 'theater.view'    // 상영관 조회
  | 'theater.edit'    // 상영관/좌석 수정   (UC-21)
  | 'policy.view'     // 정책 조회          (SUPER_ADMIN only)
  | 'policy.edit'     // 정책 수정          (SUPER_ADMIN only)
  | 'statistics'      // 통계 전체          (SUPER_ADMIN only)
  | 'member.view'     // 회원 조회          (SUPER_ADMIN only)
  | 'account.manage'  // 관리자 계정 관리   (SUPER_ADMIN only)

/* ── 역할별 기본 권한 셋 ────────────────────────────── */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'refund',
    'movie.view', 'movie.create', 'movie.edit', 'movie.delete',
    'theater.view', 'theater.edit',
    'policy.view', 'policy.edit',
    'statistics',
    'member.view',
    'account.manage',
  ],
  MANAGER: [
    'refund',
    'movie.view', 'movie.create', 'movie.edit', 'movie.delete',
    'theater.view', 'theater.edit',
  ],
}

/* ── 관리자 계정 타입 ────────────────────────────────── */
export interface AdminUser {
  id: string           // 로그인 아이디
  name: string         // 표시 이름
  role: AdminRole
  /** 역할 기본값을 덮어쓸 수 있는 개별 권한 목록 (최고관리자가 설정) */
  permissions: Permission[]
}

/* ── 더미 계정 데이터 (TODO: 백엔드 API 연동 시 제거) ── */
export const MOCK_ADMIN_ACCOUNTS: AdminUser[] = [
  {
    id: 'admin',
    name: '관리자',
    role: 'SUPER_ADMIN',
    permissions: ROLE_PERMISSIONS['SUPER_ADMIN'],
  },
  {
    id: 'manager',
    name: '김아르바',
    role: 'MANAGER',
    permissions: ROLE_PERMISSIONS['MANAGER'],
  },
  {
    id: 'manager2',
    name: '이아르바',
    role: 'MANAGER',
    // 최고관리자가 일부 권한 추가 부여한 케이스
    permissions: [...ROLE_PERMISSIONS['MANAGER']],
  },
]

/** 비밀번호 매핑 (더미) — id: password */
export const MOCK_PASSWORDS: Record<string, string> = {
  admin:    'admin123',
  manager:  'manager123',
  manager2: 'manager123',
}
