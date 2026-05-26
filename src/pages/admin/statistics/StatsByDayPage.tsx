/**
 * StatsByDayPage.tsx — 요일별 통계
 *
 * API: GET /api/admin/statistics?startDate=&endDate=&type=DAY
 * 응답: { date, day(SUNDAY~SATURDAY), revenue, customerCount }[]
 *
 * 전략:
 *  - DAY 타입으로 날짜별 데이터를 가져온 후,
 *    클라이언트에서 day 필드(영문 요일)로 그룹핑 → 요일별 평균 집계
 *  - 기본 조회 범위: 최근 30일
 *  - 사용자가 직접 날짜 범위 변경 가능
 */
import type {CSSProperties} from 'react'
import {useCallback, useEffect, useState} from 'react'
import {Loader2} from 'lucide-react'
import type {DayOfWeek, StatisticsDTO} from '../../../api/statsApi'
import {DAY_KR, DAY_ORDER, fetchStatistics} from '../../../api/statsApi'
import {getKSTDateString} from '../../../api/apiClient'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

// 일=빨, 월~목=파, 금=보라, 토=골드
const DAY_COLORS: Record<DayOfWeek, string> = {
    SUNDAY: 'var(--color-error-main)',
    MONDAY: 'var(--color-info-main)',
    TUESDAY: 'var(--color-info-main)',
    WEDNESDAY: 'var(--color-info-main)',
    THURSDAY: 'var(--color-info-main)',
    FRIDAY: 'var(--color-accent-purple)',
    SATURDAY: 'var(--color-brand-default)',
}

/** 30일 전 날짜 */
function thirtyDaysAgo(): string {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return getKSTDateString(d)
}

/** 요일별 평균 집계 결과 타입 */
interface DayAvg {
    dayKey: DayOfWeek
    labelKr: string   // '일', '월', ...
    avgRevenue: number
    avgTickets: number
    count: number     // 해당 요일이 범위 내 몇 번 등장했는지
}

