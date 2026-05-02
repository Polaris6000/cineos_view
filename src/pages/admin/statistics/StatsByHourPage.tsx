/**
 * StatsByHourPage.tsx — 시간대별 통계
 *
 * API: GET /api/admin/statistics?startDate=&endDate=&type=HOUR
 * 응답: { title("HH시"), revenue, customerCount }[]  — date=null
 *
 * 기능:
 *  - 날짜 범위 선택 (기본: 최근 30일)
 *  - 시간대별 가로 바 차트 + 테이블
 *  - 피크 시간대 강조 표시
 */
import type {CSSProperties} from 'react'
import {useCallback, useEffect, useState} from 'react'
import {Loader2} from 'lucide-react'
import type {StatisticsDTO} from '../../../api/statsApi'
import {fetchStatistics} from '../../../api/statsApi'
import {getKSTDateString} from '../../../api/apiClient'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

function thirtyDaysAgo(): string {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return getKSTDateString(d)
}

function StatsByHourPage() {
    const today = getKSTDateString()

    // ── 날짜 범위 상태 ────────────────────────────────────
    const [from, setFrom] = useState(thirtyDaysAgo)
    const [to, setTo] = useState(today)

    // ── 데이터 상태 ────────────────────────────────────────
    const [rows, setRows] = useState<StatisticsDTO[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const data = await fetchStatistics(from, to, 'HOUR')
            // title = "HH시" 형식 — 오름차순 정렬 (백엔드도 ASC이지만 보장)
            data.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
            setRows(data)
        } catch (e) {
            console.error('[StatsByHourPage] API 오류', e)
            setError('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setLoading(false)
        }
    }, [from, to])

    useEffect(() => {
        void load()
    }, [load])

    // ── 파생 계산값 ────────────────────────────────────────
    const maxTickets = Math.max(...rows.map((h) => h.customerCount), 1)
    /** 관람객 수 기준 피크 시간 */
    const peakRow = rows.reduce<StatisticsDTO | null>(
        (best, cur) => (!best || cur.customerCount > best.customerCount ? cur : best),
        null,
    )

    return (
        <div>
            <StatsTabNav/>
            <h2 style={pageTitle}>시간대별 통계</h2>

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
                    {/* 피크 시간 안내 */}
                    {peakRow && (
                        <p style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20}}>
                            피크 시간:{' '}
                            <strong style={{color: 'var(--color-brand-default)'}}>{peakRow.title}</strong>
                            &nbsp;({peakRow.customerCount.toLocaleString()}명)
                        </p>
                    )}

                    {/* 가로 바 차트 */}
                    <div style={chartCard}>
                        {rows.length === 0 ? (
                            <p style={{
                                color: 'var(--text-muted)',
                                fontSize: 14,
                                textAlign: 'center',
                                padding: '24px 0'
                            }}>
                                해당 기간 데이터 없음
                            </p>
                        ) : (
                            rows.map((h) => {
                                const pct = Math.max((h.customerCount / maxTickets) * 100, 2)
                                const isPeak = h.title === peakRow?.title
                                return (
                                    <div key={h.title} style={hourRow}>
                                        <span style={hourLabel}>{h.title}</span>
                                        <div style={barBg}>
                                            <div
                                                style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: isPeak
                                                        ? 'var(--color-brand-default)'
                                                        : 'var(--color-info-main)',
                                                    borderRadius: 4,
                                                    transition: 'width 0.4s ease',
                                                }}
                                            />
                                        </div>
                                        <span style={ticketCount}>{h.customerCount.toLocaleString()}명</span>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* 테이블 */}
                    <div style={tableWrap}>
                        <table style={table}>
                            <thead>
                            <tr style={thead}>
                                <th style={th}>시간대</th>
                                <th style={th}>관람객 수</th>
                                <th style={th}>매출</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={noData}>데이터 없음</td>
                                </tr>
                            ) : (
                                rows.map((h) => {
                                    const isPeak = h.title === peakRow?.title
                                    return (
                                        <tr key={h.title} style={tr}>
                                            <td style={{
                                                ...td,
                                                fontWeight: isPeak ? 700 : 400,
                                                color: isPeak
                                                    ? 'var(--color-brand-default)'
                                                    : 'var(--text-primary)',
                                            }}>
                                                {h.title}
                                                {isPeak && <span style={peakBadge}>피크</span>}
                                            </td>
                                            <td style={td}>{h.customerCount.toLocaleString()}명</td>
                                            <td style={td}>{h.revenue.toLocaleString()}원</td>
                                        </tr>
                                    )
                                })
                            )}
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
const rangeRow: CSSProperties = {display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20}
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
    background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
    marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10
}
const hourRow: CSSProperties = {display: 'flex', alignItems: 'center', gap: 12}
const hourLabel: CSSProperties = {width: 52, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0}
const barBg: CSSProperties = {flex: 1, height: 20, background: 'var(--bg-base)', borderRadius: 4}
const ticketCount: CSSProperties = {
    width: 64, fontSize: 13, color: 'var(--text-primary)',
    textAlign: 'right', flexShrink: 0
}
const peakBadge: CSSProperties = {
    marginLeft: 6, padding: '2px 6px',
    background: 'var(--color-brand-default)',
    borderRadius: 4, fontSize: 10,
    color: 'var(--btn-primary-text)', fontWeight: 700
}
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
const noData: CSSProperties = {padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14}

export default StatsByHourPage
