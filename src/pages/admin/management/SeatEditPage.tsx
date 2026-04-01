/**
 * SeatEditPage.jsx — 좌석 정책 수정
 * 특정 좌석의 상태(이용가능/이용불가)를 변경
 * TODO: PUT /api/admin/seats/:id 연동
 */
import { useState } from 'react'
import { MOCK_THEATERS, generateSeats } from '../../../api/mockData'

function SeatEditPage() {
  const [theaterId, setTheaterId] = useState(MOCK_THEATERS[0]?.id ?? 1)
  const theater = MOCK_THEATERS.find((t) => t.id === Number(theaterId))
  const [seats, setSeats] = useState(() => generateSeats(theater?.rows ?? 8, theater?.cols ?? 10))
  const [selectedSeat, setSelectedSeat] = useState(null)

  const handleTheaterChange = (id) => {
    setTheaterId(id)
    const t = MOCK_THEATERS.find((th) => th.id === Number(id))
    setSeats(generateSeats(t?.rows ?? 8, t?.cols ?? 10))
    setSelectedSeat(null)
  }

  const toggleDisabled = (seatId) => {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === seatId
          ? { ...s, status: s.status === 'disabled' ? 'empty' : 'disabled' }
          : s
      )
    )
    // TODO: PUT /api/admin/seats/:seatId { status: ... }
  }

  const handleSeatClick = (seat) => {
    if (seat.status === 'sold_out') return // 매진은 수정 불가
    setSelectedSeat(seat)
  }

  const rows = [...new Set(seats.map((s) => s.row))]

  return (
    <div>
      <h2 style={pageTitle}>좌석 정책 수정</h2>
      <p style={{ fontSize: 13, color: '#4f4537', marginBottom: 16 }}>
        좌석을 클릭하면 이용가능/이용불가를 전환할 수 있습니다.
      </p>

      {/* 상영관 선택 */}
      <select value={theaterId} onChange={(e) => handleTheaterChange(e.target.value)}
        style={selectStyle}>
        {MOCK_THEATERS.map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
        ))}
      </select>

      {/* 좌석 배치도 */}
      <div style={seatWrap}>
        <div style={screenBar}>SCREEN</div>
        <div style={{ overflowX: 'auto' }}>
          {rows.map((row) => (
            <div key={row} style={rowStyle}>
              <span style={rowLabel}>{row}</span>
              {seats.filter((s) => s.row === row).map((s) => (
                <button
                  key={s.id}
                  title={`${s.id} (${s.status === 'disabled' ? '이용불가' : s.status === 'sold_out' ? '매진' : '이용가능'})`}
                  onClick={() => handleSeatClick(s)}
                  style={{
                    ...seatBtn,
                    background:
                      s.status === 'disabled' ? '#005248' :
                      s.status === 'sold_out' ? '#4f4537' :
                      selectedSeat?.id === s.id ? '#ffb800' : '#2e2820',
                    cursor: s.status === 'sold_out' ? 'not-allowed' : 'pointer',
                  }}
                />
              ))}
              <span style={rowLabel}>{row}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 선택 좌석 편집 패널 */}
      {selectedSeat && (
        <div style={editPanel}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#0e0b08', marginBottom: 4 }}>
            좌석 {selectedSeat.id}
          </p>
          <p style={{ fontSize: 13, color: '#4f4537', marginBottom: 12 }}>
            현재 상태: <strong>{selectedSeat.status === 'disabled' ? '이용불가' : '이용가능'}</strong>
          </p>
          <button
            onClick={() => {
              toggleDisabled(selectedSeat.id)
              setSelectedSeat((prev) => ({
                ...prev,
                status: prev.status === 'disabled' ? 'empty' : 'disabled',
              }))
            }}
            style={toggleBtn}
          >
            {selectedSeat.status === 'disabled' ? '이용 가능으로 변경' : '이용 불가로 변경'}
          </button>
        </div>
      )}
    </div>
  )
}

const pageTitle  = { fontSize: 22, fontWeight: 800, color: '#0e0b08', marginBottom: 8 }
const selectStyle= { padding: '10px 12px', border: '1px solid #dfe0df', borderRadius: 8,
                     fontSize: 14, color: '#0e0b08', background: '#fff',
                     marginBottom: 16, minWidth: 200 }
const seatWrap   = { background: '#1a1410', borderRadius: 12, padding: '24px 16px', marginBottom: 16 }
const screenBar  = { textAlign: 'center', padding: 6, background: '#2e2820',
                     color: '#4f4537', fontSize: 12, letterSpacing: 4, marginBottom: 20, borderRadius: 4 }
const rowStyle   = { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }
const rowLabel   = { width: 18, fontSize: 11, color: '#4f4537', textAlign: 'center', flexShrink: 0 }
const seatBtn    = { width: 24, height: 24, borderRadius: 4, border: 'none', flexShrink: 0 }
const editPanel  = { background: '#fff', borderRadius: 12, padding: '16px 20px',
                     boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const toggleBtn  = { padding: '10px 20px', background: '#ffb800', color: '#4c1c00',
                     border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

export default SeatEditPage
