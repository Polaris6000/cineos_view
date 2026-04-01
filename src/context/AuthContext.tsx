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

/* ── Context 타입 ───────────────────────────────────── */
interface AuthContextValue {
  currentAdmin:    AdminUser | null
  /** 로그인 시도. 성공 시 true, 실패 시 false 반환 */
  login:           (id: string, password: string) => Promise<boolean>
  logout:          () => void
  hasPermission:   (permission: Permission) => boolean
  isSuperAdmin:    boolean
}

/* ── Context 생성 ───────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

/* ── Provider ───────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage에서 로그인 상태 복원 (새로고침 대응)
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('cineos_admin')
      return saved ? (JSON.parse(saved) as AdminUser) : null
    } catch {
      return null
    }
  })

  /**
   * login — 아이디/비밀번호로 인증
   * TODO: POST /api/admin/login 연동 후 더미 코드 교체
   */
  const login = useCallback(async (id: string, password: string): Promise<boolean> => {
    // 네트워크 딜레이 시뮬레이션
    await new Promise((r) => setTimeout(r, 500))

    const expectedPw = MOCK_PASSWORDS[id]
    if (!expectedPw || expectedPw !== password) return false

    const account = MOCK_ADMIN_ACCOUNTS.find((a) => a.id === id)
    if (!account) return false

    setCurrentAdmin(account)
    // 세션 유지를 위해 localStorage에 저장 (비밀번호는 저장 안 함)
    localStorage.setItem('cineos_admin', JSON.stringify(account))
    return true
  }, [])

  /** logout — 로그아웃 후 세션 삭제 */
  const logout = useCallback(() => {
    setCurrentAdmin(null)
    localStorage.removeItem('cineos_admin')
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
