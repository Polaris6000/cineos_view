/**
 * useWebSocket.ts — 좌석 실시간 상태 관리 커스텀 훅
 *
 * 실제 백엔드 프로토콜(MyWebSocketHandler.java)에 맞춰 재작성.
 *
 * ─── 연결 URL ───────────────────────────────────────────────────
 *   ws(s)://{window.location.host}/ws/seats?userId={uuid}&page=seat&scheduleId={id}
 *   (개발: Vite /ws 프록시 → 8080. 다른 PC에서 IP:5173 접속 시에도 동일 호스트 사용)
 *
 *   !!! 파라미터 순서 고정: userId 첫째, page 둘째, scheduleId 셋째
 *     MyWebSocketHandler.java가 query.split("&") 인덱스로 파싱하며,
 *     page 파라미터가 없으면 서버가 즉시 session.close(BAD_DATA) 호출 → readyState: 3
 *
 * ─── 초기화 흐름 ────────────────────────────────────────────────
 *   1. REST GET /api/reservation/seatCount/schedule/{id}
 *      → DB 예약확정 좌석 목록 → reserved Set
 *      (WebSocket은 임시점유만 관리. DB 예약좌석은 REST로 별도 조회 필요)
 *   2. WS 연결 성공 후 GET action 전송
 *      → 서버가 현재 임시점유 현황 응답 (INIT_SELECTION → UPDATE_OCCUPANCY 순)
 *
 * ─── 수신 메시지 ────────────────────────────────────────────────
 *   { action: "INIT_SELECTION", scheduleId, seats: string[], userId }
 *     → 재접속 시 내 기존 선택 복구 (나에게만, UPDATE_OCCUPANCY보다 먼저 도착 보장)
 *   { action: "UPDATE_OCCUPANCY", scheduleId, seats: string[], userId }
 *     → 모든 사용자의 임시점유 합산 (브로드캐스트, userId 구분 없이 flat 목록)
 *
 * ─── 송신 메시지 ────────────────────────────────────────────────
 *   { action: "RESERVE", scheduleId, seats: string[] }
 *     → 내 선택 좌석 전체 목록으로 서버 교체 (append가 아닌 replace)
 *   { action: "RELEASE", scheduleId, seats: [] }
 *     → 내 선택 전부 해제
 *   { action: "GET", scheduleId, seats: [] }
 *     → 현재 임시점유 현황 요청 (연결 직후 1회 전송)
 *
 * ─── occupied Map 재구성 원리 ───────────────────────────────────
 *   서버가 per-user 구분 없이 flat 배열만 내려주므로 mySeatsRef로 직접 추적:
 *     mySeatsRef 포함 좌석 → map.set(seat, myId)   // 내 좌석
 *     그 외 좌석           → map.set(seat, 'other') // 타인 좌석
 *
 * ─── 점유 해제 정책 ─────────────────────────────────────────────
 *   UUID: localStorage(cineos_kiosk_ws_user_id) — 창 닫아도 유지
 *   UUID 삭제: 결제 완료·뒤로가기·홈·타이머 만료 (clearKioskSeatIdentity)
 *   즉시 해제: 뒤로가기·로고·홈·타이머 (releaseSeatHoldApi + UUID 삭제)
 *   지연 해제: 창 닫기만 — WS 종료 후 서버 5분 타이머 (UUID는 localStorage에 유지)
 */
import {useCallback, useEffect, useRef, useState} from 'react'
import apiClient from '../api/apiClient'
import {
  clearSeatHold,
  getOrCreateKioskWsUserId,
  getRestoredMySeats,
  releaseSeatHoldApi,
  setSeatHold,
} from '../utils/seatHold'
import {getSeatWebSocketBase} from '../utils/seatWebSocket'

/* ── 타입 정의 ─────────────────────────────────────────────── */

