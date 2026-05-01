/**
 * StatsTabNav.tsx — 통계 페이지 공통 상단 탭 내비게이션
 *
 * 모든 통계 페이지 상단에 표시되는 공통 탭 바.
 * 현재 경로에 해당하는 탭을 활성화(active) 스타일로 표시.
 *
 * 포함 탭:
 *  - 대시보드
 *  - 일일 통계
 *  - 월별 통계
 *  - 요일별 통계
 *  - 시간대별 통계
 *  - 영화별 통계
 */
import {NavLink} from 'react-router-dom'
import {BarChart2, Calendar, CalendarDays, Clock, LayoutDashboard, TrendingUp,} from 'lucide-react'

/** 탭 아이템 목록 */
const STATS_TABS = [
    {path: '/admin/statistics/dashboard', label: '대시보드', Icon: LayoutDashboard},
    {path: '/admin/statistics/stats/daily', label: '일일 통계', Icon: CalendarDays},
    {path: '/admin/statistics/stats/monthly', label: '월별 통계', Icon: Calendar},
    {path: '/admin/statistics/stats/by-day', label: '요일별 통계', Icon: BarChart2},
    {path: '/admin/statistics/stats/by-hour', label: '시간대별 통계', Icon: Clock},
    {path: '/admin/statistics/stats/by-movie', label: '영화별 통계', Icon: TrendingUp},
]

function StatsTabNav() {
    return (
        <nav style={navWrap}>
            {STATS_TABS.map(({path, label, Icon}) => (
                <NavLink
                    key={path}
                    to={path}
                    end
                    style={({isActive}) => ({
                        ...tabItem,
                        ...(isActive ? tabItemActive : {}),
                    })}
                >
                    {/* 아이콘 */}
                    <Icon size={14} style={{flexShrink: 0}}/>
                    {label}
                </NavLink>
            ))}
        </nav>
    )
}

/* ── 스타일 ── */
const navWrap: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    padding: '8px 0',
    marginBottom: 24,
    borderBottom: '1px solid var(--border-default)',
}

const tabItem: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: '8px 8px 0 0',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    background: 'transparent',
    border: '1px solid transparent',
    borderBottom: 'none',
    transition: 'all 0.15s',
    cursor: 'pointer',
    marginBottom: -1, // border-bottom 겹침 처리
}

const tabItemActive: React.CSSProperties = {
    color: 'var(--color-brand-default)',
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
    borderBottomColor: 'var(--bg-surface)', // 활성 탭 아래 테두리 숨김
}

export default StatsTabNav
