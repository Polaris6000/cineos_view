/**
 * PrivateRoute.tsx — 권한 기반 라우트 보호 컴포넌트
 *
 * 동작:
 *   1. 미로그인 → /admin/login 으로 리다이렉트
 *   2. 로그인했지만 필요한 권한 없음 → /admin/forbidden 으로 리다이렉트
 *   3. 권한 있음 → 자식 라우트(Outlet) 렌더링
 *
 * 사용 예시:
 *   <Route element={<PrivateRoute />}>              ← 로그인만 필요
 *   <Route element={<PrivateRoute permission="statistics" />}>  ← 통계 권한 필요
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Permission } from '../../types/auth'

interface PrivateRouteProps {
  /** 이 라우트 진입에 필요한 특정 권한 (없으면 로그인 여부만 확인) */
  permission?: Permission
}

function PrivateRoute({ permission }: PrivateRouteProps) {
  const { currentAdmin, hasPermission } = useAuth()
  const location = useLocation()

  // 1. 미로그인 → 로그인 페이지로 (현재 경로를 state로 전달해 로그인 후 돌아올 수 있게)
  if (!currentAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // 2. 권한 부족 → 접근 거부 페이지로
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/admin/forbidden" replace />
  }

  // 3. 통과 → 자식 라우트 렌더링
  return <Outlet />
}

export default PrivateRoute
