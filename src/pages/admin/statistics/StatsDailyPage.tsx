/**
 * StatsDailyPage.tsx — 일일 통계
 *
 * API: GET /api/admin/statistics?startDate=&endDate=&type=DAY
 * 응답: { date, revenue, customerCount }[] — 날짜별 1행
 *
 * 기능:
 *  - 날짜 범위 선택 (미래 날짜 선택 불가)
 *  - 선택 범위 내 일별 매출·관람객 테이블 + 간이 바 차트
 *  - 로딩/에러 상태 처리
 *  - 테이블 페이지네이션 (7행씩)
 */
import type {CSSProperties} from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {Loader2} from 'lucide-react'
import type {StatisticsDTO} from '../../../api/statsApi'
import {fetchStatistics} from '../../../api/statsApi'
import {getKSTDateString} from '../../../api/apiClient'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

/** 테이블 한 페이지에 표시할 행 수 */
const PAGE_SIZE = 7

/** 'YYYY-MM-DD' 기준 7일 전 날짜 반환 */
function sevenDaysAgo(): string {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return getKSTDateString(d)
}

function StatsDailyPage() {
    const today = getKSTDateString()

    // ── 날짜 범위 상태 ────────────────────────────────────
    const [from, setFrom] = useState(sevenDaysAgo())
    const [to, setTo] = useState(today)

    // ── 데이터 상태 ────────────────────────────────────────
    const [rows, setRows] = useState<StatisticsDTO[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ── 테이블 페이지 ──────────────────────────────────────
    const [page, setPage] = useState(0)

    /** API 호출 함수 — from/to 바뀔 때마다 실행 */
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        setPage(0) // 범위 바뀌면 첫 페이지로

        try {
            const data = await fetchStatistics(from, to, 'DAY')
            // 날짜 오름차순으로 정렬 (백엔드도 ASC이지만 보장용)
            data.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            setRows(data)
        } catch (e) {
            console.error('[StatsDailyPage] API 오류', e)
            setError('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
        } finally {
            setLoading(false)
        }
    }, [from, to])

    // 컴포넌트 마운트 시 + from/to 변경 시 자동 로드
    useEffect(() => {
        void load()
    }, [load])

    // ── 파생 계산값 ────────────────────────────────────────
    const totalRevenue = rows.reduce((a, d) => a + d.revenue, 0)
    const totalTickets = rows.reduce((a, d) => a + d.customerCount, 0)
    const maxRevenue = Math.max(...rows.map((d) => d.revenue), 1)

    /** 최신 날짜 먼저 표시 (테이블용 역순) */
    const reversedRows = useMemo(() => [...rows].reverse(), [rows])
    const totalPages = Math.ceil(reversedRows.length / PAGE_SIZE)
    const pagedRows = reversedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    return (
        <div>
            {/* 통계 탭 내비게이션 */}
            <StatsTabNav/>
            <h2 style={pageTitle}>일일 통계</h2>

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

            {/* 로딩 스피너 */}
            {loading && (
                <div style={centerBox}>
                    <Loader2 size={28} style={{animation: 'spin 1s linear infinite'}}
                             color="var(--color-brand-default)"/>
                    <span style={{marginLeft: 10, color: 'var(--text-secondary)'}}>데이터 로딩 중…</span>
                </div>
            )}

            {/* 에러 메시지 */}
            {!loading && error && (
                <div style={errorBox}>{error}</div>
            )}

            {/* 정상 데이터 */}
            {!loading && !error && (
                <>
                    {/* 합계 카드 */}
                    <div style={summaryRow}>
                        <div style={summaryCard}>
                            <p style={sLabel}>총 매출</p>
                            <p style={sValue}>{totalRevenue.toLocaleString()}원</p>
                        </div>
                        <div style={summaryCard}>
                            <p style={sLabel}>총 관람객</p>
                            <p style={sValue}>{totalTickets.toLocaleString()}명</p>
                        </div>
                        <div style={summaryCard}>
                            <p style={sLabel}>평균 일 매출</p>
                            <p style={sValue}>
                                {rows.length
                                    ? Math.floor(totalRevenue / rows.length).toLocaleString()
                                    : 0}원
                            </p>
                        </div>
                    </div>

                    {/* 바 차트 */}
                    {rows.length > 0 && (
                        <div style={chartWrap}>
                            <p style={chartLabel}>매출 추이</p>
                            <div style={chartArea}>
                                {rows.map((d) => (
                                    <div key={d.date} style={barCol}>
                                        <div
                                            style={{
                                                ...bar,
                                                height: `${Math.max((d.revenue / maxRevenue) * 120, 4)}px`,
                                            }}
                                            title={`${d.revenue.toLocaleString()}원`}
                                        />
                                        {/* 날짜 레이블: MM-DD 형식으로 짧게 표시 */}
                                        <span style={barLabel}>{(d.date ?? '').slice(5)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 데이터 테이블 */}
                    <div style={tableWrap}>
                        <table style={table}>
                            <thead>
                            <tr style={thead}>
                                <th style={th}>날짜</th>
                                <th style={th}>관람객 수</th>
                                <th style={th}>매출</th>
                                <th style={th}>평균 단가</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={noData}>해당 기간 데이터 없음</td>
                                </tr>
                            ) : (
                                pagedRows.map((d) => (
                                    <tr key={d.date} style={tr}>
                                        <td style={td}>{d.date}</td>
                                        <td style={td}>{d.customerCount.toLocaleString()}명</td>
                                        <td style={td}>{d.revenue.toLocaleString()}원</td>
                                        {/* 평균 단가 = 매출 / 관람객 수 (관람객 0명이면 '-' 표시) */}
                                        <td style={td}>
                                            {d.customerCount > 0
                                                ? `${Math.floor(d.revenue / d.customerCount).toLocaleString()}원`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 — PAGE_SIZE 초과일 때만 표시 */}
                    {totalPages > 1 && (
                        <div style={pagination}>
                            <button
                                style={{...pageBtn, opacity: page === 0 ? 0.4 : 1}}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                ← 이전
                            </button>
                            <span style={pageInfo}>
                {page + 1} / {totalPages} 페이지
                <span style={{color: 'var(--text-muted)', fontSize: 12, marginLeft: 6}}>
                  (전체 {rows.length}일)
                </span>
              </span>
                            <button
                                style={{...pageBtn, opacity: page >= totalPages - 1 ? 0.4 : 1}}
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                다음 →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/* ── 스타일 ── */
const pageTitle: CSSProperties = {fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20}
const rangeRow: CSSProperties = {display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20}
const dateInput: CSSProperties = {
    padding: '8px 12px', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 14, color: 'var(--text-primary)',
    background: 'var(--input-bg)'
}
const centerBox: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 0'
}
const errorBox: CSSProperties = {
    padding: '16px 20px', background: 'var(--color-error-bg)',
    border: '1px solid var(--color-error-main)', borderRadius: 10,
    color: 'var(--color-error-main)', fontSize: 14, marginBottom: 16
}
const summaryRow: CSSProperties = {display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap'}
const summaryCard: CSSProperties = {
    flex: 1, minWidth: 150, background: 'var(--bg-surface)', borderRadius: 10,
    padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
}
const sLabel: CSSProperties = {fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, margin: '0 0 4px'}
const sValue: CSSProperties = {fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0}
const chartWrap: CSSProperties = {background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 20}
const chartLabel: CSSProperties = {fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, margin: '0 0 12px'}
const chartArea: CSSProperties = {
    display: 'flex', gap: 4, alignItems: 'flex-end',
    height: 140, overflowX: 'auto'
}
const barCol: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, flexShrink: 0, minWidth: 28
}
const bar: CSSProperties = {
    width: 20, background: 'var(--color-brand-default)',
    borderRadius: '4px 4px 0 0', transition: 'height 0.3s'
}
const barLabel: CSSProperties = {
    fontSize: 10, color: 'var(--text-muted)',
    transform: 'rotate(-45deg)', transformOrigin: 'top',
    whiteSpace: 'nowrap', marginTop: 6
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
const td: CSSProperties = {padding: '11px 16px', fontSize: 14, color: 'var(--text-primary)'}
const noData: CSSProperties = {padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14}
const pagination: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginTop: 16
}
const pageBtn: CSSProperties = {
    padding: '8px 18px', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: 600, transition: 'opacity 0.2s'
}
const pageInfo: CSSProperties = {fontSize: 14, color: 'var(--text-primary)', fontWeight: 600}

export default StatsDailyPage
