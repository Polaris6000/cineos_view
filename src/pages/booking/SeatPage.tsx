/**
 * SeatPage.tsx — 좌석 선택 페이지 (UC-03 4단계)
 *
 * 기능:
 *  - 상영관 좌석 배치도 표시 (행 라벨 + 좌석 그리드)
 *  - 좌석 상태: empty(빈자리) | sold_out(예약완료) | occupied(타인점유) | selected(내가선택)
 *  - WebSocket으로 실시간 좌석 상태 반영
 *  - 인원 수만큼만 개별 선택 가능 (클릭 토글)
 *  - 좌석 타입별 단가: API 상영관 정책(SeatPolicyDTO.cost) 기준
 *  - 결제하기 → PaymentPage 로 이동
 *
 * 데이터 흐름:
 *  1. location.state로 { movieTitle, schedule(ScheduleDTO), persons, totalPersons } 수신
 *  2. schedule.no(상영관 번호) → GET /api/theater/list → 해당 상영관 정보 조회 (고객용)
 *  3. theater.policyId → GET /api/seat-policy/list → 좌석 타입·단가 조회 (고객용)
 *  4. 조회한 상영관 정보 기반 기본 좌석 배치 생성 (10행 × 10열)
 *  5. useWebSocket(schedule.id) → 실시간 예약완료/임시점유 좌석 반영
 *
 * WebSocket 연동:
 *  - reserved Set: DB 예약확정 좌석 → sold_out 표시
 *  - occupied Map (userId ≠ myId): 타인 임시점유 → occupied 표시
 *  - occupied Map (userId === myId): 내 선택 → selected 표시
 *  - sendToggle(seatNumber): 좌석 클릭 시 서버에 토글 요청
 *
 * FHD(1080×1920) 세로형 키오스크 기준
 */
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Info, CreditCard, Wifi, WifiOff } from 'lucide-react'
import { SEAT_TYPE_LABEL, PERSON_TYPES } from '../../api/mockData'
import apiClient, { type TheaterDTO, type SeatPolicyDTO, type ScheduleDTO } from '../../api/apiClient'
import { useWebSocket } from '../../hooks/useWebSocket'

/* ── 타입 정의 ─────────────────────────────────────────────── */

/** 좌석 하나의 데이터 (generateRealSeats 반환 타입) */
interface SeatItem {
  id:       string    // "A1", "B3" 형식 — WebSocket seatNumber와 동일
  row:      string    // 행 라벨 (A~J)
  col:      number    // 열 번호 (1~10)
  seatType: 'NORMAL' | 'RECLINER'
}

/* ── 좌석 배치 생성 ─────────────────────────────────────────── */

/**
 * 실제 API 상영관 데이터 기반 좌석 배치 생성
 *
 * 백엔드 TheaterDTO에는 rows/cols 정보가 없으므로 기본 10×10 레이아웃 사용
 * (TheaterListPage.tsx 주석에 totalSeats: 100 으로 명시돼 있어 10×10으로 고정)
 *
 * @param theaterNo  - 상영관 번호
 * @param isRecliner - 리클라이너 관 여부 (policyName에 '리클라이너' 포함 시 true)
 */
