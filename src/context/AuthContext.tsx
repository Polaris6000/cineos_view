import {createContext, type ReactNode, useCallback, useContext, useEffect, useState} from 'react'
import {type AdminUser, type Permission, ROLE_PERMISSIONS} from '../types/auth'
import apiClient, {getAccessToken, setAccessToken} from '../api/apiClient.ts'

interface AuthContextValue {
    currentAdmin: AdminUser | null
    login: (id: string, password: string, remember?: boolean) => Promise<boolean>
    logout: () => Promise<void>
    hasPermission: (permission: Permission) => boolean
    isMaster: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({children}: { children: ReactNode }) {

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

    const [isReady, setIsReady] = useState(false)
    // ── 브라우저 재접속시 RefreshToken 쿠키로 AccessToken 재발급 ──
    // 메모리에 저장된 AccessToken은 새로고침/재접속시 사라지기 때문에
    // 저장된 사용자 정보가 있으면 RefreshToken 쿠키로 재발급 시도
    useEffect(() => {
        const savedAdmin =
            localStorage.getItem('cineos_admin') ||
            sessionStorage.getItem('cineos_admin')

        if (savedAdmin) {
            apiClient.post('/admin/refresh', {accessToken: getAccessToken()})
                .then(res => {
                    setAccessToken(res.data.accessToken)
                    console.log('[재접속] AccessToken 재발급 성공')
                })
                .catch(() => {
                    // RefreshToken 만료 → 저장된 정보 삭제 후 로그인 필요
                    localStorage.removeItem('cineos_admin')
                    sessionStorage.removeItem('cineos_admin')
                    setCurrentAdmin(null)
                    console.log('[재접속] RefreshToken 만료 → 로그인 필요')
                })
                .finally(() => {
                    setIsReady(true) // 재발급 완료 후 렌더링 허용
                })
        } else {
            setIsReady(true) // 저장된 정보 없으면 바로 렌더링
        }
    }, [])

    const login = useCallback(async (id: string, password: string, remember = false): Promise<boolean> => {
        try {
            const res = await apiClient.post('/admin/login', {
                loginId: id,
                password: password,
                autoLogin: remember // 자동로그인 여부 전송 → 백엔드에서 RefreshToken 기간 분기
            });

            const {accessToken, role, permissions, ...rest} = res.data;
            // refreshToken은 HttpOnly 쿠키로 자동 저장되므로 여기서 처리 불필요

            if (!accessToken || typeof accessToken !== 'string') {
                console.warn('login: accessToken 없음 — 인증 실패로 처리')
                return false;
            }

            // AccessToken은 메모리에 저장 (localStorage X)
            setAccessToken(accessToken)

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

            console.log('로그인 성공:', adminInfo);
            setCurrentAdmin(adminInfo);

            // 사용자 정보만 저장 (토큰은 저장 안함)
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem('cineos_admin', JSON.stringify(adminInfo));

            return true;
        } catch (err) {
            console.error('로그인 에러:', err);
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const loginId = currentAdmin?.loginId ?? '';
            const url = loginId
                ? `/admin/logout?loginId=${encodeURIComponent(loginId)}`
                : '/admin/logout';
            await apiClient.post(url, {});
        } catch (err) {
            console.warn('[logout] 백엔드 로그아웃 API 실패:', err)
        } finally {
            setAccessToken(null) // 메모리 토큰 초기화
            setCurrentAdmin(null)
            localStorage.removeItem('cineos_admin')
            sessionStorage.removeItem('cineos_admin')
        }
    }, [currentAdmin])

    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!currentAdmin) return false
        return currentAdmin.permissions.includes(permission)
    }, [currentAdmin])

    const isMaster = currentAdmin?.level === false

    if (!isReady) return null

    return (
        <AuthContext.Provider value={{currentAdmin, login, logout, hasPermission, isMaster}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다')
    return ctx
}
