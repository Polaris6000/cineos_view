/**
 * StatsByHourPage.jsx — 시간대별 통계 (UC-16)
 * TODO: GET /api/admin/stats/by-hour 연동
 */
import { MOCK_HOUR_STATS } from '../../../api/mockData'

function StatsByHourPage() {
  const maxTickets = Math.max(...MOCK_HOUR_STATS.map((h) => h.tickets), 1)
  const peakHour   = MOCK_HOUR_STATS.reduce((a, b) => b.tickets > a.tickets ? b : a)

  return (
    <div>
      <h2 style={pageTitle}>시간대별 통계</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        피크 시간: <strong style={{ color: 'var(--color-brand-default)' }}>{peakHour.hour}</strong>
        &nbsp;({peakHour.tickets}장)
      </p>

      {/* 가로 바 차트 */}
      <div style={chartCard}>
        {MOCK_HOUR_STATS.map((h) => {
          const pct  = Math.max((h.tickets / maxTickets) * 100, 2)
          const isPeak = h.hour === peakHour.hour
          return (
            <div key={h.hour} style={hourRow}>
              <span style={hourLabel}>{h.hour}</span>
              <div style={barBg}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: isPeak ? 'var(--color-brand-default)' : 'var(--color-info-main)',
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span style={ticketCount}>{h.tickets}장</span>
            </div>
          )
        })}
      </div>

      {/* 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>시간대</th>
              <th style={th}>티켓 수</th>
              <th style={th}>매출</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_HOUR_STATS.map((h) => (
              <tr key={h.hour} style={tr}>
                <td style={{ ...td, fontWeight: h.hour === peakHour.hour ? 700 : 400,
                             color: h.hour === peakHour.hour ? 'var(--color-brand-default)' : 'var(--text-primary)' }}>
                  {h.hour}
                  {h.hour === peakHour.hour && <span style={peakBadge}>피크</span>}
                </td>
                <td style={td}>{h.tickets.toLocaleString()}장</td>
                <td style={td}>{h.revenue.toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const pageTitle   = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }
const chartCard   = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                      marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }
const hourRow     = { display: 'flex', alignItems: 'center', gap: 12 }
const hourLabel   = { width: 52, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }
const barBg       = { flex: 1, height: 20, background: 'var(--bg-base)', borderRadius: 4 }
const ticketCount = { width: 52, fontSize: 13, color: 'var(--text-primary)', textAlign: 'right', flexShrink: 0 }
const peakBadge   = { marginLeft: 6, padding: '2px 6px', background: 'var(--color-brand-default)',
                      borderRadius: 4, fontSize: 10, color: 'var(--btn-primary-text)', fontWeight: 700 }
const tableWrap   = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table       = { width: '100%', borderCollapse: 'collapse' }
const thead       = { background: 'var(--bg-base)' }
const th          = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                      fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr          = { borderBottom: '1px solid var(--border-subtle)' }
const td          = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }

export default StatsByHourPage