/** 백엔드에서 수신하는 WebSocket 메시지 구조 */
interface WsIncomingMessage {
  action: 'UPDATE_OCCUPANCY' | 'INIT_SELECTION'
  scheduleId: number
  seats: string[]  // 좌석 번호 문자열 배열: ["A1", "B3", ...]
  userId: string    // 액션 수행자 userId (브로드캐스트 출처 확인용)
}

/**
 * 훅이 외부로 공개하는 좌석 상태 (SeatPage 인터페이스 유지)
 */
export interface WsSeatState {
  /** DB 예약확정 좌석 번호 Set (REST API에서 로드) */
  reserved: Set<string>
  /**
   * 현재 임시점유 좌석 Map: seatNumber → userId
   *   userId === myId  → 내 좌석 (selected)
   *   userId === 'other' → 타인 좌석 (occupied)
   */
  occupied: Map<string, string>
  /** 내 UUID (occupied Map에서 내 좌석 구분 기준) */
  myId: string
  /** WebSocket 연결 상태 */
  connected: boolean
}

/** 훅 반환값 */
export interface UseWebSocketReturn {
  wsState: WsSeatState
  sendToggle: (seatNumber: string) => void
  /** 서버에 RELEASE 전송 후 로컬 선택 상태 초기화 (뒤로가기 시 즉시 해제) */
  releaseSeats: () => void
}

/* ── 상수 ──────────────────────────────────────────────────── */

const MAX_RETRY = 3
const RETRY_DELAY_MS = 2_000

/* ── 훅 본체 ───────────────────────────────────────────────── */

/**
 * useWebSocket — 좌석 실시간 상태 훅
 *
 * @param scheduleId - 현재 상영 일정 ID (null이면 연결하지 않음)
 * @returns wsState, sendToggle
 *
 * 사용 예 (SeatPage):
 *   const { wsState, sendToggle } = useWebSocket(schedule.id)
 *   wsState.occupied.get(seatId) === wsState.myId  // 내 좌석
 *   wsState.occupied.has(seatId)                   // 타인 임시점유
 *   wsState.reserved.has(seatId)                   // DB 예약완료
 */
