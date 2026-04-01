/**
 * App.tsx — CineOS 라우터 및 페이지 전환 설정
 *
 * 구조:
 *   BrowserRouter
 *   └── AuthProvider (전역 관리자 인증 Context)
 *       └── KeyboardProvider (전역 터치 키보드)
 *           └── IdleTimerProvider (유휴 타이머)
 *               └── AnimatePresence (페이지 전환 애니메이션)
 *                   └── Routes
 *                       ├── CustomerLayout (고객 영역)
 *                       │   └── 고객 페이지들...
 *                       └── AdminLayout (관리자 영역 — PrivateRoute 로 보호)
 *                           ├── /admin/login          → AdminLoginPage (비보호)
 *                           ├── /admin/forbidden      → ForbiddenPage (비보호)
 *                           └── PrivateRoute          → 관리자 페이지들
 *                               ├── 통계 (statistics 권한 필요)
 *                               ├── 영화/상영관/환불 (각 권한 필요)
 *                               ├── 정책 (policy.view 권한 필요)
 *                               └── 회원/계정 (member.view / account.manage 권한 필요)
 *
 * 권한 체계:
 *   SUPER_ADMIN — 전 페이지 접근
 *   MANAGER     — 통계·정책·회원·계정 페이지 접근 불가 (ForbiddenPage 리다이렉트)
 */
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// 전역 Context
import { AuthProvider } from './context/AuthContext'
import { KeyboardProvider } from './context/KeyboardContext'
import { IdleTimerProvider } from './context/IdleTimerContext'

// 레이아웃 컴포넌트
import CustomerLayout from './components/Layout/CustomerLayout'
import AdminLayout from './components/Layout/AdminLayout'
import PrivateRoute from './components/Auth/PrivateRoute'
import DevNav from './components/DevNav/DevNav'

// 고객 페이지
import HomePage from './pages/movie/HomePage'
import MovieListPage from './pages/movie/MovieListPage'
import MovieDetailPage from './pages/movie/MovieDetailPage'
import SchedulePage from './pages/booking/SchedulePage'
import SeatPage from './pages/booking/SeatPage'
import PaymentPage from './pages/payment/PaymentPage'
import PaymentResultPage from './pages/payment/PaymentResultPage'

// 관리자 — 인증 없이 접근 가능
import AdminLoginPage from './pages/admin/login/AdminLoginPage'
import ForbiddenPage from './pages/admin/ForbiddenPage'

// 관리자 — 로그인 필요 (PrivateRoute 내부)
import StatsDashboardPage from './pages/admin/statistics/StatsDashboardPage'
import StatsDailyPage from './pages/admin/statistics/StatsDailyPage'
import StatsMonthlyPage from './pages/admin/statistics/StatsMonthlyPage'
import StatsByDayPage from './pages/admin/statistics/StatsByDayPage'
import StatsByHourPage from './pages/admin/statistics/StatsByHourPage'
import StatsByMoviePage from './pages/admin/statistics/StatsByMoviePage'
import MovieListAdminPage from './pages/admin/management/MovieListAdminPage'
import MovieFormPage from './pages/admin/management/MovieFormPage'
import MovieManagePage from './pages/admin/management/MovieManagePage'
import TheaterListPage from './pages/admin/management/TheaterListPage'
import TheaterEditPage from './pages/admin/management/TheaterEditPage'
import SeatListPage from './pages/admin/management/SeatListPage'
import SeatEditPage from './pages/admin/management/SeatEditPage'
import PolicyListPage from './pages/admin/management/PolicyListPage'
import PolicyFormPage from './pages/admin/management/PolicyFormPage'
import PolicyManagePage from './pages/admin/management/PolicyManagePage'
import RefundPage from './pages/admin/management/RefundPage'
import MemberListPage from './pages/admin/management/MemberListPage'
import AdminAccountPage from './pages/admin/management/AdminAccountPage'

/**
 * AnimatedRoutes 컴포넌트
 *
 * AnimatePresence 는 자식 컴포넌트가 언마운트될 때도 exit 애니메이션을 실행하게 해줌.
 * useLocation 으로 현재 경로를 key 로 넘겨야 URL이 바뀔 때마다 재렌더링이 트리거됨.
 */
