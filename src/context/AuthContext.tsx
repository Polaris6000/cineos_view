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
  /** 로그아웃. 백엔드 UUID 정리 후 클라이언트 인증 데이터 삭제 */
  logout:          () => Promise<void>
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

      // ──────────────────────────────────────────────────────────────
      // 자동 로그인 체크 시 백엔드에 UUID 쿠키 발급 요청
      //
      // 흐름:
      //   POST /api/admin/remember_me?loginId={id}
      //   → 백엔드: DB에 UUID 생성·저장 후 remember-me 쿠키 Set-Cookie
      //   → 이후 accessToken + refreshToken 모두 만료됐을 때
      //     POST /api/admin/remember_me/auth (쿠키 자동 첨부)
      //     → UUID 검증 → 새 accessToken 발급 (apiClient 인터셉터가 처리)
      //
      // withCredentials: true — 크로스 오리진 환경에서도 쿠키를 주고받기 위해 필요
      //   Vite dev proxy(/api → localhost:8080) 경유 시에도 쿠키 전달 보장
      // ──────────────────────────────────────────────────────────────
      if (remember) {
        try {
          await apiClient.post(
            `/admin/remember_me?loginId=${encodeURIComponent(id)}`,
            {},
            { withCredentials: true }
          );
          console.log('[자동로그인] UUID 쿠키 발급 완료');
        } catch (rememberErr) {
          // UUID 쿠키 발급 실패해도 로그인 자체는 성공 처리
          // (accessToken + refreshToken만으로도 동작하므로 치명적이지 않음)
          console.warn('[자동로그인] UUID 쿠키 발급 실패 (로그인은 유지):', rememberErr);
        }
      }

      return true;
    } catch (err) {
      console.error('로그인 에러:', err);
      return false;
    }
  }, []);

  /**
   * logout — 백엔드 로그아웃 API 호출 후 클라이언트 인증 데이터 전부 삭제
   *
   * 백엔드가 처리하는 것:
   *   - 자동로그인용 UUID 쿠키 제거 (Set-Cookie: uuid=; Max-Age=0)
   *   - DB에 저장된 UUID를 null로 초기화
   *
   * 클라이언트가 처리하는 것:
   *   - localStorage / sessionStorage 의 인증 정보 삭제
   *   - currentAdmin 상태 null로 초기화
   *
   * ※ API 실패해도 클라이언트 정리는 반드시 수행 (finally)
   */
  const logout = useCallback(async () => {
    try {
      // 백엔드 로그아웃: DB UUID null 처리 + remember-me 쿠키 만료
      //
      // 백엔드 시그니처: logout(String loginId, ...)
      //   → @RequestParam 어노테이션 없이 선언된 String 파라미터
      //   → Spring MVC가 쿼리 파라미터로 자동 바인딩함
      //   → loginId가 null이면 adminRepository.findByLoginId(null).orElseThrow() 예외 발생
      //   → catch에서 처리하고 finally에서 클라이언트 정리는 반드시 수행
      //
      // withCredentials: true — Set-Cookie: remember-me 쿠키를 함께 전송해야
      //   서버에서 Max-Age=0 으로 만료 처리 가능
      //   ※ 현재 백엔드가 cookie.setSecure(true) → HTTP 로컬 환경에서는 쿠키 자체가
      //     브라우저에 저장되지 않으므로 UUID 쿠키 기반 자동로그인은 HTTPS 전환 전까지 비활성
      const loginId = currentAdmin?.loginId ?? '';
      const url = loginId
        ? `/admin/logout?loginId=${encodeURIComponent(loginId)}`
        : '/admin/logout';
      await apiClient.post(url, {}, { withCredentials: true });
    } catch (err) {
      // 네트워크 오류 등 실패해도 클라이언트 정리는 계속 진행
      console.warn('[logout] 백엔드 로그아웃 API 실패 (클라이언트 정리는 계속):', err)
    } finally {
      setCurrentAdmin(null)
      // localStorage (자동로그인) + sessionStorage (일반 세션) 모두 정리
      localStorage.removeItem('cineos_admin')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('cineos_admin')
    }
  }, [currentAdmin])  // currentAdmin 의존성 추가 — loginId를 참조하므로 stale closure 방지

  /**
   * hasPermission — \ud2b9\uc815 \uad8c\ud55c \ubcf4\uc720 \uc5ec\ubd80 \ud655\uc778
   * currentAdmin\uc774 null\uc774\uba74 \ud56d\uc0c1 false
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentAdmin) return false
    return currentAdmin.permissions.includes(permission)
  }, [currentAdmin])

  const isMaster = currentAdmin?.level === false

  return (
    <AuthContext.Provider value={{ currentAdmin, login, logout, hasPermission, isMaster }}>
      {children}
    </AuthContext.Provider>
  )
}

/* \u2500\u2500 useAuth \ud6c4\ud06c \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/**
 * useAuth \u2014 AuthContext \uac12\uc744 \uc27d\uac8c \uac00\uc838\uc624\ub294 \ud6c4\ud06c
 * AuthProvider \ub0b4\ubd80\uc5d0\uc11c\ub9cc \uc0ac\uc6a9 \uac00\ub2a5 (\uc678\ubd80\uc5d0\uc11c \ud638\ucd9c \uc2dc throw)
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth\ub294 AuthProvider \ub0b4\ubd80\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4')
  return ctx
}
