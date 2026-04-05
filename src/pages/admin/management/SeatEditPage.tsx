/**
 * SeatEditPage.tsx — 좌석 배치 편집 (관리자)
 *
 * 기능:
 *  1. 상영관 선택
 *  2. 좌석 배치도 표시 (타입·상태 색상 구분)
 *  3. 좌석 클릭 → 오른쪽 편집 패널에서 타입/상태 변경
 *  4. 저장 → seatLayoutStore에 반영 → 고객 SeatPage와 연동
 *  5. 초기화 → generateSeats 기본값으로 복원
 *
 * 좌석 타입: NORMAL(일반) / RECLINER(리클라이너) / COUPLE(커플)
 * 좌석 상태: empty(빈) / disabled(이용불가) — sold_out은 예매 시스템에서 관리
 *
 * TODO: PATCH /api/admin/theaters/:id/seats 연동
 */
import { useState, useCallback } from 'react'
import { MOCK_THEATERS, SEAT_TYPE_LABEL, type Seat } from '../../../api/mockData'
import { getSeatLayout, setSeatLayout, resetSeatLayout } from '../../../store/seatLayoutStore'

/** 좌석 타입별 색상 (어드민 어두운 배경 기준) */
const TYPE_COLORS: Record<Seat['seatType'], { bg: string; border: string }> = {
  NORMAL:   { bg: '#2563eb', border: '#3b82f6' },
  RECLINER: { bg: '#7c3aed', border: '#8b5cf6' },
  COUPLE:   { bg: '#db2777', border: '#ec4899' },
}

