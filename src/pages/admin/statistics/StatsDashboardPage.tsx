/**
 * StatsDashboardPage.tsx — 통계 대시보드
 *
 * 오늘/이번 달 요약 카드 + 박스오피스 1위 + 상세 통계 바로가기
 *
 * API 호출 (병렬):
 *  1. type=DAY,  startDate=today, endDate=today        → 오늘 통계
 *  2. type=MONTH, startDate=YYYY-01-01, endDate=today  → 이번 달 집계
 *  3. type=MOVIE, startDate=30일전, endDate=today       → 박스오피스 Top1
 */
import type {CSSProperties} from 'react'
import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
    Banknote,
    BarChart2,
    Calendar,
    CalendarDays,
    Clock,
    Film,
    Loader2,
    Ticket,
    TrendingUp,
    Trophy,
} from 'lucide-react'
import type {StatisticsDTO} from '../../../api/statsApi'
import {fetchStatistics} from '../../../api/statsApi'
import {getKSTDateString} from '../../../api/apiClient'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

/** 숫자 포맷 (만 단위 → 억 단위) */
const fmtWon = (n: number) => {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
    if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만원`
    return `${n.toLocaleString()}원`
}

/** 30일 전 날짜 */
function thirtyDaysAgo(): string {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return getKSTDateString(d)
}

/** 올해 1월 1일 */
function firstDayOfYear(): string {
    return `${new Date().getFullYear()}-01-01`
}

function StatsDashboardPage() {
    const navigate = useNavigate()
    const today = getKSTDateString()

    // ── 통계 데이터 상태 ────────────────────────────────────
    const [todayRow, setTodayRow] = useState<StatisticsDTO | null>(null)
    const [monthRow, setMonthRow] = useState<StatisticsDTO | null>(null)
    const [topMovie, setTopMovie] = useState<StatisticsDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true)
            setError(null)

            try {
                // 3개 API를 병렬 호출 (Promise.all — 한 번에 요청해서 속도 최적화)
                const [dayData, monthData, movieData] = await Promise.all([
                    // 1. 오늘 일별 데이터
                    fetchStatistics(today, today, 'DAY'),
                    // 2. 이번 달(올해 1월 1일~오늘) 월별 집계
                    //    MONTH 타입은 GROUP BY 월이라 오늘이 속한 월 항목만 필요
                    fetchStatistics(firstDayOfYear(), today, 'MONTH'),
                    // 3. 최근 30일 영화별 → 매출 1위 추출
                    fetchStatistics(thirtyDaysAgo(), today, 'MOVIE'),
                ])

                // 오늘 통계: dayData는 보통 1개 항목 (데이터 없으면 빈 배열)
                setTodayRow(dayData[0] ?? null)

                // 이번 달 통계: date가 이번 달 1일('YYYY-MM-01')인 항목 찾기
                const thisMonthPrefix = today.slice(0, 7) // 'YYYY-MM'
                const thisMonthEntry = monthData.find(
                    (m) => m.date?.startsWith(thisMonthPrefix) ?? false,
                )
                setMonthRow(thisMonthEntry ?? null)

                // 박스오피스 1위: 매출 내림차순 정렬 후 첫 번째
                movieData.sort((a, b) => b.revenue - a.revenue)
                setTopMovie(movieData[0] ?? null)
            } catch (e) {
                console.error('[StatsDashboard] API 오류', e)
                setError('통계 데이터를 불러오는 데 실패했습니다.')
            } finally {
                setLoading(false)
            }
        }

        void loadAll()
    }, [today])

    // ── 요약 카드 데이터 ────────────────────────────────────
    const summaryCards = [
        {
            label: '오늘 매출',
            value: todayRow ? fmtWon(todayRow.revenue) : '-',
            Icon: Banknote,
            color: 'var(--color-brand-default)',
        },
        {
            label: '오늘 관람객',
            value: todayRow ? `${todayRow.customerCount.toLocaleString()}명` : '-',
            Icon: Ticket,
            color: 'var(--color-info-main)',
        },
        {
            label: '이번 달 매출',
            value: monthRow ? fmtWon(monthRow.revenue) : '-',
            Icon: TrendingUp,
            color: 'var(--color-success-main)',
        },
        {
            label: '이번 달 관람객',
            value: monthRow ? `${monthRow.customerCount.toLocaleString()}명` : '-',
            Icon: Film,
            color: 'var(--color-accent-purple)',
        },
    ]

    const shortcuts = [
        {label: '일일 통계', path: '/admin/statistics/stats/daily', Icon: CalendarDays},
        {label: '월별 통계', path: '/admin/statistics/stats/monthly', Icon: Calendar},
        {label: '요일별 통계', path: '/admin/statistics/stats/by-day', Icon: BarChart2},
        {label: '시간대별 통계', path: '/admin/statistics/stats/by-hour', Icon: Clock},
        {label: '영화별 통계', path: '/admin/statistics/stats/by-movie', Icon: TrendingUp},
    ]

    return (
        <div>
            {/* 통계 탭 내비게이션 */}
            <StatsTabNav/>

            <h2 style={pageTitle}>통계 대시보드</h2>

            {/* 로딩 */}
            {loading && (
                <div style={centerBox}>
                    <Loader2 size={28} style={{animation: 'spin 1s linear infinite'}}
                             color="var(--color-brand-default)"/>
                    <span style={{marginLeft: 10, color: 'var(--text-secondary)'}}>통계 로딩 중…</span>
                </div>
            )}

            {/* 에러 */}
            {!loading && error && (
                <div style={errorBox}>{error}</div>
            )}

            {/* 정상 데이터 */}
            {!loading && !error && (
                <>
                    {/* 요약 카드 */}
                    <div style={cardGrid}>
                        {summaryCards.map(({label, value, Icon, color}) => (
                            <div key={label} style={{...summaryCard, borderTop: `3px solid ${color}`}}>
                                <Icon size={26} color={color}/>
                                <div style={{marginTop: 8}}>
                                    <p style={{fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px'}}>
                                        {label}
                                    </p>
                                    <p style={{fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0}}>
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 박스오피스 Top 1 */}
                    {topMovie && (
                        <div style={topMovieCard}>
                            <p style={{
                                fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <Trophy size={14} color="var(--color-brand-default)"/>
                                박스오피스 1위 (최근 30일)
                            </p>
                            <p style={{fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px'}}>
                                {topMovie.title}
                            </p>
                            <p style={{fontSize: 14, color: 'var(--text-muted)', margin: 0}}>
                                {topMovie.customerCount.toLocaleString()}명 / {fmtWon(topMovie.revenue)}
                            </p>
                        </div>
                    )}
                    {!topMovie && (
                        <p style={{color: 'var(--text-muted)', fontSize: 13, marginBottom: 20}}>
                            최근 30일 영화별 통계 데이터가 없습니다.
                        </p>
                    )}

                    {/* 통계 상세 바로가기 */}
                    <h3 style={{fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12}}>
                        상세 통계 바로가기
                    </h3>
                    <div style={shortcutGrid}>
                        {shortcuts.map(({path, label, Icon}) => (
                            <button key={path} onClick={() => navigate(path)} style={shortcutBtn}>
                                <Icon size={26} color="var(--text-secondary)"/>
                                <span
                                    style={{fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 6}}>
                  {label}
                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

/* ── 스타일 ── */
const pageTitle: CSSProperties = {fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24}
const centerBox: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0'}
const errorBox: CSSProperties = {
    padding: '16px 20px', background: 'var(--color-error-bg)',
    border: '1px solid var(--color-error-main)', borderRadius: 10,
    color: 'var(--color-error-main)', fontSize: 14, marginBottom: 16
}
const cardGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16, marginBottom: 24
}
const summaryCard: CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column'
}
const topMovieCard: CSSProperties = {
    background: 'var(--color-warning-bg)',
    border: '1px solid var(--color-brand-default)',
    borderRadius: 12, padding: '16px 20px', marginBottom: 28
}
const shortcutGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12
}
const shortcutBtn: CSSProperties = {
    padding: '20px 12px', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', gap: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}

export default StatsDashboardPage