function generateRealSeats(theaterNo: number, isRecliner: boolean): SeatItem[] {
  const ROW_COUNT = 10
  const COL_COUNT = 10
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const seats: SeatItem[] = []

  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 1; c <= COL_COUNT; c++) {
      seats.push({
        id:       `${rowLabels[r]}${c}`,
        row:      rowLabels[r],
        col:      c,
        // 리클라이너 관 전 좌석 RECLINER, 일반 관은 NORMAL
        seatType: isRecliner ? 'RECLINER' : 'NORMAL',
      })
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[SeatPage] ${theaterNo}관 좌석 생성 완료 (${seats.length}석, ${isRecliner ? 'RECLINER' : 'NORMAL'})`)
  return seats
}

/* ── 컴포넌트 ───────────────────────────────────────────────── */

function SeatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state    = location.state ?? {}

  // location.state에서 전달받은 값 구조분해
  // movieTitle: 영화 제목, schedule: ScheduleDTO, persons: 인원 타입별 수, totalPersons: 총 인원
  const {
    movieTitle,
    schedule,
    persons = {},
    totalPersons = 0,
  } = state as {
    movieTitle:    string
    schedule:      ScheduleDTO & { theaterName?: string; startTime?: string }
    persons:       Record<string, number>
    totalPersons:  number
  }

  // state 없으면 홈으로 이동
  if (!schedule) {
    navigate('/')
    return null
  }

  /* ── API 상태 ──────────────────────────────────────────── */
  /**
   * 상영관 정보 (API에서 로드)
   * TheaterDTO: { no, policyId, cleanupTime }
   */
  const [theater,     setTheater]     = useState<TheaterDTO | null>(null)
  /**
   * 좌석 정책 정보 (API에서 로드)
   * SeatPolicyDTO: { policyId, name, cost }
   */
  const [seatPolicy,  setSeatPolicy]  = useState<SeatPolicyDTO | null>(null)
  const [apiLoading,  setApiLoading]  = useState(true)
  const [apiError,    setApiError]    = useState('')

  /**
   * 상영관 + 좌석 정책 API 호출
   * - GET /api/theater/list → schedule.no 와 일치하는 상영관 찾기 (고객용 — 토큰 불필요)
   * - GET /api/seat-policy/list → theater.policyId 와 일치하는 정책 찾기 (고객용 — 토큰 불필요)
   *
   * 두 API가 모두 성공해야 좌석 배치를 렌더링할 수 있으므로 Promise.all 사용
   */
  useEffect(() => {
    const loadTheaterData = async () => {
      setApiLoading(true)
      setApiError('')
      try {
        const [theaterRes, policyRes] = await Promise.all([
          apiClient.get<TheaterDTO[]>('/theater/list'),
          apiClient.get<SeatPolicyDTO[]>('/seat-policy/list'),
        ])

        // schedule.no로 해당 상영관 찾기
        const found = theaterRes.data.find((t) => t.no === schedule.no)
        if (!found) {
          setApiError(`${schedule.no}관 정보를 찾을 수 없습니다.`)
          return
        }

        // policyId로 좌석 정책 찾기
        const policy = policyRes.data.find((p) => p.policyId === found.policyId)
        if (!policy) {
          setApiError('좌석 정책 정보를 불러오지 못했습니다.')
          return
        }

        setTheater(found)
        setSeatPolicy(policy)
      } catch (e) {
        console.error('[SeatPage] 상영관 정보 로드 실패', e)
        setApiError('상영관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setApiLoading(false)
      }
    }

    void loadTheaterData()
  // schedule.no는 마운트 시 고정값이므로 의존성 배열에서 제외해도 무방하지만 명시적으로 포함
  }, [schedule.no])

  /* ── WebSocket 연결 ──────────────────────────────────────── */
  /**
   * useWebSocket — 좌석 실시간 상태 구독
   * schedule.id가 있을 때만 연결 (null이면 훅 내부에서 연결 안 함)
   *
   * wsState.reserved  - DB 예약 완료 좌석 번호 Set
   * wsState.occupied  - 임시점유 Map (seatNumber → userId)
   * wsState.myId      - 내 UUID
   * wsState.connected - 연결 상태
   * sendToggle        - 좌석 토글 메시지 송신 함수
   */
  const { wsState, sendToggle } = useWebSocket(schedule.id ?? null)

  /* ── 좌석 배치 생성 (메모이제이션) ──────────────────────── */
  /**
   * theater와 seatPolicy가 로드된 후에만 좌석 생성
   * isRecliner: 정책 이름에 "리클라이너"가 포함되면 true
   */
  const seats = useMemo<SeatItem[]>(() => {
    if (!theater || !seatPolicy) return []
    const isRecliner = seatPolicy.name.includes('리클라이너')
    return generateRealSeats(theater.no, isRecliner)
  }, [theater, seatPolicy])

  /* ── 좌석 상태 파생 ─────────────────────────────────────── */
  /**
   * 내가 현재 선택(점유)한 좌석 번호 목록
   * occupied Map에서 userId === myId 인 항목 추출
   */
  const mySelectedIds = useMemo<string[]>(() => {
    const result: string[] = []
    wsState.occupied.forEach((userId, seatNumber) => {
      if (userId === wsState.myId) result.push(seatNumber)
    })
    return result
  }, [wsState.occupied, wsState.myId])

  /**
   * 좌석 번호 → 좌석 표시 상태 결정
   * 우선순위: 내 선택 > DB 예약완료 > 타인 임시점유 > 빈자리
   */
  const getSeatDisplayStatus = (seatId: string): 'selected' | 'sold_out' | 'occupied' | 'empty' => {
    // 1. 내가 선택한 좌석
    if (wsState.myId && wsState.occupied.get(seatId) === wsState.myId) return 'selected'
    // 2. DB 예약 완료 좌석
    if (wsState.reserved.has(seatId)) return 'sold_out'
    // 3. 타인이 임시 점유한 좌석
    if (wsState.occupied.has(seatId)) return 'occupied'
    // 4. 빈자리
    return 'empty'
  }

  /* ── 이벤트 핸들러 ─────────────────────────────────────── */
  /**
   * 좌석 클릭 처리
   * - sold_out (예약완료): 클릭 무시
   * - occupied (타인점유): 클릭 무시
   * - selected (내 선택): 선택 해제 (WS sendToggle)
   * - empty (빈자리): 선택 가능 (총 인원 수 초과 시 무시, WS sendToggle)
   */
  const handleSeatClick = (seat: SeatItem) => {
    const status = getSeatDisplayStatus(seat.id)

    // 예약완료 · 타인점유는 클릭 불가
    if (status === 'sold_out' || status === 'occupied') return

    // 이미 내가 선택한 좌석 → 해제
    if (status === 'selected') {
      sendToggle(seat.id)
      return
    }

    // 빈자리: 인원 수 초과 시 무시
    if (mySelectedIds.length >= totalPersons) return

    // WebSocket 연결 안 된 경우 안내 (폴백)
    if (!wsState.connected) {
      alert('실시간 연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    // 선택 (WS sendToggle 호출 → 서버가 OCCUPIED 브로드캐스트)
    sendToggle(seat.id)
  }

  /* ── 요금 계산 ─────────────────────────────────────────── */
  /**
   * 좌석 단가 반환
   * 실제 좌석 가격 = seatPolicy.cost (API에서 로드한 값)
   * 로드 전엔 0 반환
   */
  const getSeatPrice = (_seatType: string): number => seatPolicy?.cost ?? 0

  /**
   * 총 결제 예정 금액 계산
   * = 선택 좌석 단가 합산 - 인원 타입별 할인 합산
   */
  const calcTotal = (): number => {
    // 선택 좌석 단가 합산
    const seatTotal = mySelectedIds.reduce((acc, id) => {
      const seat = seats.find((s) => s.id === id)
      return acc + getSeatPrice(seat?.seatType ?? 'NORMAL')
    }, 0)

    // 인원 타입별 할인 합산 (mockData의 PERSON_TYPES 사용)
    const discountTotal = PERSON_TYPES.reduce((acc, { type, discount }) => {
      return acc + (persons[type] ?? 0) * discount
    }, 0)

    return Math.max(seatTotal - discountTotal, 0)
  }

  /** 모든 인원 좌석 선택 완료 여부 */
  const isReady = mySelectedIds.length === totalPersons && totalPersons > 0

  /** 안내 메시지: 남은 선택 수 */
  const getHintMessage = (): string => {
    const remaining = totalPersons - mySelectedIds.length
    if (remaining > 0) {
      return `좌석을 선택해 주세요. (${mySelectedIds.length}/${totalPersons}석 선택됨, ${remaining}석 남음)`
    }
    return ''
  }

  /** 결제 페이지로 이동 */
  const handlePayment = () => {
    if (!isReady) return
    navigate('/payment', {
      state: {
        ...state,
        selectedSeats:       mySelectedIds,
        selectedSeatObjects: mySelectedIds.map((id) => seats.find((s) => s.id === id)),
        totalAmount:         calcTotal(),
        theater,
        seatPolicy,
      },
    })
  }

  /* ── 좌석 배치 렌더링 유틸 ─────────────────────────────── */
  // 행(row) 목록 추출 (A, B, C ...)
  const rows = useMemo(() => [...new Set(seats.map((s) => s.row))], [seats])

  /**
   * 한 행의 좌석을 통로 기준으로 세 그룹으로 분리
   * 구조: [좌측 2석] | 통로 | [중앙 6석] | 통로 | [우측 2석]
   * cols < 5면 통로 없이 그냥 반환
   */
  const splitRowByAisle = (rowSeats: SeatItem[]) => {
    const sorted = [...rowSeats].sort((a, b) => a.col - b.col)
    if (sorted.length < 5) return { left: sorted, middle: [], right: [] }
    return {
      left:   sorted.slice(0, 2),
      middle: sorted.slice(2, sorted.length - 2),
      right:  sorted.slice(sorted.length - 2),
    }
  }

  // 열 번호 목록 (첫 번째 행 기준)
  const colNumbers = useMemo(() => {
    if (rows.length === 0) return []
    return seats
      .filter((s) => s.row === rows[0])
      .sort((a, b) => a.col - b.col)
      .map((s) => s.col)
  }, [seats, rows])

  // 선택된 좌석들의 타입별 요약 (요금 표시용)
  const selectedSeatsSummary = useMemo<Record<string, number>>(() => {
    const byType: Record<string, number> = {}
    mySelectedIds.forEach((id) => {
      const seat = seats.find((s) => s.id === id)
      const type = seat?.seatType ?? 'NORMAL'
      byType[type] = (byType[type] ?? 0) + 1
    })
    return byType
  }, [mySelectedIds, seats])

  /* ── 로딩 / 에러 렌더링 ──────────────────────────────────── */
  if (apiLoading) {
    return (
      <div style={pageWrap}>
        <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>상영관 정보를 불러오는 중...</p>
      </div>
    )
  }
  if (apiError) {
    return (
      <div style={pageWrap}>
        <p style={{ color: 'var(--color-error-text)', fontSize: 16 }}>{apiError}</p>
        <button onClick={() => navigate(-1)} style={backBtn}>← 뒤로</button>
      </div>
    )
  }

  /* ── 메인 렌더링 ──────────────────────────────────────────── */
  return (
    <div style={pageWrap}>

      {/* ── 뒤로 가기 ── */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={20} />
        날짜 · 시간 선택
      </button>

      {/* ── 헤더 정보 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={pageTitle}>좌석 선택</h2>
        {/* WebSocket 연결 상태 표시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: wsState.connected ? 'var(--color-success-main)' : 'var(--color-error-text)' }}>
          {wsState.connected
            ? <><Wifi size={14} /> 실시간 연결됨</>
            : <><WifiOff size={14} /> 연결 중...</>
          }
        </div>
      </div>

      <p style={subInfo}>
        {movieTitle} · {schedule.theaterName ?? `${schedule.no}관`} · {schedule.startTime ?? ''}
      </p>
      <p style={subInfo}>
        선택:{' '}
        <strong style={{ color: 'var(--color-brand-default)' }}>{mySelectedIds.length}</strong>
        {' '}/ {totalPersons}석
        {seatPolicy && (
          <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            ({seatPolicy.name} · 1석 {seatPolicy.cost.toLocaleString()}원)
          </span>
        )}
      </p>

      {/* ── 스크린 표시 ── */}
      <div style={screenWrap}>
        <div style={screen}>SCREEN</div>
      </div>

      {/* ── 좌석 타입 범례 ── */}
      <div style={legend}>
        {[
          { label: '일반',     color: 'var(--color-seat-empty)',    border: 'var(--color-seat-empty-border)' },
          { label: '리클라이너', color: '#1a5c3a',                  border: '#00ad74' },
          { label: '선택됨',   color: 'var(--color-seat-selected)', border: 'var(--color-brand-hover)' },
          { label: '타인선택', color: '#6b3fa0',                    border: '#9b6fd4' },  // 임시점유
          { label: '매진',     color: 'var(--color-seat-sold-out)', border: 'transparent' },
        ].map(({ label, color, border }) => (
          <div key={label} style={legendItem}>
            <div style={{ ...seatBase, background: color, border: `1px solid ${border}`, width: 22, height: 22 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 좌석 그리드 (통로 구분) ── */}
      <div style={gridOuter}>
        <div style={gridScroll}>

          {/* 열 번호 헤더 행 */}
          <div style={colHeaderRow}>
            <span style={rowLabel} />
            {colNumbers.slice(0, 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            {colNumbers.length >= 5 && <span style={aisleGap} />}
            {colNumbers.slice(2, colNumbers.length - 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            {colNumbers.length >= 5 && <span style={aisleGap} />}
            {colNumbers.slice(colNumbers.length - 2).map((n) => (
              <span key={n} style={colNumLabel}>{n}</span>
            ))}
            <span style={rowLabel} />
          </div>

          {/* 좌석 행 */}
          {rows.map((row) => {
            const rowSeats = seats.filter((s) => s.row === row)
            const { left, middle, right } = splitRowByAisle(rowSeats)

            /** 좌석 버튼 렌더 헬퍼 */
            const renderSeat = (seat: SeatItem) => {
              const displayStatus = getSeatDisplayStatus(seat.id)
              const isClickable   = displayStatus === 'empty' || displayStatus === 'selected'

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  title={`${seat.id} (${SEAT_TYPE_LABEL[seat.seatType] ?? '일반'} · ${getSeatPrice(seat.seatType).toLocaleString()}원)`}
                  style={{
                    ...seatBase,
                    ...getSeatStyle(displayStatus, seat.seatType),
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  disabled={!isClickable}
                  aria-label={`${seat.id} ${displayStatus}`}
                >
                  {/* 매진 / 타인점유 좌석: X 표시 */}
                  {(displayStatus === 'sold_out' || displayStatus === 'occupied') && (
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900,
                      color: displayStatus === 'occupied' ? 'rgba(200,150,255,0.9)' : 'rgba(255,255,255,0.7)',
                      pointerEvents: 'none',
                    }}>✕</span>
                  )}
                </button>
              )
            }

            return (
              <div key={row} style={rowWrap}>
                <span style={rowLabel}>{row}</span>
                <div style={colWrap}>{left.map(renderSeat)}</div>
                {colNumbers.length >= 5 && <span style={aisleGap} />}
                {middle.length > 0 && <div style={colWrap}>{middle.map(renderSeat)}</div>}
                {colNumbers.length >= 5 && <span style={aisleGap} />}
                <div style={colWrap}>{right.map(renderSeat)}</div>
                <span style={rowLabel}>{row}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 선택된 좌석 목록 ── */}
      {mySelectedIds.length > 0 && (
        <div style={selectedBox}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            선택된 좌석
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {mySelectedIds.map((id) => (
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
        {/* 금액 표시 */}
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

/* ── 좌석 상태·타입별 스타일 반환 ─────────────────────────── */
/**
 * @param displayStatus - 'selected' | 'sold_out' | 'occupied' | 'empty'
 * @param seatType      - 'NORMAL' | 'RECLINER'
 */
function getSeatStyle(
  displayStatus: 'selected' | 'sold_out' | 'occupied' | 'empty',
  seatType: string,
): React.CSSProperties {
  switch (displayStatus) {
    case 'selected':
      return { background: 'var(--color-seat-selected)', border: '1px solid var(--color-brand-hover)', cursor: 'pointer' }
    case 'sold_out':
      return { background: 'var(--color-seat-sold-out)', border: '1px solid transparent', cursor: 'not-allowed' }
    case 'occupied':
      // 타인 임시점유: 보라색 계열로 표시
      return { background: '#4a1c7a', border: '1px solid #9b6fd4', cursor: 'not-allowed' }
    default:
      // 빈자리: 좌석 타입별 색상
      if (seatType === 'RECLINER') {
        return { background: '#1a5c3a', border: '1px solid #00ad74', cursor: 'pointer' }
      }
      return { background: 'var(--color-seat-empty)', border: '1px solid var(--color-seat-empty-border)', cursor: 'pointer' }
  }
}

/* ── 스타일 정의 ─────────────────────────────────────────── */
const pageWrap: React.CSSProperties  = { maxWidth: 960, margin: '0 auto', padding: '32px 40px 80px' }
const backBtn: React.CSSProperties   = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none',
  color: 'var(--text-secondary)', fontSize: 16,
  cursor: 'pointer', padding: '10px 0', marginBottom: 16,
}
const pageTitle: React.CSSProperties = { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }
const subInfo: React.CSSProperties   = { color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }

const screenWrap: React.CSSProperties = { textAlign: 'center', margin: '24px 0 16px' }
const screen: React.CSSProperties     = {
  display: 'inline-block', width: '70%', maxWidth: 500, padding: '10px 0',
  background: 'var(--bg-surface)', border: '2px solid var(--border-default)',
  borderRadius: '50% 50% 0 0 / 20px 20px 0 0',
  color: 'var(--text-muted)', fontSize: 13, letterSpacing: 4,
}

const legend: React.CSSProperties     = { display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }
const legendItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

const gridOuter: React.CSSProperties  = { overflowX: 'auto', paddingBottom: 8, display: 'flex', justifyContent: 'center' }
const gridScroll: React.CSSProperties = { display: 'inline-flex', flexDirection: 'column', gap: 7, minWidth: 'fit-content' }
const rowWrap: React.CSSProperties    = { display: 'flex', alignItems: 'center', gap: 6 }
const colHeaderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }
const rowLabel: React.CSSProperties   = { width: 22, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600 }
const colNumLabel: React.CSSProperties = { width: 32, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }
const aisleGap: React.CSSProperties   = { display: 'inline-block', width: 20, flexShrink: 0 }
const colWrap: React.CSSProperties    = { display: 'flex', gap: 6 }

const seatBase: React.CSSProperties   = { width: 32, height: 32, borderRadius: 6, border: 'none', flexShrink: 0, transition: 'all 0.1s' }

const selectedBox: React.CSSProperties = {
  margin: '20px 0', padding: '16px 20px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 14,
}
const seatTag: React.CSSProperties     = {
  padding: '4px 12px', background: 'rgba(255,184,0,0.15)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 8, fontSize: 14, color: 'var(--color-brand-default)', fontWeight: 700,
}

const nextArea: React.CSSProperties  = { marginTop: 16, padding: '24px 0 0', borderTop: '1px solid var(--border-subtle)' }
const hintBox: React.CSSProperties   = {
  display: 'flex', alignItems: 'center',
  padding: '14px 20px', marginBottom: 16,
  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
  borderRadius: 12, fontSize: 15, color: 'var(--text-muted)',
}
const amountBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', marginBottom: 16,
  background: 'rgba(255,184,0,0.06)', border: '1px solid var(--color-brand-default)',
  borderRadius: 12,
}
const nextBtn: React.CSSProperties   = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  width: '100%', padding: '24px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 16,
  fontSize: 22, fontWeight: 800, cursor: 'pointer', letterSpacing: 1,
}
const nextBtnDisabled: React.CSSProperties = {
  background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'not-allowed',
}

export default SeatPage
