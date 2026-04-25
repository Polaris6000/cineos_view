/**
 * StatsMonthlyPage.tsx — 월별 통계 (UC-14)
 *
 * API: GET /api/admin/statistics?startDate=YYYY-01-01&endDate=YYYY-12-31&type=MONTH
 * 응답: { date('YYYY-MM-01'), revenue, customerCount }[]
 *
 * 기능:
 *  - 연도 선택(◀▶)으로 해당 연도 12개월 데이터 조회
 *  - 월별 바 차트, 전월 대비 등락 표시
 *  - 로딩/에러 상태 처리
 */
import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchStatistics } from '../../../api/statsApi'
import type { StatisticsDTO } from '../../../api/statsApi'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

const currentYear = new Date().getFullYear()

function StatsMonthlyPage() {
  const [year, setYear] = useState(currentYear)

  // ── 데이터 상태 ────────────────────────────────────────
  const [rows,    setRows   ] = useState<StatisticsDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState<string | null>(null)

  /** 연도 전체 범위로 MONTH 타입 조회 */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 해당 연도 1월 1일 ~ 12월 31일 범위로 요청
      // 백엔드가 GROUP BY 월 단위로 집계해서 date=YYYY-MM-01 형태로 반환함
      const data = await fetchStatistics(`${year}-01-01`, `${year}-12-31`, 'MONTH')
      data.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      setRows(data)
    } catch (e) {
      console.error('[StatsMonthlyPage] API 오류', e)
      setError('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  // ── 파생 계산값 ────────────────────────────────────────
  const totalRevenue = rows.reduce((a, m) => a + m.revenue,       0)
  const totalTickets = rows.reduce((a, m) => a + m.customerCount, 0)
  const maxRevenue   = Math.max(...rows.map((m) => m.revenue), 1)

  /** date 'YYYY-MM-01' → 'MM월' 레이블 */
  const monthLabel = (date: string | null) =>
    date ? `${parseInt(date.slice(5, 7), 10)}월` : '-'

  return (
    <div>
      {/* 통계 탭 내비게이션 */}
      <StatsTabNav />
      <h2 style={pageTitle}>월별 통계</h2>

      {/* 연도 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setYear((y) => y - 1)} style={yearBtn}>◀</button>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>
          {year}년
        </span>
        {/* 미래 연도는 선택 불가 */}
        <button
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear}
          style={{ ...yearBtn, opacity: year >= currentYear ? 0.3 : 1 }}
        >▶</button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={centerBox}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} color="var(--color-brand-default)" />
          <span style={{ marginLeft: 10, color: 'var(--text-secondary)' }}>데이터 로딩 중…</span>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div style={errorBox}>{error}</div>
      )}

      {/* 정상 데이터 */}
      {!loading && !error && (
        <>
          {/* 합계 카드 */}
          <div style={summaryRow}>
            <div style={summaryCard}>
              <p style={sLabel}>연간 총 매출</p>
              <p style={sValue}>{totalRevenue.toLocaleString()}원</p>
            </div>
            <div style={summaryCard}>
              <p style={sLabel}>연간 총 관람객</p>
              <p style={sValue}>{totalTickets.toLocaleString()}명</p>
            </div>
          </div>

          {/* 바 차트 */}
          <div style={chartWrap}>
            <p style={chartLabel}>월별 매출</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
              {rows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 'auto' }}>
                  해당 연도 데이터 없음
                </p>
              ) : (
                rows.map((m) => (
                  <div
                    key={m.date}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}
                  >
                    <div
                      style={{
                        width: '100%',
                        background: 'var(--color-brand-default)',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((m.revenue / maxRevenue) * 130, 4)}px`,
                      }}
                      title={`${m.revenue.toLocaleString()}원`}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {monthLabel(m.date)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 테이블 */}
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr style={thead}>
                  <th style={th}>월</th>
                  <th style={th}>관람객 수</th>
                  <th style={th}>매출</th>
                  <th style={th}>전월 대비</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={noData}>데이터 없음</td>
                  </tr>
                ) : (
                  rows.map((m, i) => {
                    // 전월 대비 매출 증감
                    const prev = rows[i - 1]
                    const diff = prev ? m.revenue - prev.revenue : null
                    return (
                      <tr key={m.date} style={tr}>
                        {/* 'YYYY-MM-01' → 'YYYY-MM' 형식으로 표시 */}
                        <td style={td}>{(m.date ?? '').slice(0, 7)}</td>
                        <td style={td}>{m.customerCount.toLocaleString()}명</td>
                        <td style={td}>{m.revenue.toLocaleString()}원</td>
                        <td style={td}>
                          {diff === null ? '-' : (
                            <span style={{ color: diff >= 0 ? 'var(--color-success-main)' : 'var(--color-error-main)' }}>
                              {diff >= 0 ? '+' : ''}{diff.toLocaleString()}원
                            </span>
                          )}
                        </td>
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
const pageTitle: CSSProperties  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const yearBtn: CSSProperties    = { padding: '6px 14px', background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)' }
const centerBox: CSSProperties  = { display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '40px 0' }
const errorBox: CSSProperties   = { padding: '16px 20px', background: 'var(--color-error-bg)',
                                    border: '1px solid var(--color-error-main)', borderRadius: 10,
                                    color: 'var(--color-error-main)', fontSize: 14, marginBottom: 16 }
const summaryRow: CSSProperties = { display: 'flex', gap: 12, marginBottom: 20 }
const summaryCard: CSSProperties = { flex: 1, background: 'var(--bg-surface)', borderRadius: 10,
                                    padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel: CSSProperties     = { fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px' }
const sValue: CSSProperties     = { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const chartWrap: CSSProperties  = { background: 'var(--bg-surface)', borderRadius: 12,
                                    padding: '20px 20px 16px', marginBottom: 20 }
const chartLabel: CSSProperties = { fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }
const tableWrap: CSSProperties  = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table: CSSProperties      = { width: '100%', borderCollapse: 'collapse' }
const thead: CSSProperties      = { background: 'var(--bg-base)' }
const th: CSSProperties         = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                                    fontWeight: 600, color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-default)' }
const tr: CSSProperties         = { borderBottom: '1px solid var(--border-subtle)' }
const td: CSSProperties         = { padding: '11px 16px', fontSize: 14, color: 'var(--text-primary)' }
const noData: CSSProperties     = { padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }

export default StatsMonthlyPage
