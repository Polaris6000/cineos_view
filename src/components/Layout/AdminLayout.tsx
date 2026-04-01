/**
 * AdminLayout.tsx — 관리자 영역 공통 레이아웃
 *
 * - 좌측 사이드바 (240px) — 권한 없는 메뉴는 자동으로 숨겨짐
 * - 상단 헤더 (로그인 사용자 정보 + 역할 뱃지 + 로그아웃)
 * - 메인 콘텐츠 영역 (Outlet)
 * - data-theme="light"/"dark" 를 body 에 붙여 라이트/다크 테마 CSS 변수 적용
 *
 * 권한 체계:
 *   SUPER_ADMIN — 사이드바 전 메뉴 노출
 *   MANAGER     — 통계/정책/회원/계정 메뉴 숨김
 */
import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Film, PlaySquare, Armchair, ScrollText, RotateCcw,
  LayoutDashboard, CalendarDays, Calendar, BarChart2, Clock, TrendingUp,
  Sun, Moon, Users, ShieldCheck,
} from 'lucide-react'
import { adminPageVariants, adminPageTransition } from '../../styles/transitions'
import { useAuth } from '../../context/AuthContext'
import type { Permission } from '../../types/auth'
import styles from './AdminLayout.module.css'

/**
 * 사이드바 네비게이션 메뉴 구성
 *
 * permission 필드: 해당 링크를 표시하기 위해 필요한 권한 (없으면 로그인만 하면 됨)
 */
interface NavItem {
  path: string
  label: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  /** 이 항목을 표시하기 위해 필요한 최소 권한 */
  permission?: Permission
}

interface NavSection {
  section: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    section: '영화 관리',
    items: [
      { path: '/admin/management/movie/list',   label: '영화 목록', Icon: Film,        permission: 'movie.view' },
      { path: '/admin/management/movie/form',   label: '영화 등록', Icon: Film,        permission: 'movie.create' },
      { path: '/admin/management/movie/manage', label: '상영 관리', Icon: PlaySquare,  permission: 'movie.edit' },
    ],
  },
  {
    section: '상영관/좌석',
    items: [
      { path: '/admin/management/theater/list', label: '상영관 목록',    Icon: Armchair, permission: 'theater.view' },
      { path: '/admin/management/seat/list',    label: '좌석 목록',      Icon: Armchair, permission: 'theater.view' },
      { path: '/admin/management/seat/edit',    label: '좌석 정책 수정', Icon: Armchair, permission: 'theater.edit' },
    ],
  },
  {
    section: '정책/환불',
    items: [
      { path: '/admin/management/policy/list', label: '정책 목록', Icon: ScrollText, permission: 'policy.view' },
      { path: '/admin/refund',                 label: '환불 처리', Icon: RotateCcw,  permission: 'refund' },
    ],
  },
  {
    // 통계 섹션 — SUPER_ADMIN 전용
    section: '통계',
    items: [
      { path: '/admin/statistics/dashboard',      label: '대시보드',      Icon: LayoutDashboard, permission: 'statistics' },
      { path: '/admin/statistics/stats/daily',    label: '일일 통계',     Icon: CalendarDays,    permission: 'statistics' },
      { path: '/admin/statistics/stats/monthly',  label: '월별 통계',     Icon: Calendar,        permission: 'statistics' },
      { path: '/admin/statistics/stats/by-day',   label: '요일별 통계',   Icon: BarChart2,       permission: 'statistics' },
      { path: '/admin/statistics/stats/by-hour',  label: '시간대별 통계', Icon: Clock,           permission: 'statistics' },
      { path: '/admin/statistics/stats/by-movie', label: '영화별 통계',   Icon: TrendingUp,      permission: 'statistics' },
    ],
  },
  {
    // 회원·계정 관리 — SUPER_ADMIN 전용
    section: '회원/계정 관리',
    items: [
      { path: '/admin/management/members',  label: '회원 정보 관리', Icon: Users,       permission: 'member.view' },
      { path: '/admin/management/accounts', label: '계정 및 권한',   Icon: ShieldCheck, permission: 'account.manage' },
    ],
  },
]

