/**
 * SeatPage.jsx — 좌석 선택 (UC-03 4단계)
 *
 * 동작:
 *  - 상영관 좌석 배치도 표시 (행 라벨 + 좌석 그리드)
 *  - 좌석 상태: empty(빈자리) | sold_out(매진) | disabled(사용불가) | selected(내가 선택)
 *  - 인원 수만큼만 개별 선택 가능 (클릭 토글)
 *  - 좌석 타입별 단가 적용 (일반:5000 / VIP:7000 / 리클라이너:10000 / 커플:15000)
 *  - 청소년 할인 2000원 반영
 *  - 결제하기 → PaymentPage 로 이동
 *
 * 변경사항:
 *  - 연속 좌석 강제 선택 제거 → 개별 토글 선택으로 변경
 *  - 인원 수 초과 시 선택 불가 (안내 메시지 표시)
 *
 * state 수신: movieId, movieTitle, schedule, persons, totalPersons
 * TODO: GET /api/seats?scheduleId= 연동 + WebSocket STOMP 구독
 */
import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Info, CreditCard } from 'lucide-react'
import { MOCK_THEATERS, SEAT_PRICES, SEAT_TYPE_LABEL, PERSON_TYPES } from '../../api/mockData'
// store에서 좌석 배치 가져오기 — 어드민 SeatEditPage에서 저장한 내용 반영
import { getSeatLayout } from '../../store/seatLayoutStore'

function SeatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state    = location.state ?? {}

  const { movieTitle, schedule, persons = {}, totalPersons = 0 } = state

  // state 없으면 홈으로
  if (!schedule) {
    navigate('/')
    return null
  }

  // 해당 상영관 정보 조회
  const theater = MOCK_THEATERS.find((t) => t.id === schedule.theaterId) ?? MOCK_THEATERS[0]

  /**
   * 좌석 목록 생성
   * seatLayoutStore.getSeatLayout(theaterId) 우선 — 어드민이 편집 후 저장한 배치 반영
   * store에 없으면 generateSeats(theater) 기본 배치 자동 생성
   * TODO: GET /api/seats?scheduleId=schedule.scheduleId 로 교체
   */
  // store에서 최신 좌석 배치 가져오기 — 읽기 전용 (상태 변경 없음)
  const seats = useMemo(
    () => getSeatLayout(theater.id),
    [theater.id]
  )

  // 내가 선택한 좌석 id 목록
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  /**
   * 좌석 클릭 처리 (개별 토글 방식)
   *
   * - 매진/비활성 좌석은 클릭 무시
   * - 이미 선택된 좌석 클릭 → 선택 해제 (토글)
   * - 선택되지 않은 좌석 클릭:
   *     → 이미 totalPersons 개 선택됐으면 무시 (안내 메시지 표시)
   *     → 아니면 선택 목록에 추가
   */
  const handleSeatClick = (seat) => {
    if (seat.status === 'sold_out' || seat.status === 'disabled') return

    if (selectedIds.includes(seat.id)) {
      // 이미 선택된 좌석 → 선택 해제
      setSelectedIds((prev) => prev.filter((id) => id !== seat.id))
      return
    }

    // 인원 수 초과 시 선택 불가
    if (selectedIds.length >= totalPersons) return

    // 선택 목록에 추가
    setSelectedIds((prev) => [...prev, seat.id])
  }

  /**
   * 좌석 타입별 단가 계산
   * @param {string} seatType - 'NORMAL' | 'VIP' | 'RECLINER' | 'COUPLE'
   */
  const getSeatPrice = (seatType) => SEAT_PRICES[seatType] ?? SEAT_PRICES.NORMAL

  /**
   * 선택된 좌석의 총 금액 계산
   * 좌석별 단가 합산 후 인원 할인 적용
   */
  const calcTotal = () => {
    // 선택 좌석 단가 합산
    const seatTotal = selectedIds.reduce((acc, id) => {
      const seat = seats.find((s) => s.id === id)
      return acc + getSeatPrice(seat?.seatType ?? 'NORMAL')
    }, 0)

    // 인원 할인 합산
    const discountTotal = PERSON_TYPES.reduce((acc, { type, discount }) => {
      return acc + (persons[type] ?? 0) * discount
    }, 0)

    return Math.max(seatTotal - discountTotal, 0)
  }

  const isReady = selectedIds.length === totalPersons

  /**
   * 안내 메시지
   * - 선택 중일 때: 남은 선택 수 표시
   * - 선택 완료: 빈 문자열 반환
   */
  const getHintMessage = () => {
    const remaining = totalPersons - selectedIds.length
    if (remaining > 0) {
      return `좌석을 선택해 주세요. (${selectedIds.length}/${totalPersons}석 선택됨, ${remaining}석 남음)`
    }
    return ''
  }

  /** 결제 페이지로 이동 */
  const handlePayment = () => {
    if (!isReady) return
    navigate('/payment', {
      state: {
        ...state,
        selectedSeats: selectedIds,
        selectedSeatObjects: selectedIds.map((id) => seats.find((s) => s.id === id)),
        totalAmount: calcTotal(),
        theater,
      },
    })
  }

  // 행(row) 목록 추출 (A, B, C ...)
  const rows = [...new Set(seats.map((s) => s.row))]

  /**
   * 한 행의 좌석을 통로 기준으로 세 그룹으로 분리
   * 구조: [좌측 2석] | 통로 | [중앙 나머지] | 통로 | [우측 2석]
   * cols 가 5 미만이면 통로 없이 그냥 반환
   */
  const splitRowByAisle = (rowSeats) => {
    // 열 번호 오름차순 정렬
    const sorted = [...rowSeats].sort((a, b) => a.col - b.col)
    if (sorted.length < 5) {
      return { left: sorted, middle: [], right: [] }
    }
    const left   = sorted.slice(0, 2)
    const right  = sorted.slice(sorted.length - 2)
    const middle = sorted.slice(2, sorted.length - 2)
    return { left, middle, right }
  }

  // 열 번호 목록 (첫 번째 행 기준, 오름차순)
  const colNumbers = seats
    .filter((s) => s.row === rows[0])
    .sort((a, b) => a.col - b.col)
    .map((s) => s.col)

  // 선택된 좌석들의 타입 분류 (요금 표시용)
  const selectedSeatsSummary = useMemo(() => {
    const byType: Record<string, number> = {}
    selectedIds.forEach((id) => {
      const seat = seats.find((s) => s.id === id)
      const type = seat?.seatType ?? 'NORMAL'
      byType[type] = (byType[type] ?? 0) + 1
    })
    return byType
  }, [selectedIds, seats])

  return (
    <div style={pageWrap}>

      {/* ── 뒤로 가기 ── */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={20} />
        날짜 · 시간 선택
      </button>

      {/* ── 헤더 정보 ── */}
      <h2 style={pageTitle}>좌석 선택</h2>
      <p style={subInfo}>
        {movieTitle} · {schedule.theaterName} · {schedule.startTime}
      </p>
      <p style={subInfo}>
        선택:{' '}
        <strong style={{ color: 'var(--color-brand-default)' }}>{selectedIds.length}</strong>
        {' '}/ {totalPersons}석
      </p>

      {/* ── 스크린 표시 ── */}
      <div style={screenWrap}>
        <div style={screen}>SCREEN</div>
      </div>

      {/* ── 좌석 타입 범례 ── */}
      <div style={legend}>
        {[
          { label: '일반석',     color: 'var(--color-seat-empty)',    border: 'var(--color-seat-empty-border)' },
          { label: '선택됨',     color: 'var(--color-seat-selected)', border: 'var(--color-brand-hover)' },
          { label: '매진',       color: 'var(--color-seat-sold-out)', border: 'transparent' },
          { label: '리클라이너', color: '#1a5c3a',                    border: '#00ad74' },
          { label: '커플석',     color: '#5c1a2a',                    border: '#e03c3c' },
        ].map(({ label, color, border }) => (
          <div key={label} style={legendItem}>
            <div style={{ ...seatBase, background: color, border: `1px solid ${border}`, width: 22, height: 22 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 좌석 그리드 (중앙정렬 + 통로 구분) ── */}
      <div style={gridOuter}>
        <div style={gridScroll}>

          {/* 열 번호 헤더 행 */}
          <div style={colHeaderRow}>
            {/* 왼쪽 라벨 자리 */}
            <span style={rowLabel} />
            {/* 좌측 2석 열 번호 */}
            {colNumbers.slice(0, 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            {/* 통로 빈칸 */}
            {colNumbers.length >= 5 && <span style={aisleGap} />}
            {/* 중앙 열 번호 */}
            {colNumbers.slice(2, colNumbers.length - 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            {/* 통로 빈칸 */}
            {colNumbers.length >= 5 && <span style={aisleGap} />}
            {/* 우측 2석 열 번호 */}
            {colNumbers.slice(colNumbers.length - 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            {/* 오른쪽 라벨 자리 */}
            <span style={rowLabel} />
          </div>

          {/* 좌석 행 */}
          {rows.map((row) => {
            const rowSeats = seats.filter((s) => s.row === row)
            const { left, middle, right } = splitRowByAisle(rowSeats)

            // 좌석 버튼 렌더 헬퍼
            const renderSeat = (seat) => (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                title={`${seat.id} (${SEAT_TYPE_LABEL[seat.seatType] ?? '일반'} · ${getSeatPrice(seat.seatType).toLocaleString()}원)`}
                style={{ ...seatBase, ...getSeatStyle(seat, selectedIds) }}
                disabled={seat.status === 'sold_out' || seat.status === 'disabled'}
              />
            )

            return (
              <div key={row} style={rowWrap}>
                {/* 왼쪽 행 라벨 */}
                <span style={rowLabel}>{row}</span>

                {/* 좌측 2석 */}
                <div style={colWrap}>
                  {left.map(renderSeat)}
                </div>

                {/* 통로 간격 (5석 이상일 때만) */}
                {colNumbers.length >= 5 && <span style={aisleGap} />}

                {/* 중앙 좌석 */}
                {middle.length > 0 && (
                  <div style={colWrap}>
                    {middle.map(renderSeat)}
                  </div>
                )}

                {/* 통로 간격 */}
                {colNumbers.length >= 5 && <span style={aisleGap} />}

                {/* 우측 2석 */}
                <div style={colWrap}>
                  {right.map(renderSeat)}
                </div>

                {/* 오른쪽 행 라벨 */}
                <span style={rowLabel}>{row}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 선택된 좌석 목록 ── */}
      {selectedIds.length > 0 && (
        <div style={selectedBox}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            선택된 좌석
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {selectedIds.map((id) => (
              <span key={id} style={seatTag}>{id}</span>
            ))}
          </div>
          {/* 좌석 타입별 요금 요약 */}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {Object.entries(selectedSeatsSummary).map(([type, cnt]) => (
              <span key={type} style={{ marginRight: 12 }}>
                {SEAT_TYPE_LABEL[type as keyof typeof SEAT_TYPE_LABEL] ?? '일반'} {cnt as number}석 · {(getSeatPrice(type) * (cnt as number)).toLocaleString()}원
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 결제 버튼 영역 ── */}
      <div style={nextArea}>
        {/* 안내 메시지 */}
        {!isReady && (
          <div style={hintBox}>
            <Info size={16} style={{ marginRight: 6, flexShrink: 0 }} />
            {getHintMessage()}
          </div>
        )}

        {/* 금액 표시 (좌석 선택됐을 때) */}
        {isReady && (
          <div style={amountBox}>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>결제 예정 금액</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-default)' }}>
              {calcTotal().toLocaleString()}원
            </span>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={!isReady}
          style={{ ...nextBtn, ...(!isReady ? nextBtnDisabled : {}) }}
        >
          <CreditCard size={22} />
          결제하기
        </button>
      </div>
    </div>
  )
}

/* ── 좌석 타입·상태별 색상 반환 (VIP 없음 — 일반/리클라이너/커플만) ── */
function getSeatStyle(seat, selectedIds) {
  if (selectedIds.includes(seat.id)) {
    return { background: 'var(--color-seat-selected)', border: '1px solid var(--color-brand-hover)', cursor: 'pointer' }
  }
  if (seat.status === 'sold_out')  return { background: 'var(--color-seat-sold-out)',  border: '1px solid transparent', cursor: 'not-allowed' }
  if (seat.status === 'disabled')  return { background: 'var(--color-seat-disabled)',  border: '1px solid transparent', cursor: 'not-allowed', opacity: 0.5 }

  // 빈 자리: 좌석 타입별 색상
  switch (seat.seatType) {
    case 'RECLINER': return { background: '#1a5c3a', border: '1px solid #00ad74', cursor: 'pointer' }
    case 'COUPLE':   return { background: '#5c1a2a', border: '1px solid #e03c3c', cursor: 'pointer' }
    default:         return { background: 'var(--color-seat-empty)', border: '1px solid var(--color-seat-empty-border)', cursor: 'pointer' }
  }
}

/* ── 스타일 ── */
const pageWrap  = { maxWidth: 960, margin: '0 auto', padding: '32px 40px 80px' }
const backBtn   = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none',
  color: 'var(--text-secondary)', fontSize: 16,
  cursor: 'pointer', padding: '10px 0', marginBottom: 16,
}
const pageTitle = { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }
const subInfo   = { color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }

const screenWrap = { textAlign: 'center', margin: '24px 0 16px' }
const screen     = {
  display: 'inline-block', width: '70%', maxWidth: 500, padding: '10px 0',
  background: 'var(--bg-surface)', border: '2px solid var(--border-default)',
  borderRadius: '50% 50% 0 0 / 20px 20px 0 0',
  color: 'var(--text-muted)', fontSize: 13, letterSpacing: 4,
}

const legend     = { display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }
const legendItem = { display: 'flex', alignItems: 'center', gap: 6 }

/* 그리드 외부: 가로 스크롤 + 중앙 정렬 */
const gridOuter  = { overflowX: 'auto', paddingBottom: 8, display: 'flex', justifyContent: 'center' }
/* 그리드 내부: 열 방향 플렉스 */
const gridScroll = { display: 'inline-flex', flexDirection: 'column', gap: 7, minWidth: 'fit-content' }
/* 한 행 전체 래퍼 */
const rowWrap    = { display: 'flex', alignItems: 'center', gap: 6 }
/* 열 번호 헤더 행 */
const colHeaderRow = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }
/* 행 라벨 (A, B, C …) */
const rowLabel   = {
  width: 22, textAlign: 'center', fontSize: 12,
  color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600,
}
/* 열 번호 라벨 (1, 2, 3 …) */
const colNumLabel = {
  width: 32, textAlign: 'center', fontSize: 11,
  color: 'var(--text-muted)', flexShrink: 0,
}
/* 통로 간격 */
const aisleGap   = { display: 'inline-block', width: 20, flexShrink: 0 }
/* 좌석 그룹 */
const colWrap    = { display: 'flex', gap: 6 }

/* 좌석 기본 스타일 */
const seatBase   = {
  width: 32, height: 32, borderRadius: 6, border: 'none',
  flexShrink: 0, transition: 'all 0.1s',
}

const selectedBox = {
  margin: '20px 0', padding: '16px 20px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 14,
}
const seatTag     = {
  padding: '4px 12px', background: 'rgba(255,184,0,0.15)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 8, fontSize: 14, color: 'var(--color-brand-default)', fontWeight: 700,
}

/* 결제 버튼 영역 */
const nextArea  = {
  marginTop: 16, padding: '24px 0 0',
  borderTop: '1px solid var(--border-subtle)',
}
const hintBox   = {
  display: 'flex', alignItems: 'center',
  padding: '14px 20px', marginBottom: 16,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, fontSize: 15, color: 'var(--text-muted)',
}
const amountBox = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', marginBottom: 16,
  background: 'rgba(255,184,0,0.06)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 12,
}
const nextBtn   = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  width: '100%', padding: '24px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 16,
  fontSize: 22, fontWeight: 800, cursor: 'pointer', letterSpacing: 1,
}
const nextBtnDisabled = {
  background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'not-allowed',
}

export default SeatPage
