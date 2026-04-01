/**
 * StatsByMoviePage.jsx — 영화별 통계 (UC-17)
 * TODO: GET /api/admin/stats/by-movie?from=&to= 연동
 */
import { useState } from 'react'
import { Ticket, Banknote } from 'lucide-react'
import { MOCK_MOVIE_STATS } from '../../../api/mockData'

const today        = new Date().toISOString().slice(0, 10)
const thirtyAgo    = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

function StatsByMoviePage() {
  const [from, setFrom] = useState(thirtyAgo)
  const [to,   setTo]   = useState(today)

  // 필터는 실제 API에서 서버단 처리 — 여기서는 더미 전체 표시
  const stats  = MOCK_MOVIE_STATS
  const maxRev = Math.max(...stats.map((m) => m.revenue), 1)

  const RATING_COLOR = {
    ALL: 'var(--color-success-main)',
    '12': 'var(--color-info-main)',
    '15': 'var(--color-brand-default)',
    '19': 'var(--color-error-main)',
  }

  return (
    <div>
      <h2 style={pageTitle}>영화별 통계</h2>

      {/* 날짜 범위 */}
      <div style={rangeRow}>
        <input type="date" value={from} max={to}
          onChange={(e) => setFrom(e.target.value)} style={dateInput} />
        <span style={{ color: 'var(--text-secondary)' }}>~</span>
        <input type="date" value={to} max={today}
          onChange={(e) => setTo(e.target.value)} style={dateInput} />
      </div>

      {/* 랭킹 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {stats.map((m, i) => (
          <div key={m.movieId} style={rankCard}>
            {/* 순위 */}
            <div style={{
              ...rankBadge,
              background: i === 0 ? 'var(--color-brand-default)' : i === 1 ? 'var(--text-muted)' : i === 2 ? 'var(--color-accent-bronze)' : 'var(--bg-base)',
              color: i < 3 ? '#fff' : 'var(--text-secondary)',
            }}>
              {i + 1}
            </div>

            {/* 영화 정보 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{m.title}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                               background: RATING_COLOR[m.rating] ?? 'var(--text-secondary)', color: '#fff' }}>
                  {m.rating === 'ALL' ? '전체' : `${m.rating}세`}
                </span>
              </div>

              {/* 바 그래프 */}
              <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 4, marginBottom: 6 }}>
                <div style={{ width: `${(m.revenue / maxRev) * 100}%`, height: '100%',
                              background: 'var(--color-brand-default)', borderRadius: 4 }} />
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Ticket size={13} /> {m.tickets.toLocaleString()}장
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Banknote size={13} /> {m.revenue.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>순위</th>
              <th style={th}>영화</th>
              <th style={th}>등급</th>
              <th style={th}>티켓 수</th>
              <th style={th}>매출</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((m, i) => (
              <tr key={m.movieId} style={tr}>
                <td style={{ ...td, fontWeight: 700 }}>#{i + 1}</td>
                <td style={td}>{m.title}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                 background: RATING_COLOR[m.rating] ?? 'var(--text-secondary)', color: '#fff' }}>
                    {m.rating === 'ALL' ? '전체' : `${m.rating}세`}
                  </span>
                </td>
                <td style={td}>{m.tickets.toLocaleString()}</td>
                <td style={{ ...td, fontWeight: 600 }}>{m.revenue.toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }
const rangeRow   = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }
const dateInput  = { padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                     fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)' }
const rankCard   = { background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                     display: 'flex', alignItems: 'flex-start', gap: 16,
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const rankBadge  = { width: 32, height: 32, borderRadius: '50%', display: 'flex',
                     alignItems: 'center', justifyContent: 'center',
                     fontSize: 14, fontWeight: 800, flexShrink: 0 }
const tableWrap  = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table      = { width: '100%', borderCollapse: 'collapse' }
const thead      = { background: 'var(--bg-base)' }
const th         = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                     fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr         = { borderBottom: '1px solid var(--border-subtle)' }
const td         = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }

export default StatsByMoviePage
