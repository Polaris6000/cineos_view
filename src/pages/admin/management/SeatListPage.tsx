/**
 * SeatListPage.tsx — 좌석 목록 (관리자)
 *
 * 기능:
 *  1. 상영관 선택 드롭다운 (실 API 데이터)
 *  2. 좌석 타입별 통계 카드 (NORMAL / RECLINER)
 *  3. 좌석 배치도 — 타입을 색상으로 구분
 *
 * 데이터 흐름:
 *  - GET /api/admin/theater/list → TheaterDTO[] (rows, cols, hasRecliner 포함)
 *  - TheaterDTO 기반으로 rows×cols 좌석 배치 생성
 *  - hasRecliner=true 이면 마지막 행 → RECLINER (나머지 NORMAL)
 *
 * 좌석 색상 규칙 (타입 기준):
 *  - NORMAL   : 파란색 계열  (#2563eb)
 *  - RECLINER : 보라색 계열  (#7c3aed)
 */
import { useState, useEffect, useMemo } from 'react'
import apiClient, { type TheaterDTO } from '../../../api/apiClient'

/* ── 타입 정의 ──────────────────────────────────────────────── */

/** 관리자 좌석 배치 아이템 */
interface SeatItem {
  id:       string               // "A1", "B3"
  row:      string               // 행 라벨 (A~Z)
  col:      number               // 열 번호
  seatType: 'NORMAL' | 'RECLINER'
}

/* ── 색상 테이블 ────────────────────────────────────────────── */
const SEAT_TYPE_COLOR: Record<SeatItem['seatType'], { bg: string; label: string }> = {
  NORMAL:   { bg: '#2563eb', label: '일반' },
  RECLINER: { bg: '#7c3aed', label: '리클라이너' },
}

/* ── 좌석 배치 생성 ─────────────────────────────────────────── */
/**
 * TheaterDTO 기반 좌석 배치 생성 (SeatPage.tsx의 generateRealSeats와 동일 로직)
 *
 * @param theater - 백엔드 상영관 DTO
 *   - rows/cols: 0이면 fallback 10×10
 *   - hasRecliner: true → 마지막 행만 RECLINER
 */
function generateAdminSeats(theater: TheaterDTO): SeatItem[] {
  // rows/cols가 0이면 fallback 10×10 (백엔드 미설정 대비)
  const ROW_COUNT = theater.rows > 0 ? theater.rows : 10
  const COL_COUNT = theater.cols > 0 ? theater.cols : 10
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const seats: SeatItem[] = []

  for (let r = 0; r < ROW_COUNT; r++) {
    // 마지막 행이고 리클라이너 관이면 RECLINER, 나머지는 NORMAL
    const isLastRow  = r === ROW_COUNT - 1
    const seatType: SeatItem['seatType'] = (theater.hasRecliner && isLastRow) ? 'RECLINER' : 'NORMAL'

    for (let c = 1; c <= COL_COUNT; c++) {
      seats.push({
        id:   `${rowLabels[r]}${c}`,
        row:  rowLabels[r],
        col:  c,
        seatType,
      })
    }
  }
  return seats
}

/* ── 컴포넌트 ───────────────────────────────────────────────── */

