/**
 * SeatListPage.tsx — 좌석 목록 (관리자)
 *
 * 기능:
 *  1. 상영관 선택 드롭다운
 *  2. 좌석 타입별 통계 카드 (NORMAL / RECLINER)
 *  3. 상태별 통계 카드 (빈 좌석 / 매진)
 *  4. 좌석 배치도 — 타입 + 상태를 색상으로 구분
 *
 * 좌석 색상 규칙 (타입 기준):
 *  - NORMAL   : 파란색 계열  (#2563eb / 어두운 #1e3a8a)
 *  - RECLINER : 보라색 계열  (#7c3aed / 어두운 #4c1d95)
 * 상태 오버레이:
 *  - empty    : 타입 기본 색상
 *  - sold_out : 타입 어두운 색상 + 큰 '✕' 표시 (고대비)
 *
 * TODO: GET /api/admin/theaters/:id/seats 연동
 */
import { useState } from 'react'
import { MOCK_THEATERS, type Seat } from '../../../api/mockData'
// store 참조 — 어드민 편집 내용 반영
import { getSeatLayout } from '../../../store/seatLayoutStore'

/* ── 타입별 색상 테이블 ── */
const SEAT_TYPE_COLOR: Record<Seat['seatType'], { empty: string; soldOut: string; label: string }> = {
  NORMAL:   { empty: '#2563eb', soldOut: '#1e3a8a', label: '일반' },
  RECLINER: { empty: '#7c3aed', soldOut: '#4c1d95', label: '리클라이너' },
}

/** 좌석 하나의 배경색 결정 */
function getSeatBg(seat: Seat): string {
  const colors = SEAT_TYPE_COLOR[seat.seatType]
  return seat.status === 'sold_out' ? colors.soldOut : colors.empty
}

function SeatListPage() {
  const [theaterId, setTheaterId] = useState<number>(MOCK_THEATERS[0]?.id ?? 1)
  const theater = MOCK_THEATERS.find((t) => t.id === theaterId)

  // store에서 좌석 배치 가져오기 — 어드민 편집 내용 반영 (없으면 기본 배치)
  // getSeatLayout(theaterId, soldOutSeats) — 두 번째 인자: 예약완료 좌석 ID 배열 (없으면 빈 배열)
  const seats = theater ? getSeatLayout(theater.id, []) : []

  /* ── 통계 계산 ── */
  // 상태별 (disabled 없음)
  const statByStatus = {
    empty:   seats.filter((s) => s.status === 'empty').length,
    soldOut: seats.filter((s) => s.status === 'sold_out').length,
  }
  // 타입별 통계
  const statByType = {
    NORMAL:   seats.filter((s) => s.seatType === 'NORMAL').length,
    RECLINER: seats.filter((s) => s.seatType === 'RECLINER').length,
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
            {t.name} ({t.totalSeats}석)
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
          { label: '빈 좌석', value: statByStatus.empty,   color: 'var(--color-success-main)' },
          { label: '매진',    value: statByStatus.soldOut, color: 'var(--color-error-main)' },
        ].map((s) => (
          <div key={s.label} style={statCard}>
            <p style={statLabel}>{s.label}</p>
            <p style={{ ...statValue, color: s.color }}>{s.value}석</p>
          </div>
        ))}
        {/* 전체 합계 */}
        <div style={statCard}>
          <p style={statLabel}>전체</p>
          <p style={{ ...statValue, color: 'var(--text-primary)' }}>{seats.length}석</p>
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
        <div style={{ width: 1, background: 'var(--border-default)', margin: '0 4px' }} />
        {/* 매진 범례 */}
        <div style={legendItem}>
          <div style={{
            width: 16, height: 16, background: '#1e3a8a', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#ffffff', fontWeight: 800, lineHeight: 1,
          }}>✕</div>
          <span style={legendText}>매진</span>
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
                    s.status === 'empty' ? '빈 좌석' : '매진'
                  }`}
                  style={{
                    ...seatStyle,
                    background: getSeatBg(s),
                    // 매진 좌석: 테두리로 구분
                    border: s.status === 'sold_out' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  }}
                >
                  {/* 매진 표시 ✕ — 고대비로 잘 보이게 */}
                  {s.status === 'sold_out' && (
                    <span style={{ fontSize: 14, color: '#ffffff', fontWeight: 800, lineHeight: 1 }}>✕</span>
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

/* ── 스타일 (다크모드 CSS 변수 사용) ── */
const pageTitle    = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  marginBottom: 20, minWidth: 220,
}
const sectionLabel = {
  fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  marginBottom: 8, marginTop: 0,
}
const statsRow     = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }
const statCard: React.CSSProperties = {
  flex: 1, minWidth: 90, background: 'var(--bg-surface)', borderRadius: 10,
  padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid var(--border-subtle)',
}
const statLabel    = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, margin: 0 }
const statValue    = { fontSize: 20, fontWeight: 700, margin: 0, marginTop: 4 }
const legend       = {
  display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const, alignItems: 'center',
}
const legendItem   = { display: 'flex', alignItems: 'center', gap: 6 }
const legendText   = { fontSize: 12, color: 'var(--text-secondary)' }
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
