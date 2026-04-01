/**
 * StatsMonthlyPage.jsx — 월별 통계 (UC-14)
 * TODO: GET /api/admin/stats/monthly?year= 연동
 */
import { useState, useMemo } from 'react'
import { MOCK_MONTHLY_STATS } from '../../../api/mockData'

const currentYear = new Date().getFullYear()

function StatsMonthlyPage() {
  const [year, setYear] = useState(currentYear)

  const filtered = useMemo(
    () => MOCK_MONTHLY_STATS.filter((m) => m.month.startsWith(String(year))),
    [year]
  )

  const totalRevenue = filtered.reduce((a, m) => a + m.revenue, 0)
  const totalTickets = filtered.reduce((a, m) => a + m.tickets, 0)
  const maxRevenue   = Math.max(...filtered.map((m) => m.revenue), 1)

  return (
    <div>
      <h2 style={pageTitle}>월별 통계</h2>

      {/* 연도 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setYear((y) => y - 1)} style={yearBtn}>◀</button>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>
          {year}년
        </span>
        <button
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear}
          style={{ ...yearBtn, opacity: year >= currentYear ? 0.3 : 1 }}
        >▶</button>
      </div>

      {/* 합계 카드 */}
      <div style={summaryRow}>
        <div style={summaryCard}>
          <p style={sLabel}>연간 총 매출</p>
          <p style={sValue}>{totalRevenue.toLocaleString()}원</p>
        </div>
        <div style={summaryCard}>
          <p style={sLabel}>연간 총 티켓</p>
          <p style={sValue}>{totalTickets.toLocaleString()}장</p>
        </div>
      </div>

      {/* 바 차트 */}
      <div style={chartWrap}>
        <p style={chartLabel}>월별 매출</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
          {filtered.map((m) => (
            <div key={m.month} style={{ display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 6, flex: 1 }}>
              <div
                style={{
                  width: '100%', background: 'var(--color-brand-default)', borderRadius: '4px 4px 0 0',
                  height: `${Math.max((m.revenue / maxRevenue) * 130, 4)}px`,
                }}
                title={`${m.revenue.toLocaleString()}원`}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.month.slice(5)}월</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 'auto' }}>해당 연도 데이터 없음</p>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>월</th>
              <th style={th}>티켓 수</th>
              <th style={th}>매출</th>
              <th style={th}>전월 대비</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} style={noData}>데이터 없음</td></tr>
            ) : (
              filtered.map((m, i) => {
                const prev = filtered[i - 1]
                const diff = prev ? m.revenue - prev.revenue : null
                return (
                  <tr key={m.month} style={tr}>
                    <td style={td}>{m.month}</td>
                    <td style={td}>{m.tickets.toLocaleString()}</td>
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
    </div>
  )
}

const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const yearBtn    = { padding: '6px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                     borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)' }
const summaryRow = { display: 'flex', gap: 12, marginBottom: 20 }
const summaryCard= { flex: 1, background: 'var(--bg-surface)', borderRadius: 10, padding: '14px 16px',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel     = { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }
const sValue     = { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const chartWrap  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 20px 16px',
                     marginBottom: 20 }
const chartLabel = { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }
const tableWrap  = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table      = { width: '100%', borderCollapse: 'collapse' }
const thead      = { background: 'var(--bg-base)' }
const th         = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                     fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr         = { borderBottom: '1px solid var(--border-subtle)' }
const td         = { padding: '11px 16px', fontSize: 14, color: 'var(--text-primary)' }
const noData     = { padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }

export default StatsMonthlyPage
