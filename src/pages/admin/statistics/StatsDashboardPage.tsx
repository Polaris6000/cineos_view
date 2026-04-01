/**
 * StatsDashboardPage.jsx — 통계 대시보드 (UC-12~16 진입점)
 *
 * 오늘 매출·티켓수 요약 카드 + 이번 달 누적 + 각 통계 페이지 바로가기
 * TODO: GET /api/admin/stats/summary 연동
 */
import { useNavigate } from 'react-router-dom'
import {
  Banknote, Ticket, TrendingUp, Film,
  CalendarDays, Calendar, BarChart2, Clock, Trophy, LayoutDashboard,
} from 'lucide-react'
import { MOCK_DAILY_STATS, MOCK_MONTHLY_STATS, MOCK_MOVIE_STATS } from '../../../api/mockData'

/** 숫자 포맷 (만 단위) */
const fmtWon = (n) => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

function StatsDashboardPage() {
  const navigate = useNavigate()

  // 오늘 통계 (마지막 항목)
  const todayStat   = MOCK_DAILY_STATS[MOCK_DAILY_STATS.length - 1]
  // 이번 달 통계
  const monthStat   = MOCK_MONTHLY_STATS[MOCK_MONTHLY_STATS.length - 1]
  // Top 1 영화
  const topMovie    = MOCK_MOVIE_STATS[0]

  const summaryCards = [
    { label: '오늘 매출',    value: fmtWon(todayStat.revenue),                    Icon: Banknote,   color: 'var(--color-brand-default)' },
    { label: '오늘 티켓 수', value: `${todayStat.tickets}장`,                     Icon: Ticket,     color: 'var(--color-info-main)' },
    { label: '이번 달 매출', value: fmtWon(monthStat.revenue),                    Icon: TrendingUp, color: 'var(--color-success-main)' },
    { label: '이번 달 티켓', value: `${monthStat.tickets.toLocaleString()}장`,    Icon: Film,       color: 'var(--color-accent-purple)' },
  ]

  const shortcuts = [
    { label: '일일 통계',     path: '/admin/statistics/stats/daily',    Icon: CalendarDays },
    { label: '월별 통계',     path: '/admin/statistics/stats/monthly',  Icon: Calendar },
    { label: '요일별 통계',   path: '/admin/statistics/stats/by-day',   Icon: BarChart2 },
    { label: '시간대별 통계', path: '/admin/statistics/stats/by-hour',  Icon: Clock },
    { label: '영화별 통계',   path: '/admin/statistics/stats/by-movie', Icon: TrendingUp },
  ]

  return (
    <div>
      <h2 style={pageTitle}>통계 대시보드</h2>

      {/* 요약 카드 */}
      <div style={cardGrid}>
        {summaryCards.map(({ label, value, Icon, color }) => (
          <div key={label} style={{ ...summaryCard, borderTop: `3px solid ${color}` }}>
            <Icon size={26} color={color} />
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 박스오피스 Top 1 */}
      {topMovie && (
        <div style={topMovieCard}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trophy size={14} color="var(--color-brand-default)" /> 박스오피스 1위
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>{topMovie.title}</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {topMovie.tickets.toLocaleString()}장 · {fmtWon(topMovie.revenue)}
          </p>
        </div>
      )}

      {/* 통계 바로가기 */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
        상세 통계 바로가기
      </h3>
      <div style={shortcutGrid}>
        {shortcuts.map(({ path, label, Icon }) => (
          <button key={path} onClick={() => navigate(path)} style={shortcutBtn}>
            <Icon size={26} color="var(--text-secondary)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 6 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle   = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const cardGrid    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 16, marginBottom: 24 }
const summaryCard = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 18px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
                      flexDirection: 'column' }
const topMovieCard= { background: 'var(--color-warning-bg)', border: '1px solid var(--color-brand-default)', borderRadius: 12,
                      padding: '16px 20px', marginBottom: 28 }
const shortcutGrid= { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }
const shortcutBtn = { padding: '20px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                      borderRadius: 12, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', cursor: 'pointer', gap: 4,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }

export default StatsDashboardPage