export function useWebSocket(scheduleId: number | null): UseWebSocketReturn {
  // ── refs (렌더링 주기와 독립적으로 최신값 참조) ──────────
  /** localStorage UUID — 창을 닫았다 열어도 동일 (홈·결제완료·뒤로가기 시에만 삭제) */
  const userIdRef = useRef<string>(getOrCreateKioskWsUserId())
  /** WS 인스턴스 ref — onclose에서 stale 여부 확인에도 사용 */
  const wsRef = useRef<WebSocket | null>(null)
  const scheduleIdRef = useRef<number | null>(scheduleId)
  /**
   * 내 선택 좌석 목록 ref (Set)
   * useState 대신 ref: sendToggle 콜백 클로저에서 항상 최신값이 필요하고,
   * 변경 자체는 setWsState(occupied Map 갱신)를 통해 UI에 반영하므로
   * 별도 state가 필요 없음.
   */
  const mySeatsRef = useRef<Set<string>>(new Set())
  /** 마지막 UPDATE_OCCUPANCY flat 목록 — INIT_SELECTION이 늦게 도착해도 UI 복구 */
  const lastAllSeatsRef = useRef<string[]>([])
  const retryCount = useRef(0)
  
  // ── 상태 ──────────────────────────────────────────────────
  const [wsState, setWsState] = useState<WsSeatState>({
    reserved: new Set(),
    occupied: new Map(),
    myId: userIdRef.current, // UUID는 컴포넌트 마운트 시 고정
    connected: false,
  })
  
  // scheduleIdRef 동기화
  useEffect(() => {
    scheduleIdRef.current = scheduleId
  }, [scheduleId])
  
  // ── 헬퍼: occupied Map 재구성 ─────────────────────────────
  /**
   * 서버의 UPDATE_OCCUPANCY seats 배열 → occupied Map 변환
   * 백엔드가 userId 구분 없이 flat 배열로 주기 때문에
   * mySeatsRef 기준으로 "내 좌석 / 타인 좌석"을 직접 구분함.
   */
  const isSameSchedule = (msgScheduleId: unknown): boolean => {
    if (msgScheduleId == null || scheduleIdRef.current == null) return true
    return Number(msgScheduleId) === Number(scheduleIdRef.current)
  }
  
  const buildOccupiedMap = useCallback((allSeats: string[]): Map<string, string> => {
    const map = new Map<string, string>()
    for (const seat of allSeats) {
      map.set(seat, mySeatsRef.current.has(seat) ? userIdRef.current : 'other')
    }
    // flat 목록에 없어도 내 선택은 항상 myId로 표시 (재접속·INIT 지연 대비)
    for (const seat of mySeatsRef.current) {
      map.set(seat, userIdRef.current)
    }
    return map
  }, [])
  
  const restoreMySeatsFromStorage = useCallback(() => {
    const sid = scheduleIdRef.current
    if (sid == null) return
    const restored = getRestoredMySeats(sid, userIdRef.current)
    if (restored.length > 0) {
      mySeatsRef.current = new Set(restored)
      console.log('[WS] localStorage에서 내 좌석 복구:', restored)
    }
  }, [])
  
  const applyOccupiedFromAllSeats = useCallback((allSeats: string[]) => {
    lastAllSeatsRef.current = allSeats
    setWsState((prev) => ({...prev, occupied: buildOccupiedMap(allSeats)}))
  }, [buildOccupiedMap])
  
  // ── 헬퍼: WS 메시지 전송 ─────────────────────────────────
  /**
   * 서버로 좌석 액션 메시지를 전송하는 내부 헬퍼.
   * wsRef.current가 OPEN 상태일 때만 전송함.
   *
   * @param action - "RESERVE" | "RELEASE" | "GET"
   * @param seats  - 좌석 번호 배열 (RELEASE/GET은 빈 배열)
   */
  const sendAction = useCallback((action: string, seats: string[]) => {
    const ws = wsRef.current
    const sid = scheduleIdRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || sid === null) return
    
    const payload = {action, scheduleId: sid, seats}
    ws.send(JSON.stringify(payload))
    console.log('[WS] 송신:', payload)
  }, []) // wsRef, scheduleIdRef는 ref이므로 deps 불필요
  
  // ── WS 연결 함수 ─────────────────────────────────────────
  const connect = useCallback(() => {
    const sid = scheduleIdRef.current
    if (sid === null) return
    
    /**
     *  파라미터 순서 고정: userId 첫째, page 둘째, scheduleId 셋째
     *
     * MyWebSocketHandler.java 파싱 로직:
     *   String[] splits = query.split("&");
     *   userId    = splits[0].split("userId=")[1];   // 첫째 파라미터 강제
     *   page      = splits[1].split("page=")[1];     // 둘째 파라미터 강제
     *   scheduleId = splits[2].split("scheduleId=")[1];
     *
     * userId 또는 page가 누락되면 서버가 session.close(BAD_DATA) → readyState: 3
     * page 값은 서버에서 현재 null 체크만 하고 로직에 미사용. "seat" 고정 전달.
     */
    const url = `${getSeatWebSocketBase()}/ws/seats?userId=${userIdRef.current}&page=seat&scheduleId=${sid}`
    console.log('[WS] 연결 시도:', url)
    
    const ws = new WebSocket(url)
    wsRef.current = ws
    
    // ── 연결 성공 ─────────────────────────────────────────
    ws.onopen = () => {
      console.log('[WS] 연결 성공')
      retryCount.current = 0
      setWsState((prev) => ({...prev, connected: true}))
      
      // INIT 수신 전 UPDATE가 먼저 와도 내 좌석으로 인식하도록 로컬 복구
      restoreMySeatsFromStorage()
      
      /**
       * 연결 직후 GET → INIT_SELECTION(본인만) → UPDATE_OCCUPANCY(요청 세션만)
       */
      sendAction('GET', [])
    }
    
    // ── 메시지 수신 ───────────────────────────────────────
    ws.onmessage = (event: MessageEvent) => {
      let msg: WsIncomingMessage
      try {
        msg = JSON.parse(event.data) as WsIncomingMessage
      } catch {
        console.warn('[WS] JSON 파싱 실패:', event.data)
        return
      }
      console.log('[WS] 수신:', msg.action, msg)
      
      if (!isSameSchedule(msg.scheduleId)) {
        return
      }
      
      if (msg.action === 'INIT_SELECTION') {
        if (msg.userId && msg.userId !== userIdRef.current) {
          return
        }
        mySeatsRef.current = new Set(msg.seats ?? [])
        console.log('[WS] 서버 INIT_SELECTION 복구:', [...mySeatsRef.current])
        const sid = scheduleIdRef.current
        if (sid != null && mySeatsRef.current.size > 0) {
          setSeatHold(sid, userIdRef.current, [...mySeatsRef.current])
        }
        const merged = [
          ...new Set([...lastAllSeatsRef.current, ...(msg.seats ?? [])]),
        ]
        applyOccupiedFromAllSeats(
          merged.length > 0 ? merged : [...mySeatsRef.current],
        )
        
      } else if (msg.action === 'UPDATE_OCCUPANCY') {
        if (mySeatsRef.current.size === 0) {
          restoreMySeatsFromStorage()
        }
        applyOccupiedFromAllSeats(msg.seats ?? [])
      }
    }
    
    // ── 연결 오류 ─────────────────────────────────────────
    ws.onerror = (err) => {
      console.error('[WS] 연결 오류:', err)
    }
    
    // ── 연결 종료 ─────────────────────────────────────────
    ws.onclose = (event) => {
      console.warn('[WS] 연결 종료 (code:', event.code, ')')
      setWsState((prev) => ({...prev, connected: false}))
      
      /**
       * 이미 새 ws로 교체됐거나(scheduleId 변경) 컴포넌트가 언마운트된 경우
       * wsRef가 현재 ws와 다르면 재연결 시도 안 함
       */
      if (wsRef.current !== ws) return
      
      // code 1000: 정상 종료 (언마운트) → 재연결 안 함
      if (event.code !== 1000 && retryCount.current < MAX_RETRY) {
        retryCount.current++
        console.log(`[WS] ${RETRY_DELAY_MS}ms 후 재연결 시도 (${retryCount.current}/${MAX_RETRY})`)
        setTimeout(connect, RETRY_DELAY_MS)
      } else if (retryCount.current >= MAX_RETRY) {
        console.error('[WS] 재연결 한도 초과 — WS 기능 비활성화')
      }
    }
  }, [applyOccupiedFromAllSeats, buildOccupiedMap, restoreMySeatsFromStorage, sendAction])
  
  // ── DB 예약좌석 조회 + WS 연결 수명주기 ─────────────────
  useEffect(() => {
    if (scheduleId === null) return
    
    // 스케줄 전환: UI 초기화, 동일 기기 재접속 시 localStorage에서 내 좌석 복구
    const restored = getRestoredMySeats(scheduleId, userIdRef.current)
    mySeatsRef.current = new Set(restored)
    lastAllSeatsRef.current = []
    setWsState((prev) => ({
      ...prev,
      occupied: new Map(),
      connected: false,
    }))
    
    /**
     * DB 예약확정 좌석 REST 조회
     * WebSocket은 임시점유(temp)만 관리하고 DB 예약(confirmed) 정보는 제공 안 함.
     * GET /api/reservation/seatCount/schedule/{scheduleId} → List<String>
     */
    const fetchReserved = async () => {
      try {
        const res = await apiClient.get<string[]>(
          `/reservation/seatCount/schedule/${scheduleId}`,
        )
        setWsState((prev) => ({...prev, reserved: new Set(res.data)}))
        console.log('[WS] DB 예약좌석 로드 완료:', res.data.length, '석')
      } catch (e) {
        // 조회 실패 시 sold_out 표시 불가 → 사용자 UX에 미치는 영향 최소화
        console.warn('[WS] DB 예약좌석 조회 실패:', e)
      }
    }
    
    void fetchReserved()
    connect()
    
    // cleanup: RELEASE 없이 WS만 종료 → 창 닫기·결제 이동 시 서버 지연 해제(5분)
    return () => {
      console.log('[WS] cleanup — 연결 종료 (점유 유지, 서버 타이머 대기)')
      const ws = wsRef.current
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'component unmount')
      }
      wsRef.current = null
      lastAllSeatsRef.current = []
    }
    // connect는 stable 함수(deps 없음)이므로 scheduleId 변경 시에만 재실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])
  
  // ── 좌석 토글 송신 ────────────────────────────────────────
  /**
   * sendToggle — 좌석 번호 하나를 토글 (선택/해제)
   *
   * 내 좌석 클릭   → 선택 해제 (남은 좌석이 있으면 RESERVE, 없으면 RELEASE)
   * 빈자리 클릭    → 선택 추가 (RESERVE with all mySeats)
   * 타인 좌석 클릭 → SeatPage에서 클릭 자체를 막으므로 여기까지 오지 않음
   *
   *  백엔드 RESERVE는 append가 아닌 replace:
   *   받은 seats 배열로 해당 userId의 점유를 통째로 교체함.
   *   따라서 현재 mySeats 전체 목록을 항상 포함해 전송해야 함.
   *
   * 낙관적 UI 업데이트: 서버 응답(UPDATE_OCCUPANCY) 대기 없이 즉시 UI 반영
   */
  const sendToggle = useCallback((seatNumber: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] 전송 실패 — 연결되지 않음')
      return
    }
    
    const current = mySeatsRef.current
    const isMySelected = current.has(seatNumber)
    
    if (isMySelected) {
      // ── 선택 해제 ───────────────────────────────────────
      current.delete(seatNumber)
      if (current.size === 0) {
        // 더 이상 선택한 좌석이 없으면 내 점유 전체 해제
        sendAction('RELEASE', [])
      } else {
        // 남은 좌석들로 서버 목록 교체 (RESERVE = replace)
        sendAction('RESERVE', [...current])
      }
    } else {
      // ── 선택 추가 ───────────────────────────────────────
      current.add(seatNumber)
      sendAction('RESERVE', [...current])
    }
    
    console.log('[WS] 내 선택 현황:', [...current])
    
    const sid = scheduleIdRef.current
    if (sid != null && current.size > 0) {
      setSeatHold(sid, userIdRef.current, [...current])
    } else {
      clearSeatHold()
    }
    
    // 낙관적 업데이트 — UPDATE_OCCUPANCY 수신 전에 UI 먼저 갱신
    // 네트워크 지연 시에도 클릭이 즉각 반응하는 것처럼 보이게 함
    setWsState((prev) => ({
      ...prev,
      occupied: buildOccupiedMap([...mySeatsRef.current, ...Array.from(prev.occupied.keys()).filter(s => !mySeatsRef.current.has(s) && prev.occupied.get(s) !== prev.myId)]),
    }))
  }, [sendAction, buildOccupiedMap])
  
  /** 뒤로가기·홈 이동 등 명시적 이탈 시 즉시 RELEASE (WS + REST) */
  const releaseSeats = useCallback(() => {
    const hold =
      scheduleIdRef.current != null
        ? {scheduleId: scheduleIdRef.current, userId: userIdRef.current}
        : null
    sendAction('RELEASE', [])
    mySeatsRef.current = new Set()
    setWsState((prev) => ({...prev, occupied: new Map()}))
    void releaseSeatHoldApi(hold)
    console.log('[WS] 좌석 즉시 해제 요청')
  }, [sendAction])
  
  return {wsState, sendToggle, releaseSeats}
}

export default useWebSocket
