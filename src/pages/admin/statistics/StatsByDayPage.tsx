/**
 * StatsByDayPage.jsx — 요일별 통계 (UC-15)
 * TODO: GET /api/admin/stats/by-day 연동
 */
import { MOCK_DAY_STATS } from '../../../api/mockData'

// 일=빨, 월~금=파, 토=보라, 금=골드
const COLORS = [
  'var(--color-error-main)',      // 일
  'var(--color-info-main)',       // 월
  'var(--color-info-main)',       // 화
  'var(--color-info-main)',       // 수
  'var(--color-info-main)',       // 목
  'var(--color-accent-purple)',   // 금
  'var(--color-brand-default)',       // 토
]

function StatsByDayPage() {
  const maxRevenue = Math.max(...MOCK_DAY_STATS.map((d) => d.revenue), 1)

  return (
    <div>
      <h2 style={pageTitle}>요일별 통계</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        최근 30일 데이터 기반 요일별 평균
      </p>

      {/* 바 차트 */}
      <div style={chartCard}>
        <p style={chartLabel}>요일별 평균 매출</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160 }}>
          {MOCK_DAY_STATS.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                                       alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.revenue.toLocaleString()}원</span>
              <div
                style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: COLORS[i],
                  height: `${Math.max((d.revenue / maxRevenue) * 120, 6)}px`,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS[i] }}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>요일</th>
              <th style={th}>평균 티켓 수</th>
              <th style={th}>평균 매출</th>
              <th style={th}>최고 대비</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DAY_STATS.map((d, i) => {
              const pct = Math.round((d.revenue / maxRevenue) * 100)
              return (
                <tr key={d.day} style={tr}>
                  <td style={{ ...td, fontWeight: 700, color: COLORS[i] }}>{d.day}요일</td>
                  <td style={td}>{d.tickets.toLocaleString()}장</td>
                  <td style={td}>{d.revenue.toLocaleString()}원</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-base)', borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%',
                                      background: COLORS[i], borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 34 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }
const chartCard = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }
const chartLabel= { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }
const tableWrap = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table     = { width: '100%', borderCollapse: 'collapse' }
const thead     = { background: 'var(--bg-base)' }
const th        = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                    fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr        = { borderBottom: '1px solid var(--border-subtle)' }
const td        = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }

export default StatsByDayPage