function AnimatedRoutes() {
  const location = useLocation()

  return (
    /* mode="wait": 이전 페이지 exit 끝난 후 다음 페이지 enter 시작 */
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ─── 고객 영역 ─── */}
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="movie/list" element={<MovieListPage />} />
          <Route path="movie/detail/:id" element={<MovieDetailPage />} />
          <Route path="booking/schedule" element={<SchedulePage />} />
          <Route path="booking/seat" element={<SeatPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="payment/result" element={<PaymentResultPage />} />
        </Route>

        {/* ─── 관리자 영역 ─── */}
        <Route path="admin">
          {/* 로그인·접근거부는 인증 없이 접근 가능 */}
          <Route path="login"     element={<AdminLoginPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />

          {/* AdminLayout 내부 — 전부 로그인 필요 */}
          <Route element={<AdminLayout />}>

            {/* 로그인만 확인 (권한 무관 — 모든 MANAGER 접근 가능) */}
            <Route element={<PrivateRoute />}>
              <Route path="refund" element={<RefundPage />} />
              <Route path="management/movie/list"   element={<MovieListAdminPage />} />
              <Route path="management/movie/form"   element={<MovieFormPage />} />
              <Route path="management/movie/manage" element={<MovieManagePage />} />
              <Route path="management/theater/list" element={<TheaterListPage />} />
              <Route path="management/theater/edit" element={<TheaterEditPage />} />
              <Route path="management/seat/list"    element={<SeatListPage />} />
              <Route path="management/seat/edit"    element={<SeatEditPage />} />
            </Route>

            {/* 정책 — policy.view 권한 필요 (SUPER_ADMIN 전용) */}
            <Route element={<PrivateRoute permission="policy.view" />}>
              <Route path="management/policy/list"   element={<PolicyListPage />} />
              <Route path="management/policy/form"   element={<PolicyFormPage />} />
              <Route path="management/policy/manage" element={<PolicyManagePage />} />
            </Route>

            {/* 통계 — statistics 권한 필요 (SUPER_ADMIN 전용) */}
            <Route element={<PrivateRoute permission="statistics" />}>
              <Route path="statistics/dashboard"      element={<StatsDashboardPage />} />
              <Route path="statistics/stats/daily"    element={<StatsDailyPage />} />
              <Route path="statistics/stats/monthly"  element={<StatsMonthlyPage />} />
              <Route path="statistics/stats/by-day"   element={<StatsByDayPage />} />
              <Route path="statistics/stats/by-hour"  element={<StatsByHourPage />} />
              <Route path="statistics/stats/by-movie" element={<StatsByMoviePage />} />
            </Route>

            {/* 회원 정보 관리 — member.view 권한 필요 (SUPER_ADMIN 전용) */}
            <Route element={<PrivateRoute permission="member.view" />}>
              <Route path="management/members" element={<MemberListPage />} />
            </Route>

            {/* 계정/권한 관리 — account.manage 권한 필요 (SUPER_ADMIN 전용) */}
            <Route element={<PrivateRoute permission="account.manage" />}>
              <Route path="management/accounts" element={<AdminAccountPage />} />
            </Route>

          </Route>
        </Route>

      </Routes>
    </AnimatePresence>
  )
}

/**
 * 앱 루트 컴포넌트
 * Context 는 BrowserRouter 안에서 선언해야 useNavigate 등 라우터 훅 사용 가능
 */
function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider: 관리자 로그인 상태 전역 관리 */}
      <AuthProvider>
        {/* KeyboardProvider: 터치 키보드 전역 상태 */}
        <KeyboardProvider>
          {/* IdleTimerProvider: 고객 화면 유휴 감지 → 홈으로 이동 */}
          <IdleTimerProvider>
            <AnimatedRoutes />
            {/* DevNav: 개발 환경에서만 렌더링되는 빠른 이동 패널 */}
            <DevNav />
          </IdleTimerProvider>
        </KeyboardProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
