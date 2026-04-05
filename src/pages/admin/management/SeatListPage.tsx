/**
 * SeatListPage.tsx — 좌석 목록 (관리자)
 *
 * 기능:
 *  1. 상영관 선택 드롭다운
 *  2. 좌석 타입별 통계 카드 (NORMAL / VIP / RECLINER / COUPLE)
 *  3. 상태별 통계 카드 (빈 좌석 / 매진 / 이용불가)
 *  4. 좌석 배치도 — 타입 + 상태를 색상으로 구분
 *
 * 좌석 색상 규칙 (타입 기준):
 *  - NORMAL   : 파란색 계열  (#2563eb / 어두운 #1e3a8a)
 *  - VIP      : 황금색 계열  (#d97706 / 어두운 #92400e)
 *  - RECLINER : 보라색 계열  (#7c3aed / 어두운 #4c1d95)
 *  - COUPLE   : 분홍색 계열  (#db2777 / 어두운 #831843)
 * 상태 오버레이:
 *  - empty    : 타입 기본 색상 (위 색상 그대로)
 *  - sold_out : 타입 어두운 색상 + 텍스트 '✕'
 *  - disabled : 짙은 회색 (#374151), 타입 무시
 *
 * TODO: GET /api/admin/theaters/:id/seats 연동
 */
import { useState } from 'react'
import { MOCK_THEATERS, type Seat } from '../../../api/mockData'
// store 참조 — 어드민 편집 내용 반영
import { getSeatLayout } from '../../../store/seatLayoutStore'

/* ── 타입별 색상 테이블 (VIP 없음 — 일반/리클라이너/커플만) ── */
const SEAT_TYPE_COLOR: Record<Seat['seatType'], { empty: string; soldOut: string; label: string }> = {
  NORMAL:   { empty: '#2563eb', soldOut: '#1e3a8a', label: '일반석' },
  RECLINER: { empty: '#7c3aed', soldOut: '#4c1d95', label: '리클라이너석' },
  COUPLE:   { empty: '#db2777', soldOut: '#831843', label: '커플석' },
}

/** 좌석 하나의 배경색 결정 */
function getSeatBg(seat: Seat): string {
  if (seat.status === 'disabled') return '#374151'
  const colors = SEAT_TYPE_COLOR[seat.seatType]
  return seat.status === 'sold_out' ? colors.soldOut : colors.empty
}

