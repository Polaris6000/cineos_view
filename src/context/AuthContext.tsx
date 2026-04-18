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
import {createContext, useContext, useState, useCallback, type ReactNode,} from 'react'
import {type AdminUser, type Permission, ROLE_PERMISSIONS } from '../types/auth'
import apiClient from '../api/apiClient.ts'

/* ── Context 타입 ───────────────────────────────────── */
interface AuthContextValue {
  currentAdmin:    AdminUser | null
  /** 로그인 시도. 성공 시 true, 실패 시 false 반환. remember=true면 localStorage에 저장 */
  login:           (id: string, password: string, remember?: boolean) => Promise<boolean>
  logout:          () => void
  hasPermission:   (permission: Permission) => boolean
  isMaster: boolean
}

/* ── Context 생성 ───────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null)

/* ── Provider ───────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  // 로그인 상태 복원
  // 우선순위: sessionStorage(탭 세션) → localStorage(자동로그인)
  // sessionStorage에 있으면 현재 탭에서만 유지되는 세션
  // localStorage에 있으면 브라우저 닫아도 유지 (자동로그인 체크 시)
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const fromSession = sessionStorage.getItem('cineos_admin')
      if (fromSession) return JSON.parse(fromSession) as AdminUser
      const fromLocal = localStorage.getItem('cineos_admin')
      if (fromLocal) return JSON.parse(fromLocal) as AdminUser
      return null
    } catch {
      return null
    }
  })

  /**
   * login — 아이디/비밀번호로 인증
   *
   * 동작 흐름:
   *   1. POST /api/admin/login → Spring Security APILoginFilter가 처리
   *   2. 성공 시: { accessToken, refreshToken, level, role } 반환
   *   3. 실패 시: Spring Security가 302 redirect → Axios가 HTML 응답 받음
   *      → accessToken이 undefined → 로그인 실패로 처리
   *
   * @param id       관리자 아이디
   * @param password 비밀번호
   * @param remember true면 localStorage(브라우저 닫아도 유지), false면 sessionStorage(탭 닫으면 삭제)
   */
  const login = useCallback(async (id: string, password: string, remember = false): Promise<boolean> => {
    try {
      const res = await apiClient.post('/admin/login', {
        loginId: id,
        password: password
      });

      const { accessToken, refreshToken, role, permissions, ...rest } = res.data;

      // ──────────────────────────────────────────────────────────────
      // 핵심 방어 코드: accessToken이 없으면 로그인 실패로 처리
      // Spring Security 인증 실패 시 302 redirect → Axios가 HTML 응답을
      // 받아 200으로 처리하기 때문에 try 블록에 들어와도 성공이 아닐 수 있음
      // ──────────────────────────────────────────────────────────────
      if (!accessToken || typeof accessToken !== 'string') {
        console.warn('login: accessToken 없음 — 인증 실패로 처리')
        return false;
      }

      // 토큰 저장 — 항상 localStorage에 저장 (API 호출에 필요)
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      const rawPermissions = permissions || role;
      const authList = Array.isArray(rawPermissions)
          ? rawPermissions
          : (rawPermissions ? [rawPermissions] : []);

      const isMasterUser = authList.includes('ROLE_MASTER');

      const adminInfo: AdminUser = {
        ...rest,
        loginId: id,
        level: !isMasterUser,
        permissions: isMasterUser
            ? (ROLE_PERMISSIONS['MASTER'] as Permission[])
            : (authList as Permission[])
      } as AdminUser;

      console.log('로그인 성공, 주입 데이터:', adminInfo);

      setCurrentAdmin(adminInfo);

      // ──────────────────────────────────────────────────────────────
      // 자동 로그인 여부에 따라 저장소 선택
      //   remember = true  → localStorage  (브라우저 닫아도 유지)
      //   remember = false → sessionStorage (탭 닫으면 삭제)
      // ──────────────────────────────────────────────────────────────
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('cineos_admin', JSON.stringify(adminInfo));

      return true;
    } catch (err) {
      console.error('로그인 에러:', err);
      return false;
    }
  }, []);

  /** logout — 로그아웃 후 저장된 인증 데이터 전부 삭제 */
  const logout = useCallback(() => {
    setCurrentAdmin(null)
    // localStorage (자동로그인) + sessionStorage (일반 세션) 모두 정리
    localStorage.removeItem('cineos_admin')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    sessionStorage.removeItem('cineos_admin')
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