function AdminLayout() {
  const navigate = useNavigate()
  const { currentAdmin, logout, hasPermission } = useAuth()

  // 다크모드 상태 — localStorage에서 복원 (기본값: 라이트)
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('adminTheme') === 'dark'
  )

  // isDark 변경 시 body의 data-theme 속성 교체
  useEffect(() => {
    if (isDark) {
      // 다크: data-theme 제거 → :root 기본값(다크 웜) 사용
      delete document.body.dataset.theme
    } else {
      // 라이트: data-theme="light" 오버라이드 적용
      document.body.dataset.theme = 'light'
    }
    localStorage.setItem('adminTheme', isDark ? 'dark' : 'light')

    return () => {
      // 관리자 페이지 벗어날 때 다크 테마로 복원
      delete document.body.dataset.theme
    }
  }, [isDark])

  // 로그아웃 처리 — AuthContext.logout() 으로 세션 삭제 후 로그인 페이지로
  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  /**
   * 네비게이션 섹션 필터링
   * - 섹션 내 아이템 중 현재 사용자가 권한을 가진 것만 남김
   * - 아이템이 하나도 없는 섹션은 통째로 숨김
   */
  const visibleSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter(
      // permission 없으면 항상 표시, 있으면 hasPermission() 으로 확인
      (item) => !item.permission || hasPermission(item.permission)
    ),
  })).filter((sec) => sec.items.length > 0)

  // 역할 뱃지 스타일
  const roleBadgeText  = currentAdmin?.role === 'SUPER_ADMIN' ? '최고관리자' : '일반관리자'
  const roleBadgeColor = currentAdmin?.role === 'SUPER_ADMIN' ? '#ffb800' : '#82b0ff'
  const roleBadgeBg    = currentAdmin?.role === 'SUPER_ADMIN'
    ? 'rgba(255,184,0,0.15)' : 'rgba(130,176,255,0.15)'

  return (
    <div className={styles.layout}>

      {/* ── 좌측 사이드바 ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <img src="/logo_cineos.svg" alt="CineOS" className={styles.logo} />
          <span className={styles.adminBadge}>관리자</span>
        </div>

        {/* 현재 로그인 사용자 정보 */}
        {currentAdmin && (
          <div style={{
            padding: '10px 16px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 4,
          }}>
            {/* 역할 뱃지 */}
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              color: roleBadgeColor,
              background: roleBadgeBg,
              marginBottom: 5,
            }}>
              {roleBadgeText}
            </span>
            {/* 표시 이름 */}
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1px' }}>
              {currentAdmin.name}
            </p>
            {/* 아이디 */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              @{currentAdmin.id}
            </p>
          </div>
        )}

        {/* 섹션별 네비게이션 — 권한 없는 섹션/항목은 렌더링되지 않음 */}
        <nav className={styles.nav}>
          {visibleSections.map((section) => (
            <div key={section.section} className={styles.navSection}>
              <p className={styles.navSectionTitle}>{section.section}</p>

              {section.items.map(({ path, label, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                >
                  {/* Lucide 아이콘 + 라벨 */}
                  {Icon && <Icon size={15} style={{ flexShrink: 0 }} />}
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── 우측 메인 영역 ── */}
      <div className={styles.content}>

        {/* 상단 헤더 */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>관리자 페이지</h1>
          <div className={styles.headerActions}>
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={() => setIsDark((d) => !d)}
              className={styles.themeBtn}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              로그아웃
            </button>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className={styles.main}>
          {/*
            motion.div: 관리자 페이지 전환 애니메이션 (고객 영역보다 subtle하게)
          */}
          <motion.div
            className={styles.pageWrapper}
            variants={adminPageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={adminPageTransition}
          >
            <Outlet />
          </motion.div>
        </main>

      </div>
    </div>
  )
}

export default AdminLayout