function SeatListPage() {
  const [theaterId, setTheaterId] = useState<number>(MOCK_THEATERS[0]?.id ?? 1)
  const theater = MOCK_THEATERS.find((t) => t.id === theaterId)

  // store에서 좌석 배치 가져오기 — 어드민 편집 내용 반영 (없으면 기본 배치)
  const seats = theater ? getSeatLayout(theater.id) : []

  /* ── 통계 계산 ── */
  // 상태별
  const statByStatus = {
    empty:    seats.filter((s) => s.status === 'empty').length,
    soldOut:  seats.filter((s) => s.status === 'sold_out').length,
    disabled: seats.filter((s) => s.status === 'disabled').length,
  }
  // 타입별 (disabled 제외, VIP 없음)
  const statByType = {
    NORMAL:   seats.filter((s) => s.seatType === 'NORMAL'   && s.status !== 'disabled').length,
    RECLINER: seats.filter((s) => s.seatType === 'RECLINER' && s.status !== 'disabled').length,
    COUPLE:   seats.filter((s) => s.seatType === 'COUPLE'   && s.status !== 'disabled').length,
  }

  // 행 목록 (중복 제거, 순서 유지)
  const rows = [...new Set(seats.map((s) => s.row))]

  return (
    <div>
      <h2 style={pageTitle}>좌석 목록</h2>

      {/* ── 상영관 선택 ── */}
      <select
        value={theaterId}
        onChange={(e) => setTheaterId(Number(e.target.value))}
        style={selectStyle}
      >
        {MOCK_THEATERS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.hasRecliner ? '리클라이너' : '일반'} / {t.totalSeats}석)
          </option>
        ))}
      </select>

      {/* ── 타입별 통계 카드 ── */}
      <p style={sectionLabel}>좌석 타입</p>
      <div style={statsRow}>
        {(Object.keys(SEAT_TYPE_COLOR) as Seat['seatType'][]).map((type) => (
          <div key={type} style={statCard}>
            {/* 타입 색상 인디케이터 */}
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: SEAT_TYPE_COLOR[type].empty,
              marginBottom: 6,
            }} />
            <p style={statLabel}>{SEAT_TYPE_COLOR[type].label}</p>
            <p style={{ ...statValue, color: SEAT_TYPE_COLOR[type].empty }}>
              {statByType[type]}석
            </p>
          </div>
        ))}
      </div>

      {/* ── 상태별 통계 카드 ── */}
      <p style={sectionLabel}>좌석 상태</p>
      <div style={statsRow}>
        {[
          { label: '빈 좌석',  value: statByStatus.empty,    color: '#16a34a' },
          { label: '매진',     value: statByStatus.soldOut,  color: '#e03c3c' },
          { label: '이용불가', value: statByStatus.disabled, color: '#6b7280' },
        ].map((s) => (
          <div key={s.label} style={statCard}>
            <p style={statLabel}>{s.label}</p>
            <p style={{ ...statValue, color: s.color }}>{s.value}석</p>
          </div>
        ))}
        {/* 전체 합계 */}
        <div style={statCard}>
          <p style={statLabel}>전체</p>
          <p style={{ ...statValue, color: '#0e0b08' }}>{seats.length}석</p>
        </div>
      </div>

      {/* ── 범례 ── */}
      <div style={legend}>
        {/* 타입 범례 */}
        {(Object.keys(SEAT_TYPE_COLOR) as Seat['seatType'][]).map((type) => (
          <div key={type} style={legendItem}>
            <div style={{ width: 16, height: 16, background: SEAT_TYPE_COLOR[type].empty, borderRadius: 3 }} />
            <span style={legendText}>{SEAT_TYPE_COLOR[type].label}</span>
          </div>
        ))}
        {/* 구분선 */}
        <div style={{ width: 1, background: '#dfe0df', margin: '0 4px' }} />
        {/* 상태 범례 */}
        <div style={legendItem}>
          <div style={{ width: 16, height: 16, background: '#374151', borderRadius: 3 }} />
          <span style={legendText}>이용불가</span>
        </div>
        <div style={legendItem}>
          {/* sold_out 예시: 진한 색 + ✕ */}
          <div style={{
            width: 16, height: 16, background: '#1e3a8a', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, color: '#fff', fontWeight: 700,
          }}>✕</div>
          <span style={legendText}>매진 (진한색)</span>
        </div>
      </div>

      {/* ── 좌석 배치도 ── */}
      <div style={seatWrap}>
        <div style={screenBar}>SCREEN</div>
        <div style={{ overflowX: 'auto' }}>
          {rows.map((row) => (
            <div key={row} style={rowStyle}>
              {/* 행 레이블 (왼쪽) */}
              <span style={rowLabel}>{row}</span>

              {seats.filter((s) => s.row === row).map((s) => (
                <div
                  key={s.id}
                  title={`${s.id} — ${SEAT_TYPE_COLOR[s.seatType].label} / ${
                    s.status === 'empty' ? '빈 좌석' :
                    s.status === 'sold_out' ? '매진' : '이용불가'
                  }`}
                  style={{
                    ...seatStyle,
                    background: getSeatBg(s),
                    // 이용불가 좌석: 투명도 낮춤
                    opacity: s.status === 'disabled' ? 0.4 : 1,
                    // 매진 시 미세 테두리로 구분
                    border: s.status === 'sold_out' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  }}
                >
                  {/* 매진 표시 ✕ */}
                  {s.status === 'sold_out' && (
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>✕</span>
                  )}
                </div>
              ))}

              {/* 행 레이블 (오른쪽) */}
              <span style={rowLabel}>{row}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle    = { fontSize: 22, fontWeight: 800, color: '#0e0b08', marginBottom: 16 }
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  marginBottom: 20, minWidth: 220,
}
const sectionLabel = { fontSize: 12, fontWeight: 700, color: '#6b7280',
                       textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                       marginBottom: 8, marginTop: 0 }
const statsRow     = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }
const statCard: React.CSSProperties = {
  flex: 1, minWidth: 90, background: '#fff', borderRadius: 10,
  padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const statLabel    = { fontSize: 12, color: '#9ca3af', marginBottom: 4, margin: 0 }
const statValue    = { fontSize: 20, fontWeight: 700, margin: 0, marginTop: 4 }
const legend       = { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const,
                       alignItems: 'center' }
const legendItem   = { display: 'flex', alignItems: 'center', gap: 6 }
const legendText   = { fontSize: 12, color: '#4f4537' }
const seatWrap     = { background: '#111827', borderRadius: 12, padding: '24px 16px' }
const screenBar: React.CSSProperties = {
  textAlign: 'center', padding: '6px', background: '#1f2937',
  color: '#6b7280', fontSize: 12, letterSpacing: 4,
  marginBottom: 20, borderRadius: 4,
}
const rowStyle     = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }
const rowLabel: React.CSSProperties = {
  width: 18, fontSize: 11, color: '#6b7280', textAlign: 'center', flexShrink: 0,
}
const seatStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'default', transition: 'opacity 0.2s',
}

export default SeatListPage
