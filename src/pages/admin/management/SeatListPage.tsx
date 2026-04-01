/**
 * SeatListPage.jsx — 좌석 목록
 * 상영관 선택 → 좌석 배치도 표시 + 좌석 상태 통계
 * TODO: GET /api/admin/theaters/:id/seats 연동
 */
import { useState } from 'react'
import { MOCK_THEATERS, generateSeats } from '../../../api/mockData'

function SeatListPage() {
  const [theaterId, setTheaterId] = useState(MOCK_THEATERS[0]?.id ?? 1)
  const theater = MOCK_THEATERS.find((t) => t.id === Number(theaterId))
  const seats   = generateSeats(theater?.rows ?? 8, theater?.cols ?? 10)

  const stats = {
    total:    seats.length,
    empty:    seats.filter((s) => s.status === 'empty').length,
    soldOut:  seats.filter((s) => s.status === 'sold_out').length,
    disabled: seats.filter((s) => s.status === 'disabled').length,
  }
  const rows = [...new Set(seats.map((s) => s.row))]

  return (
    <div>
      <h2 style={pageTitle}>좌석 목록</h2>

      {/* 상영관 선택 */}
      <select
        value={theaterId}
        onChange={(e) => setTheaterId(e.target.value)}
        style={selectStyle}
      >
        {MOCK_THEATERS.map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
        ))}
      </select>

      {/* 통계 카드 */}
      <div style={statsRow}>
        {[
          { label: '전체',    value: stats.total,    color: '#4f4537' },
          { label: '빈 좌석', value: stats.empty,    color: '#2a88c8' },
          { label: '매진',    value: stats.soldOut,  color: '#00ad74' },
          { label: '이용불가',value: stats.disabled, color: '#e03c3c' },
        ].map((s) => (
          <div key={s.label} style={statCard}>
            <p style={{ fontSize: 12, color: '#b6a999', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div style={legend}>
        {[
          { color: '#2e2820', label: '빈 좌석' },
          { color: '#4f4537', label: '매진' },
          { color: '#005248', label: '이용불가' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: color, borderRadius: 3 }} />
            <span style={{ fontSize: 12, color: '#4f4537' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 좌석 배치도 */}
      <div style={seatWrap}>
        <div style={screenBar}>SCREEN</div>
        <div style={{ overflowX: 'auto' }}>
          {rows.map((row) => (
            <div key={row} style={rowStyle}>
              <span style={rowLabel}>{row}</span>
              {seats.filter((s) => s.row === row).map((s) => (
                <div
                  key={s.id}
                  title={s.id}
                  style={{
                    ...seatStyle,
                    background:
                      s.status === 'sold_out' ? '#4f4537' :
                      s.status === 'disabled' ? '#005248' : '#2e2820',
                  }}
                />
              ))}
              <span style={rowLabel}>{row}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const pageTitle  = { fontSize: 22, fontWeight: 800, color: '#0e0b08', marginBottom: 16 }
const selectStyle= { padding: '10px 12px', border: '1px solid #dfe0df', borderRadius: 8,
                     fontSize: 14, color: '#0e0b08', background: '#fff',
                     marginBottom: 16, minWidth: 200 }
const statsRow   = { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }
const statCard   = { flex: 1, minWidth: 100, background: '#fff', borderRadius: 10,
                     padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const legend     = { display: 'flex', gap: 16, marginBottom: 16 }
const seatWrap   = { background: '#1a1410', borderRadius: 12, padding: '24px 16px' }
const screenBar  = { textAlign: 'center', padding: '6px', background: '#2e2820',
                     color: '#4f4537', fontSize: 12, letterSpacing: 4,
                     marginBottom: 20, borderRadius: 4 }
const rowStyle   = { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }
const rowLabel   = { width: 18, fontSize: 11, color: '#4f4537', textAlign: 'center', flexShrink: 0 }
const seatStyle  = { width: 22, height: 22, borderRadius: 4, flexShrink: 0 }

export default SeatListPage