function StatsByDayPage() {
    const today = getKSTDateString()

    // ── 날짜 범위 상태 ────────────────────────────────────
    const [from, setFrom] = useState(thirtyDaysAgo)
    const [to, setTo] = useState(today)

    // ── 데이터 상태 ────────────────────────────────────────
    const [dayAvgs, setDayAvgs] = useState<DayAvg[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const data: StatisticsDTO[] = await fetchStatistics(from, to, 'DAY')

            // 요일별로 집계 (SUNDAY~SATURDAY 각각의 합계/건수 계산)
            const map = new Map<DayOfWeek, { revSum: number; ticketSum: number; count: number }>()

            data.forEach((row) => {
                if (!row.day) return // day 필드가 없으면 스킵
                const cur = map.get(row.day) ?? {revSum: 0, ticketSum: 0, count: 0}
                map.set(row.day, {
                    revSum: cur.revSum + row.revenue,
                    ticketSum: cur.ticketSum + row.customerCount,
                    count: cur.count + 1,
                })
            })

            // DAY_ORDER(일~토) 순서로 변환 — 데이터 없는 요일은 0으로 채움
            const avgs: DayAvg[] = DAY_ORDER.map((dayKey) => {
                const agg = map.get(dayKey)
                return {
                    dayKey,
                    labelKr: DAY_KR[dayKey],
                    avgRevenue: agg ? Math.floor(agg.revSum / agg.count) : 0,
                    avgTickets: agg ? Math.floor(agg.ticketSum / agg.count) : 0,
                    count: agg?.count ?? 0,
                }
            })

            setDayAvgs(avgs)
        } catch (e) {
            console.error('[StatsByDayPage] API 오류', e)
            setError('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setLoading(false)
        }
    }, [from, to])

    useEffect(() => {
        void load()
    }, [load])

    // ── 파생 계산값 ────────────────────────────────────────
    const maxRevenue = Math.max(...dayAvgs.map((d) => d.avgRevenue), 1)

    return (
        <div>
            <StatsTabNav/>
            <h2 style={pageTitle}>요일별 통계</h2>

            {/* 날짜 범위 선택 */}
            <div style={rangeRow}>
                <input
                    type="date" value={from} max={to}
                    onChange={(e) => setFrom(e.target.value)}
                    style={dateInput}
                />
                <span style={{color: 'var(--text-secondary)'}}>~</span>
                <input
                    type="date" value={to} max={today}
                    onChange={(e) => setTo(e.target.value)}
                    style={dateInput}
                />
                <span style={{fontSize: 12, color: 'var(--text-muted)', marginLeft: 8}}>
          기간 내 요일별 평균 값
        </span>
            </div>

            {/* 로딩 */}
            {loading && (
                <div style={centerBox}>
                    <Loader2 size={28} style={{animation: 'spin 1s linear infinite'}}
                             color="var(--color-brand-default)"/>
                    <span style={{marginLeft: 10, color: 'var(--text-secondary)'}}>데이터 로딩 중…</span>
                </div>
            )}

            {/* 에러 */}
            {!loading && error && (
                <div style={errorBox}>{error}</div>
            )}

            {/* 정상 데이터 */}
            {!loading && !error && (
                <>
                    {/* 세로 바 차트 */}
                    <div style={chartCard}>
                        <p style={chartLabel}>요일별 평균 매출</p>
                        <div style={{display: 'flex', gap: 12, alignItems: 'flex-end', height: 160}}>
                            {dayAvgs.map((d) => {
                                const color = DAY_COLORS[d.dayKey]
                                return (
                                    <div
                                        key={d.dayKey}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 8
                                        }}
                                    >
                    <span style={{fontSize: 11, color: 'var(--text-secondary)'}}>
                      {d.avgRevenue > 0 ? `${(d.avgRevenue / 10000).toFixed(0)}만` : '-'}
                    </span>
                                        <div
                                            style={{
                                                width: '100%',
                                                borderRadius: '4px 4px 0 0',
                                                background: color,
                                                height: `${Math.max((d.avgRevenue / maxRevenue) * 120, d.avgRevenue > 0 ? 4 : 2)}px`,
                                                opacity: d.count === 0 ? 0.2 : 1,
                                            }}
                                            title={`${d.labelKr}요일 평균: ${d.avgRevenue.toLocaleString()}원`}
                                        />
                                        <span style={{fontSize: 14, fontWeight: 700, color}}>{d.labelKr}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div style={tableWrap}>
                        <table style={table}>
                            <thead>
                            <tr style={thead}>
                                <th style={th}>요일</th>
                                <th style={th}>평균 관람객</th>
                                <th style={th}>평균 매출</th>
                                <th style={th}>최고 대비</th>
                            </tr>
                            </thead>
                            <tbody>
                            {dayAvgs.map((d) => {
                                const pct = Math.round((d.avgRevenue / maxRevenue) * 100)
                                const color = DAY_COLORS[d.dayKey]
                                return (
                                    <tr key={d.dayKey} style={tr}>
                                        <td style={{...td, fontWeight: 700, color}}>{d.labelKr}요일</td>
                                        <td style={td}>
                                            {d.count > 0 ? `${d.avgTickets.toLocaleString()}명` : '-'}
                                        </td>
                                        <td style={td}>
                                            {d.count > 0 ? `${d.avgRevenue.toLocaleString()}원` : '-'}
                                        </td>
                                        <td style={td}>
                                            {d.count > 0 ? (
                                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                                    <div style={{
                                                        flex: 1,
                                                        height: 8,
                                                        background: 'var(--bg-base)',
                                                        borderRadius: 4
                                                    }}>
                                                        <div
                                                            style={{
                                                                width: `${pct}%`,
                                                                height: '100%',
                                                                background: color,
                                                                borderRadius: 4
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{
                                                        fontSize: 12,
                                                        color: 'var(--text-secondary)',
                                                        minWidth: 34
                                                    }}>
                              {pct}%
                            </span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

/* ── 스타일 ── */
const pageTitle: CSSProperties = {fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8}
const rangeRow: CSSProperties = {display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap'}
const dateInput: CSSProperties = {
    padding: '8px 12px', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 14, color: 'var(--text-primary)',
    background: 'var(--input-bg)'
}
const centerBox: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0'}
const errorBox: CSSProperties = {
    padding: '16px 20px', background: 'var(--color-error-bg)',
    border: '1px solid var(--color-error-main)', borderRadius: 10,
    color: 'var(--color-error-main)', fontSize: 14, marginBottom: 16
}
const chartCard: CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12,
    padding: '20px 24px', marginBottom: 20
}
const chartLabel: CSSProperties = {fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px'}
const tableWrap: CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
}
const table: CSSProperties = {width: '100%', borderCollapse: 'collapse'}
const thead: CSSProperties = {background: 'var(--bg-base)'}
const th: CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: 13,
    fontWeight: 600, color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-default)'
}
const tr: CSSProperties = {borderBottom: '1px solid var(--border-subtle)'}
const td: CSSProperties = {padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)'}

export default StatsByDayPage