function SeatListPage() {
  /* ── API 상태 ── */
  const [theaters,   setTheaters]   = useState<TheaterDTO[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // 현재 선택된 상영관 번호
  const [selectedNo, setSelectedNo] = useState<number | null>(null)

  /**
   * 상영관 목록 조회
   * GET /api/admin/theater/list → TheaterDTO[] (rows, cols, hasRecliner 포함)
   */
  useEffect(() => {
    const fetchTheaters = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await apiClient.get<TheaterDTO[]>('/admin/theater/list')
        // no 순 정렬
        const sorted = [...res.data].sort((a, b) => a.no - b.no)
        setTheaters(sorted)
        // 첫 번째 상영관 기본 선택
        if (sorted.length > 0) setSelectedNo(sorted[0].no)
      } catch (e) {
        console.error('[SeatListPage] 상영관 목록 로드 실패', e)
        setError('상영관 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    void fetchTheaters()
  }, [])

  /* ── 선택된 상영관 + 좌석 배치 계산 ── */
  // selectedNo 기반으로 TheaterDTO 찾기
  const selectedTheater = useMemo(
    () => theaters.find((t) => t.no === selectedNo) ?? null,
    [theaters, selectedNo],
  )

  // 선택 상영관 기반 좌석 배치 생성 (theater가 바뀔 때만 재계산)
  const seats = useMemo<SeatItem[]>(
    () => (selectedTheater ? generateAdminSeats(selectedTheater) : []),
    [selectedTheater],
  )

  /* ── 통계 계산 ── */
  const statByType = useMemo(() => ({
    NORMAL:   seats.filter((s) => s.seatType === 'NORMAL').length,
    RECLINER: seats.filter((s) => s.seatType === 'RECLINER').length,
  }), [seats])

  // 행 목록 (중복 제거, 순서 유지)
  const rows = useMemo(() => [...new Set(seats.map((s) => s.row))], [seats])

  /* ── 로딩 / 에러 ── */
  if (loading) {
    return (
      <div>
        <h2 style={pageTitle}>좌석 목록</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 style={pageTitle}>좌석 목록</h2>
        <div style={errorBanner}>{error}</div>
      </div>
    )
  }

  if (theaters.length === 0) {
    return (
      <div>
        <h2 style={pageTitle}>좌석 목록</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>등록된 상영관이 없습니다.</p>
      </div>
    )
  }

  /* ── 메인 렌더 ── */
  return (
    <div>
      <h2 style={pageTitle}>좌석 목록</h2>

      {/* ── 상영관 선택 드롭다운 ── */}
      <select
        value={selectedNo ?? ''}
        onChange={(e) => setSelectedNo(Number(e.target.value))}
        style={selectStyle}
      >
        {theaters.map((t) => {
          // rows/cols가 0이면 fallback 10×10 표시
          const r = t.rows > 0 ? t.rows : 10
          const c = t.cols > 0 ? t.cols : 10
          return (
            <option key={t.no} value={t.no}>
              {t.no}관 ({r * c}석{t.hasRecliner ? ' · 리클라이너' : ''})
            </option>
          )
        })}
      </select>

      {/* ── 선택 상영관 메타 정보 ── */}
      {selectedTheater && (
        <div style={metaRow}>
          <span style={metaChip}>
            {selectedTheater.rows > 0 ? selectedTheater.rows : 10}행 ×{' '}
            {selectedTheater.cols > 0 ? selectedTheater.cols : 10}열
          </span>
          {selectedTheater.hasRecliner && (
            <span style={{ ...metaChip, background: 'rgba(124,58,237,0.15)', color: '#7c3aed', borderColor: '#7c3aed' }}>
              리클라이너 포함
            </span>
          )}
          <span style={metaChip}>총 {seats.length}석</span>
        </div>
      )}

      {/* ── 타입별 통계 카드 ── */}
      <p style={sectionLabel}>좌석 타입</p>
      <div style={statsRow}>
        {(Object.keys(SEAT_TYPE_COLOR) as SeatItem['seatType'][]).map((type) => (
          <div key={type} style={statCard}>
            {/* 타입 색상 인디케이터 */}
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: SEAT_TYPE_COLOR[type].bg,
              marginBottom: 6,
            }} />
            <p style={statLabel}>{SEAT_TYPE_COLOR[type].label}</p>
            <p style={{ ...statValue, color: SEAT_TYPE_COLOR[type].bg }}>
              {statByType[type]}석
            </p>
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
        {(Object.keys(SEAT_TYPE_COLOR) as SeatItem['seatType'][]).map((type) => (
          <div key={type} style={legendItem}>
            <div style={{ width: 16, height: 16, background: SEAT_TYPE_COLOR[type].bg, borderRadius: 3 }} />
            <span style={legendText}>{SEAT_TYPE_COLOR[type].label}</span>
          </div>
        ))}
      </div>

      {/* ── 좌석 배치도 ── */}
      <div style={seatWrap}>
        <div style={screenBar}>SCREEN</div>
        <div style={{ overflowX: 'auto' }}>
          {rows.map((row) => (
            <div key={row} style={rowStyle}>
              {/* 행 레이블 (왼쪽) */}
              <span style={rowLabel}>{row}</span>

              {seats
                .filter((s) => s.row === row)
                .sort((a, b) => a.col - b.col)
                .map((s) => (
                  <div
                    key={s.id}
                    title={`${s.id} — ${SEAT_TYPE_COLOR[s.seatType].label}`}
                    style={{
                      ...seatStyle,
                      background: SEAT_TYPE_COLOR[s.seatType].bg,
                    }}
                  />
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

/* ── 스타일 ─────────────────────────────────────────────────── */
const pageTitle: React.CSSProperties    = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  marginBottom: 12, minWidth: 220,
}
const metaRow: React.CSSProperties     = { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }
const metaChip: React.CSSProperties    = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: 'rgba(99,102,241,0.1)', color: 'var(--color-brand-default)',
  border: '1px solid var(--color-brand-default)',
}
const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 8, marginTop: 0,
}
const statsRow: React.CSSProperties    = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }
const statCard: React.CSSProperties    = {
  flex: 1, minWidth: 90, background: 'var(--bg-surface)', borderRadius: 10,
  padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid var(--border-subtle)',
}
const statLabel: React.CSSProperties   = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, margin: 0 }
const statValue: React.CSSProperties   = { fontSize: 20, fontWeight: 700, margin: 0, marginTop: 4 }
const legend: React.CSSProperties      = { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }
const legendItem: React.CSSProperties  = { display: 'flex', alignItems: 'center', gap: 6 }
const legendText: React.CSSProperties  = { fontSize: 12, color: 'var(--text-secondary)' }
const seatWrap: React.CSSProperties    = { background: '#111827', borderRadius: 12, padding: '24px 16px' }
const screenBar: React.CSSProperties   = {
  textAlign: 'center', padding: '6px', background: '#1f2937',
  color: '#6b7280', fontSize: 12, letterSpacing: 4,
  marginBottom: 20, borderRadius: 4,
}
const rowStyle: React.CSSProperties    = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }
const rowLabel: React.CSSProperties    = { width: 18, fontSize: 11, color: '#6b7280', textAlign: 'center', flexShrink: 0 }
const seatStyle: React.CSSProperties   = { width: 22, height: 22, borderRadius: 4, flexShrink: 0 }
const errorBanner: React.CSSProperties = {
  padding: '12px 16px', background: 'var(--color-error-bg)',
  border: '1px solid var(--color-error-main)', borderRadius: 8,
  color: 'var(--color-error-text)', fontSize: 14,
}

export default SeatListPage
