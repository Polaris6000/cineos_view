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
  type Permission, ROLE_PERMISSIONS,
} from '../types/auth'
import axios from '../api/axiosToken.ts'

/* ── Context 타입 ───────────────────────────────────── */
interface AuthContextValue {
  currentAdmin:    AdminUser | null
  /** 로그인 시도. 성공 시 true, 실패 시 false 반환 */
  login:           (id: string, password: string) => Promise<boolean>
  logout:          () => void
  hasPermission:   (permission: Permission) => boolean
  isMaster: boolean
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
    try {
      const res = await axios.post('/api/admin/login', {
        loginId: id,
        password: password
      })

      const { accessToken, refreshToken, role } = res.data
      console.log(role);

      // 토큰 로컬스토리지에 저장
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      const adminInfo: AdminUser = {
        loginId: id,
        level: role === 'ROLE_MASTER' ? false : true,
        permissions: role === 'ROLE_MASTER' ? ROLE_PERMISSIONS['MASTER'] : []
      }
      console.log('관리자 확인용', adminInfo)
      setCurrentAdmin(adminInfo)
      return true
    } catch {
      return false
    }
  }, [])

  /** logout — 로그아웃 후 세션 삭제 */
  const logout = useCallback(() => {
    setCurrentAdmin(null)
    localStorage.removeItem('cineos_admin')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }, [])

  /**
   * hasPermission — 현재 관리자가 해당 권한을 가졌는지 확인
   * 미로그인 상태에서는 항상 false
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentAdmin) return false

    return currentAdmin.permissions.includes(permission)
  }, [currentAdmin])

  const isMaster = currentAdmin?.level === false

  return (
    <AuthContext.Provider value={{ currentAdmin, login, logout, hasPermission, isMaster: isMaster }}>
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