function SeatEditPage() {
  const [theaterId, setTheaterId] = useState<number>(MOCK_THEATERS[0]?.id ?? 1)

  // 로컬 편집 상태 — store에서 불러온 뒤 수정
  const [seats, setSeats] = useState<Seat[]>(() => getSeatLayout(MOCK_THEATERS[0]?.id ?? 1))

  // 선택된 좌석 (편집 패널 표시용)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 저장/초기화 피드백 메시지
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null)

  const selectedSeat = seats.find((s) => s.id === selectedId) ?? null

  /** 상영관 변경 — store에서 해당 관의 배치 로드 */
  const handleTheaterChange = (id: number) => {
    setTheaterId(id)
    setSeats(getSeatLayout(id))
    setSelectedId(null)
    setMsg(null)
  }

  /** 좌석 클릭 — sold_out은 어드민도 직접 편집 불가 */
  const handleSeatClick = useCallback((seat: Seat) => {
    if (seat.status === 'sold_out') return
    setSelectedId((prev) => (prev === seat.id ? null : seat.id)) // 같은 좌석 재클릭 시 닫힘
  }, [])

  /** 선택된 좌석의 타입 변경 */
  const handleTypeChange = (type: Seat['seatType']) => {
    if (!selectedId) return
    setSeats((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, seatType: type } : s)),
    )
    // 상태 동기화 — disabled 상태였으면 유지, sold_out은 있을 수 없음
    setSelectedId(selectedId) // 선택 유지 (리렌더 트리거)
  }

  /** 선택된 좌석의 이용가능/불가 토글 */
  const handleStatusToggle = () => {
    if (!selectedId) return
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id !== selectedId) return s
        return { ...s, status: s.status === 'disabled' ? 'empty' : 'disabled' }
      }),
    )
  }

  /** 저장 — seatLayoutStore에 반영 */
  const handleSave = () => {
    setSeatLayout(theaterId, seats)
    showMsg('좌석 배치가 저장되었습니다. 고객 좌석 선택 화면에 즉시 반영됩니다.', 'success')
    // TODO: PATCH /api/admin/theaters/:id/seats { seats }
  }

  /** 초기화 — generateSeats 기본값으로 복원 */
  const handleReset = () => {
    if (!window.confirm('이 상영관의 좌석 배치를 초기 기본값으로 되돌리시겠습니까?')) return
    const defaultSeats = resetSeatLayout(theaterId)
    setSeats(defaultSeats)
    setSelectedId(null)
    showMsg('기본 배치로 초기화되었습니다.', 'info')
  }

  const showMsg = (text: string, type: 'success' | 'info') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const rows = [...new Set(seats.map((s) => s.row))]

  return (
    <div>
      <h2 style={pageTitle}>좌석 배치 편집</h2>
      <p style={pageDesc}>
        좌석을 클릭해 타입(일반/리클라이너/커플)과 이용 가능 여부를 변경하세요.
        저장하면 고객 좌석 선택 화면에 즉시 반영됩니다.
      </p>

      {/* ── 상영관 선택 ── */}
      <select
        value={theaterId}
        onChange={(e) => handleTheaterChange(Number(e.target.value))}
        style={selectStyle}
      >
        {MOCK_THEATERS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.hasRecliner ? '리클라이너관' : '일반관'} ({t.rows}행 × {t.cols}열 / {t.totalSeats}석)
          </option>
        ))}
      </select>

      {/* 피드백 메시지 */}
      {msg && (
        <div style={{
          ...msgBox,
          background: msg.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
          borderColor: msg.type === 'success' ? 'var(--color-success-main)' : 'var(--color-info-text)',
          color: msg.type === 'success' ? 'var(--color-success-main)' : 'var(--color-info-dark)',
        }}>
          {msg.type === 'success' ? '✅' : 'ℹ️'} {msg.text}
        </div>
      )}

      {/* ── 메인 레이아웃: 좌석 배치도 + 편집 패널 ── */}
      <div style={mainLayout}>

        {/* 좌석 배치도 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 범례 */}
          <div style={legend}>
            {(Object.keys(TYPE_COLORS) as Seat['seatType'][]).map((type) => (
              <div key={type} style={legendItem}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: TYPE_COLORS[type].bg }} />
                <span style={legendText}>{SEAT_TYPE_LABEL[type]}</span>
              </div>
            ))}
            <div style={legendItem}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#374151' }} />
              <span style={legendText}>이용불가</span>
            </div>
            <div style={legendItem}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#1f2937', border: '1px solid #374151' }} />
              <span style={legendText}>매진(수정불가)</span>
            </div>
          </div>

          {/* 배치도 */}
          <div style={seatWrap}>
            <div style={screenBar}>SCREEN</div>
            <div style={{ overflowX: 'auto' }}>
              {rows.map((row) => (
                <div key={row} style={rowStyle}>
                  <span style={rowLabel}>{row}</span>

                  {seats
                    .filter((s) => s.row === row)
                    .map((s) => {
                      const isSelected = s.id === selectedId
                      const bg =
                        s.status === 'disabled' ? '#374151' :
                        s.status === 'sold_out'  ? '#1f2937' :
                        TYPE_COLORS[s.seatType].bg

                      return (
                        <button
                          key={s.id}
                          title={`${s.id} — ${SEAT_TYPE_LABEL[s.seatType]} / ${
                            s.status === 'empty' ? '빈 좌석' :
                            s.status === 'sold_out' ? '매진' : '이용불가'
                          }`}
                          onClick={() => handleSeatClick(s)}
                          style={{
                            ...seatBtn,
                            background: bg,
                            border: isSelected
                              ? '2px solid #ffb800'
                              : s.status === 'sold_out'
                              ? '1px solid #374151'
                              : `1px solid ${TYPE_COLORS[s.seatType]?.border ?? '#555'}`,
                            opacity: s.status === 'disabled' ? 0.5 : s.status === 'sold_out' ? 0.35 : 1,
                            cursor: s.status === 'sold_out' ? 'not-allowed' : 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            zIndex: isSelected ? 2 : 1,
                            position: 'relative',
                          }}
                          disabled={s.status === 'sold_out'}
                        />
                      )
                    })}

                  <span style={rowLabel}>{row}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 저장 / 초기화 버튼 */}
          <div style={actionRow}>
            <button onClick={handleReset} style={resetBtn}>초기화</button>
            <button onClick={handleSave}  style={saveBtn}>저장 (고객 화면 반영)</button>
          </div>
        </div>

        {/* ── 편집 패널 (좌석 선택 시) ── */}
        <div style={panel}>
          {selectedSeat ? (
            <>
              <p style={panelTitle}>좌석 {selectedSeat.id}</p>

              {/* 타입 선택 */}
              <p style={panelLabel}>좌석 타입</p>
              <div style={typeGroup}>
                {(Object.keys(SEAT_TYPE_LABEL) as Seat['seatType'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    style={{
                      ...typeBtn,
                      background: selectedSeat.seatType === type ? TYPE_COLORS[type].bg : 'var(--bg-base)',
                      color: selectedSeat.seatType === type ? '#fff' : 'var(--text-secondary)',
                      border: selectedSeat.seatType === type
                        ? `1px solid ${TYPE_COLORS[type].border}`
                        : '1px solid var(--border-default)',
                    }}
                  >
                    {SEAT_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>

              {/* 이용 가능/불가 */}
              <p style={panelLabel}>이용 상태</p>
              <div style={statusRow}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: selectedSeat.status === 'disabled' ? 'var(--color-error-text)' : 'var(--color-success-main)',
                }}>
                  {selectedSeat.status === 'disabled' ? '이용불가' : '이용가능'}
                </span>
                <button
                  onClick={handleStatusToggle}
                  style={{
                    ...toggleBtn,
                    background: selectedSeat.status === 'disabled'
                      ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                    color: selectedSeat.status === 'disabled'
                      ? 'var(--color-success-main)' : 'var(--color-error-text)',
                    borderColor: selectedSeat.status === 'disabled'
                      ? 'var(--color-success-main)' : 'var(--color-error-text)',
                  }}
                >
                  {selectedSeat.status === 'disabled' ? '이용 가능으로 변경' : '이용 불가로 변경'}
                </button>
              </div>

              <p style={panelHint}>변경 후 반드시 "저장"을 눌러야 고객 화면에 반영됩니다.</p>
            </>
          ) : (
            <p style={panelEmpty}>좌석을 클릭하면<br/>편집 옵션이 표시됩니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }
const pageDesc: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  marginBottom: 16, minWidth: 300,
}
const msgBox: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 600,
  marginBottom: 16,
}

const mainLayout: React.CSSProperties = {
  display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
}

// 범례
const legend: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }
const legendItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5 }
const legendText = { fontSize: 12, color: 'var(--text-secondary)' }

// 배치도
const seatWrap: React.CSSProperties = { background: '#111827', borderRadius: 12, padding: '20px 14px' }
const screenBar: React.CSSProperties = {
  textAlign: 'center', padding: '5px', background: '#1f2937',
  color: '#6b7280', fontSize: 12, letterSpacing: 4, marginBottom: 16, borderRadius: 4,
}
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }
const rowLabel: React.CSSProperties = { width: 18, fontSize: 11, color: '#6b7280', textAlign: 'center', flexShrink: 0 }
const seatBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
  transition: 'transform 0.1s, border 0.1s',
}

// 저장/초기화
const actionRow: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }
const resetBtn: React.CSSProperties = {
  padding: '10px 18px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
}
const saveBtn: React.CSSProperties = {
  padding: '10px 20px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

// 편집 패널
const panel: React.CSSProperties = {
  width: 220, flexShrink: 0,
  background: 'var(--bg-surface)', borderRadius: 12, padding: '18px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'sticky', top: 80,
}
const panelTitle = { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }
const panelLabel = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8 }
const typeGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }
const typeBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  textAlign: 'left', transition: 'all 0.1s',
}
const statusRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }
const toggleBtn: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  border: '1px solid', cursor: 'pointer',
}
const panelHint = { fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }
const panelEmpty: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8, marginTop: 20,
}

export default SeatEditPage
