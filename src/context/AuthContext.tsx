/**
 * AuthContext.tsx — 관리자 인증 전역 Context
 *
 * 제공하는 값:
 *   currentAdmin  — 현재 로그인한 관리자 (null이면 미로그인)
 *   login()       — 로그인 처리 (더미 → 백엔드 연동 시 교체)
 *   logout()      — 로그아웃
 *   hasPermission() — 특정 권한 보유 여부 확인
 *   isSuperAdmin  — 최고관리자 여부 (편의 getter)
 *
 * 사용 예시:
 *   const { currentAdmin, hasPermission } = useAuth()
 *   if (!hasPermission('statistics')) return <Forbidden />
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  type AdminUser,
  type Permission,
  MOCK_ADMIN_ACCOUNTS,
  MOCK_PASSWORDS,
} from '../types/auth'

/**
 * 자동 로그인 저장소 키
 * - localStorage  : 자동 로그인 ON  → 브라우저 닫아도 유지
 * - sessionStorage: 자동 로그인 OFF → 탭/브라우저 닫으면 소멸
 *
 * TODO: 백엔드 AdminController 구현 완료 시
 *   - POST /api/admin/login → 응답의 uuid를 저장
 *   - 앱 시작 시 uuid가 있으면 GET /api/admin/login/auto?uuid=... 로 세션 복원
 *   (현재는 백엔드 uuid 컬럼/mapper만 존재하고 API 엔드포인트 미구현)
 */
const STORAGE_KEY = 'cineos_admin'

/* ── Context 타입 ───────────────────────────────────── */
interface AuthContextValue {
  currentAdmin:    AdminUser | null
  /**
   * 로그인 시도. 성공 시 true, 실패 시 false 반환
   * @param rememberMe true → localStorage(자동로그인), false → sessionStorage(탭 닫으면 해제)
   */
  login:           (id: string, password: string, rememberMe: boolean) => Promise<boolean>
  logout:          () => void
  hasPermission:   (permission: Permission) => boolean
  isSuperAdmin:    boolean
}

/* ── Context 생성 ───────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

/* ── Provider ───────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * 초기 로그인 상태 복원
   * localStorage → sessionStorage 순서로 확인
   * (자동로그인이면 localStorage에, 아니면 sessionStorage에 저장돼 있음)
   */
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const fromLocal   = localStorage.getItem(STORAGE_KEY)
      const fromSession = sessionStorage.getItem(STORAGE_KEY)
      const raw = fromLocal ?? fromSession
      return raw ? (JSON.parse(raw) as AdminUser) : null
    } catch {
      return null
    }
  })

  /**
   * login — 아이디/비밀번호로 인증
   * @param rememberMe true: localStorage에 저장(영구), false: sessionStorage에 저장(탭 닫으면 해제)
   *
   * TODO: POST /api/admin/login 연동 후 더미 코드 교체
   *   성공 응답의 adminDTO.uuid를 받아서 저장해야 함
   */
  const login = useCallback(async (
    id: string,
    password: string,
    rememberMe: boolean,
  ): Promise<boolean> => {
    // 네트워크 딜레이 시뮬레이션
    await new Promise((r) => setTimeout(r, 500))

    const expectedPw = MOCK_PASSWORDS[id]
    if (!expectedPw || expectedPw !== password) return false

    const account = MOCK_ADMIN_ACCOUNTS.find((a) => a.id === id)
    if (!account) return false

    setCurrentAdmin(account)

    const serialized = JSON.stringify(account)
    if (rememberMe) {
      // 자동 로그인 ON: 브라우저 닫아도 유지
      localStorage.setItem(STORAGE_KEY, serialized)
      sessionStorage.removeItem(STORAGE_KEY) // 중복 방지
    } else {
      // 자동 로그인 OFF: 탭/브라우저 닫으면 해제
      sessionStorage.setItem(STORAGE_KEY, serialized)
      localStorage.removeItem(STORAGE_KEY)   // 중복 방지
    }
    return true
  }, [])

  /** logout — 로그아웃 후 양쪽 저장소 모두 삭제 */
  const logout = useCallback(() => {
    setCurrentAdmin(null)
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  /**
   * hasPermission — 현재 관리자가 해당 권한을 가졌는지 확인
   * 미로그인 상태에서는 항상 false
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentAdmin) return false
    return currentAdmin.permissions.includes(permission)
  }, [currentAdmin])

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN'

  return (
    <AuthContext.Provider value={{ currentAdmin, login, logout, hasPermission, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

/* ── 훅 ─────────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용 가능합니다.')
  return ctx
}
