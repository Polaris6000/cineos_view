/**
 * StatsByMoviePage.tsx — 영화별 통계
 *
 * API: GET /api/admin/statistics?startDate=&endDate=&type=MOVIE
 * 응답: { title(영화 제목), revenue, customerCount }[]  — date=null
 *
 * 기능:
 *  - 날짜 범위 선택으로 집계 기간 지정
 *  - 클라이언트 정렬: 매출 내림차순 → 자동 랭킹
 *  - 랭킹 카드 + 테이블
 *  ※ 백엔드 MOVIE 타입은 rating 미제공 → 등급 컬럼 미표시
 */
import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { Loader2, Ticket, Banknote } from 'lucide-react'
import { fetchStatistics } from '../../../api/statsApi'
import type { StatisticsDTO } from '../../../api/statsApi'
import { getKSTDateString } from '../../../api/apiClient'
import StatsTabNav from '../../../components/Stats/StatsTabNav'

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return getKSTDateString(d)
}

function StatsByMoviePage() {
  const today = getKSTDateString()

  // ── 날짜 범위 상태 ────────────────────────────────────
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to,   setTo  ] = useState(today)

  // ── 데이터 상태 ────────────────────────────────────────
  const [rows,    setRows   ] = useState<StatisticsDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchStatistics(from, to, 'MOVIE')
      // 매출 내림차순 정렬 → 자동 랭킹
      data.sort((a, b) => b.revenue - a.revenue)
      setRows(data)
    } catch (e) {
      console.error('[StatsByMoviePage] API 오류', e)
      setError('데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  const maxRev = Math.max(...rows.map((m) => m.revenue), 1)

  return (
    <div>
      <StatsTabNav />
      <h2 style={pageTitle}>영화별 통계</h2>

      {/* 날짜 범위 선택 */}
      <div style={rangeRow}>
        <input
          type="date" value={from} max={to}
          onChange={(e) => setFrom(e.target.value)}
          style={dateInput}
        />
        <span style={{ color: 'var(--text-secondary)' }}>~</span>
        <input
          type="date" value={to} max={today}
          onChange={(e) => setTo(e.target.value)}
          style={dateInput}
        />
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
      {!loading && !error && rows.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>
          해당 기간 영화별 통계 데이터가 없습니다.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* 랭킹 카드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {rows.map((m, i) => (
              <div key={m.title} style={rankCard}>
                {/* 순위 배지 — 1위: 골드, 2위: 실버, 3위: 브론즈 */}
                <div style={{
                  ...rankBadge,
                  background:
                    i === 0 ? 'var(--color-brand-default)' :
                    i === 1 ? 'var(--text-muted)' :
                    i === 2 ? 'var(--color-accent-bronze, #cd7f32)' :
                              'var(--bg-base)',
                  color: i < 3 ? '#fff' : 'var(--text-secondary)',
                }}>
                  {i + 1}
                </div>

                {/* 영화 정보 */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                               margin: '0 0 6px' }}>
                    {m.title}
                  </p>

                  {/* 매출 비율 바 */}
                  <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 4, marginBottom: 8 }}>
                    <div style={{
                      width: `${(m.revenue / maxRev) * 100}%`,
                      height: '100%',
                      background: 'var(--color-brand-default)',
                      borderRadius: 4,
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)',
                                 alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ticket size={13} /> {m.customerCount.toLocaleString()}명
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
                  <th style={th}>관람객 수</th>
                  <th style={th}>매출</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.title} style={tr}>
                    <td style={{ ...td, fontWeight: 700 }}>#{i + 1}</td>
                    <td style={td}>{m.title}</td>
                    <td style={td}>{m.customerCount.toLocaleString()}명</td>
                    <td style={{ ...td, fontWeight: 600 }}>{m.revenue.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle: CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }
const rangeRow: CSSProperties  = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }
const dateInput: CSSProperties = { padding: '8px 12px', border: '1px solid var(--border-default)',
                                   borderRadius: 8, fontSize: 14, color: 'var(--text-primary)',
                                   background: 'var(--input-bg)' }
const centerBox: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }
const errorBox: CSSProperties  = { padding: '16px 20px', background: 'var(--color-error-bg)',
                                   border: '1px solid var(--color-error-main)', borderRadius: 10,
                                   color: 'var(--color-error-main)', fontSize: 14, marginBottom: 16 }
const rankCard: CSSProperties  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                                   display: 'flex', alignItems: 'flex-start', gap: 16,
                                   boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const rankBadge: CSSProperties = { width: 32, height: 32, borderRadius: '50%',
                                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                                   fontSize: 14, fontWeight: 800, flexShrink: 0 }
const tableWrap: CSSProperties = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden',
                                   boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table: CSSProperties     = { width: '100%', borderCollapse: 'collapse' }
const thead: CSSProperties     = { background: 'var(--bg-base)' }
const th: CSSProperties        = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                                   fontWeight: 600, color: 'var(--text-secondary)',
                                   borderBottom: '1px solid var(--border-default)' }
const tr: CSSProperties        = { borderBottom: '1px solid var(--border-subtle)' }
const td: CSSProperties        = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }

export default StatsByMoviePage
