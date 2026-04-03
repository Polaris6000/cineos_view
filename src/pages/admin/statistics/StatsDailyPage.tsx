/**
 * StatsDailyPage.jsx — 일일 통계 (UC-13)
 *
 * 기능:
 *  - 날짜 범위 선택 (미래 날짜 선택 불가)
 *  - 선택 범위 내 일별 매출·티켓 수 테이블 + 간이 바 차트
 * TODO: GET /api/admin/stats/daily?from=&to= 연동
 */
import { useState, useMemo } from 'react'
import { MOCK_DAILY_STATS } from '../../../api/mockData'

const today = new Date().toISOString().slice(0, 10)

/** 테이블 한 페이지에 표시할 행 수 */
const PAGE_SIZE = 7

function StatsDailyPage() {
  // 기본: 최근 7일
  const defaultFrom = MOCK_DAILY_STATS[MOCK_DAILY_STATS.length - 7]?.date ?? today
  const [from, setFrom] = useState(defaultFrom)
  const [to,   setTo]   = useState(today)

  // 테이블 페이지 (0-indexed)
  const [page, setPage] = useState(0)

  const filtered = useMemo(
    () => {
      // 날짜 범위가 바뀌면 페이지 초기화
      setPage(0)
      return MOCK_DAILY_STATS.filter((d) => d.date >= from && d.date <= to)
    },
    [from, to]
  )

  const totalRevenue = filtered.reduce((a, d) => a + d.revenue, 0)
  const totalTickets = filtered.reduce((a, d) => a + d.tickets, 0)
  const maxRevenue   = Math.max(...filtered.map((d) => d.revenue), 1)

  // 최신 날짜가 먼저 오도록 reverse 후 페이지 슬라이싱
  const reversedFiltered = useMemo(() => [...filtered].reverse(), [filtered])
  const totalPages = Math.ceil(reversedFiltered.length / PAGE_SIZE)
  const pagedRows  = reversedFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <h2 style={pageTitle}>일일 통계</h2>

      {/* 날짜 범위 */}
      <div style={rangeRow}>
        <input type="date" value={from} max={to}
          onChange={(e) => setFrom(e.target.value)} style={dateInput} />
        <span style={{ color: 'var(--text-secondary)' }}>~</span>
        <input type="date" value={to} max={today}
          onChange={(e) => setTo(e.target.value)} style={dateInput} />
      </div>

      {/* 합계 카드 */}
      <div style={summaryRow}>
        <div style={summaryCard}>
          <p style={sLabel}>총 매출</p>
          <p style={sValue}>{totalRevenue.toLocaleString()}원</p>
        </div>
        <div style={summaryCard}>
          <p style={sLabel}>총 티켓</p>
          <p style={sValue}>{totalTickets.toLocaleString()}장</p>
        </div>
        <div style={summaryCard}>
          <p style={sLabel}>평균 일 매출</p>
          <p style={sValue}>{filtered.length ? Math.floor(totalRevenue / filtered.length).toLocaleString() : 0}원</p>
        </div>
      </div>

      {/* 바 차트 */}
      {filtered.length > 0 && (
        <div style={chartWrap}>
          <p style={chartLabel}>매출 추이</p>
          <div style={chartArea}>
            {filtered.map((d) => (
              <div key={d.date} style={barCol}>
                <div
                  style={{
                    ...bar,
                    height: `${Math.max((d.revenue / maxRevenue) * 120, 4)}px`,
                  }}
                  title={`${d.revenue.toLocaleString()}원`}
                />
                <span style={barLabel}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>날짜</th>
              <th style={th}>티켓 수</th>
              <th style={th}>매출</th>
              <th style={th}>평균단가</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} style={noData}>해당 기간 데이터 없음</td></tr>
            ) : (
              pagedRows.map((d) => (
                <tr key={d.date} style={tr}>
                  <td style={td}>{d.date}</td>
                  <td style={td}>{d.tickets.toLocaleString()}</td>
                  <td style={td}>{d.revenue.toLocaleString()}원</td>
                  <td style={td}>{Math.floor(d.revenue / d.tickets).toLocaleString()}원</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 — 데이터가 PAGE_SIZE 초과일 때만 표시 */}
      {totalPages > 1 && (
        <div style={pagination}>
          <button
            style={{ ...pageBtn, opacity: page === 0 ? 0.4 : 1 }}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← 이전
          </button>
          <span style={pageInfo}>
            {page + 1} / {totalPages} 페이지
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>
              (전체 {filtered.length}일)
            </span>
          </span>
          <button
            style={{ ...pageBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const rangeRow   = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }
const dateInput  = { padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                     fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)' }
const summaryRow = { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }
const summaryCard= { flex: 1, minWidth: 150, background: 'var(--bg-surface)', borderRadius: 10,
                     padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel     = { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }
const sValue     = { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const chartWrap  = { background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 20 }
const chartLabel = { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }
const chartArea  = { display: 'flex', gap: 4, alignItems: 'flex-end',
                     height: 140, overflowX: 'auto' }
const barCol     = { display: 'flex', flexDirection: 'column', alignItems: 'center',
                     gap: 4, flexShrink: 0, minWidth: 28 }
const bar        = { width: 20, background: 'var(--color-brand-default)', borderRadius: '4px 4px 0 0',
                     transition: 'height 0.3s' }
const barLabel   = { fontSize: 10, color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top',
                     whiteSpace: 'nowrap', marginTop: 6 }
const tableWrap  = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table      = { width: '100%', borderCollapse: 'collapse' }
const thead      = { background: 'var(--bg-base)' }
const th         = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                     fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr         = { borderBottom: '1px solid var(--border-subtle)' }
const td         = { padding: '11px 16px', fontSize: 14, color: 'var(--text-primary)' }
const noData     = { padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }
const pagination = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }
const pageBtn    = { padding: '8px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                     borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
                     fontWeight: 600, transition: 'opacity 0.2s' }
const pageInfo   = { fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }

export default StatsDailyPage
