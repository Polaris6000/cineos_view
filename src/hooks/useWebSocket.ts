/**
 * useWebSocket.ts — 좌석 실시간 상태 관리 커스텀 훅
 *
 * 백엔드 WebSocket 핸들러(MyWebSocketHanler.java)와 연동:
 *  - 연결 URL: ws://host/ws/seats?scheduleId={id}&userId={uuid}
 *  - scheduleId: 현재 상영 일정 ID
 *  - userId: 클라이언트 고유 UUID (프론트에서 생성·유지)
 *
 * 메시지 프로토콜:
 *  [수신] INIT_STATE: { type, reserved: string[], occupied: string[], myId: string }
 *    - reserved: DB에 예약 확정된 좌석 번호 목록 ["A1", "B3", ...]
 *    - occupied: 임시점유 정보 ["scheduleId:seatNumber:userId", ...]
 *    - myId: 서버가 확인해준 내 UUID
 *
 *  [수신] OCCUPIED: { type, seats: ["scheduleId:seatNumber:userId", ...], actionBy: string }
 *    - 누군가 좌석을 점유했을 때 전체 브로드캐스트
 *
 *  [수신] RELEASED: { type, seats: ["scheduleId:seatNumber:userId", ...], actionBy: string }
 *    - 누군가 좌석을 해제했을 때 전체 브로드캐스트
 *
 *  [송신] { scheduleId: number, seats: [{ seatNumber: string }] }
 *    - 좌석 클릭 시 토글 요청 (점유 중이면 해제, 아니면 점유)
 */
import { useEffect, useRef, useState, useCallback } from 'react'

/* ── 타입 정의 ─────────────────────────────────────────────── */

/**
 * 서버에서 내려오는 WebSocket 메시지 타입
 */
interface WsIncomingMessage {
  type: 'INIT_STATE' | 'OCCUPIED' | 'RELEASED'
  // INIT_STATE 전용
  reserved?: string[]   // 예약 완료 좌석 번호 목록
  occupied?: string[]   // "scheduleId:seatNumber:userId" 형식 목록
  myId?: string         // 내 UUID
  // OCCUPIED / RELEASED 전용
  seats?: string[]      // "scheduleId:seatNumber:userId" 형식 목록
  actionBy?: string     // 액션 수행자 UUID
}

/**
 * 훅이 외부에 공개하는 좌석 상태
 */
export interface WsSeatState {
  /** DB에 예약 확정된 좌석 번호 Set */
  reserved: Set<string>
  /** 현재 임시점유 중인 좌석: seatNumber → userId */
  occupied: Map<string, string>
  /** 내 UUID (나의 점유 구분용) */
  myId: string
  /** WebSocket 연결 상태 */
  connected: boolean
}

/**
 * 훅 반환값
 */
export interface UseWebSocketReturn {
  /** 현재 좌석 상태 스냅샷 */
  wsState: WsSeatState
  /**
   * 좌석 토글 메시지 송신
   * @param seatNumber - 좌석 번호 (예: "A1", "B5")
   */
  sendToggle: (seatNumber: string) => void
}

/* ── 상수 ──────────────────────────────────────────────────── */

/**
 * WebSocket 서버 기본 주소
 *  - 개발: Vite dev server는 WS를 프록시하지 않으므로 직접 백엔드 주소 사용
 *  - 프로덕션: Spring Boot가 정적 파일 + WS 모두 서빙 → 동일 host 사용
 */
const WS_BASE = import.meta.env.DEV
  ? 'ws://localhost:8080'                        // 개발: 백엔드 직접 연결
  : `ws://${window.location.host}`               // 프로덕션: 동일 호스트

/** 재연결 시도 최대 횟수 */
const MAX_RETRY = 3
/** 재연결 간격 (ms) */
const RETRY_DELAY_MS = 2_000

/* ── 훅 본체 ───────────────────────────────────────────────── */

/**
 * useWebSocket — 좌석 실시간 상태 훅
 *
 * @param scheduleId - 현재 상영 일정 ID (null이면 연결하지 않음)
 * @returns wsState, sendToggle
 *
 * 사용 예:
 *   const { wsState, sendToggle } = useWebSocket(schedule.id)
 *   // 내 좌석: wsState.occupied에서 userId === wsState.myId 인 것
 *   // 남의 좌석: wsState.occupied에서 userId !== wsState.myId 인 것
 *   // 예약완료: wsState.reserved
 */
export function useWebSocket(scheduleId: number | null): UseWebSocketReturn {
  // ── 상태 ──────────────────────────────────────────────────
  const [wsState, setWsState] = useState<WsSeatState>({
    reserved:  new Set(),
    occupied:  new Map(),
    myId:      '',
    connected: false,
  })

  // ── refs (렌더링과 무관하게 최신값 유지) ──────────────────
  /**
   * WebSocket 인스턴스 ref
   * 클로저 문제 없이 최신 ws에 접근하기 위해 ref 사용
   */
  const wsRef         = useRef<WebSocket | null>(null)
  /**
   * scheduleId ref — 재연결 시 최신 scheduleId 참조
   */
  const scheduleIdRef = useRef<number | null>(scheduleId)
  /**
   * userId ref — 재연결 시 동일 UUID 재사용
   * 컴포넌트가 살아있는 동안 UUID를 유지해야 서버가 재연결로 인식함
   */
  const userIdRef     = useRef<string>(crypto.randomUUID())
  /**
   * 재시도 횟수 ref
   */
  const retryCount    = useRef(0)

  // scheduleIdRef를 최신으로 유지
  useEffect(() => {
    scheduleIdRef.current = scheduleId
  }, [scheduleId])

  // ── 유틸: occupied 문자열 파싱 ────────────────────────────
  /**
   * "scheduleId:seatNumber:userId" 형식 문자열을 파싱
   * 예: "1:A3:550e8400-..." → { seatNumber: "A3", userId: "550e8400-..." }
   * 주의: seatNumber에는 콜론이 없지만 UUID에는 있으므로 앞 2개 항목만 제거
   */
  const parseOccupied = useCallback((raw: string): { seatNumber: string; userId: string } | null => {
    // 첫 번째 ':' 이후가 "seatNumber:userId"
    const firstColon = raw.indexOf(':')
    if (firstColon === -1) return null
    const rest = raw.slice(firstColon + 1)

    // 두 번째 ':' 이후가 userId (UUID 포함)
    const secondColon = rest.indexOf(':')
    if (secondColon === -1) return null

    return {
      seatNumber: rest.slice(0, secondColon),
      userId:     rest.slice(secondColon + 1),
    }
  }, [])

  // ── WebSocket 연결 함수 ────────────────────────────────────
  const connect = useCallback(() => {
    const sid = scheduleIdRef.current
    if (sid === null) return  // scheduleId 없으면 연결 안 함

    const url = `${WS_BASE}/ws/seats?scheduleId=${sid}&userId=${userIdRef.current}`
    console.log('[WS] 연결 시도:', url)

    const ws = new WebSocket(url)
    wsRef.current = ws

    // 연결 성공
    ws.onopen = () => {
      console.log('[WS] 연결 성공')
      retryCount.current = 0  // 재시도 카운터 리셋
      setWsState((prev) => ({ ...prev, connected: true }))
    }

    // 메시지 수신
    ws.onmessage = (event: MessageEvent) => {
      let msg: WsIncomingMessage
      try {
        msg = JSON.parse(event.data) as WsIncomingMessage
      } catch {
        console.warn('[WS] JSON 파싱 실패:', event.data)
        return
      }

      console.log('[WS] 메시지 수신:', msg.type, msg)

      if (msg.type === 'INIT_STATE') {
        // ── 초기 상태 설정 ──────────────────────────────────
        // reserved: 예약 완료 좌석 번호 배열 → Set 변환
        const reservedSet = new Set<string>(msg.reserved ?? [])

        // occupied: "scheduleId:seatNumber:userId" 목록 → Map 변환
        const occupiedMap = new Map<string, string>()
        ;(msg.occupied ?? []).forEach((raw) => {
          const parsed = parseOccupied(raw)
          if (parsed) occupiedMap.set(parsed.seatNumber, parsed.userId)
        })

        setWsState({
          reserved:  reservedSet,
          occupied:  occupiedMap,
          myId:      msg.myId ?? userIdRef.current,
          connected: true,
        })

      } else if (msg.type === 'OCCUPIED') {
        // ── 좌석 점유 브로드캐스트 ──────────────────────────
        setWsState((prev) => {
          const nextOccupied = new Map(prev.occupied)
          ;(msg.seats ?? []).forEach((raw) => {
            const parsed = parseOccupied(raw)
            if (parsed) nextOccupied.set(parsed.seatNumber, parsed.userId)
          })
          return { ...prev, occupied: nextOccupied }
        })

      } else if (msg.type === 'RELEASED') {
        // ── 좌석 해제 브로드캐스트 ──────────────────────────
        setWsState((prev) => {
          const nextOccupied = new Map(prev.occupied)
          ;(msg.seats ?? []).forEach((raw) => {
            const parsed = parseOccupied(raw)
            if (parsed) nextOccupied.delete(parsed.seatNumber)
          })
          return { ...prev, occupied: nextOccupied }
        })
      }
    }

    // 에러 핸들링
    ws.onerror = (err) => {
      console.error('[WS] 연결 오류:', err)
    }

    // 연결 종료
    ws.onclose = (event) => {
      console.warn('[WS] 연결 종료 (code:', event.code, ')')
      setWsState((prev) => ({ ...prev, connected: false }))

      // ── 재연결 시도 (비정상 종료 시) ──────────────────────
      // code 1000: 정상 종료 → 재연결 안 함
      // 그 외: 네트워크 오류 등 → MAX_RETRY 횟수만큼 재시도
      if (event.code !== 1000 && retryCount.current < MAX_RETRY) {
        retryCount.current++
        console.log(`[WS] ${RETRY_DELAY_MS}ms 후 재연결 시도 (${retryCount.current}/${MAX_RETRY})`)
        setTimeout(connect, RETRY_DELAY_MS)
      } else if (retryCount.current >= MAX_RETRY) {
        console.error('[WS] 재연결 한도 초과 — WebSocket 기능 비활성화')
      }
    }
  }, [parseOccupied])

  // ── 연결 수명주기 관리 ────────────────────────────────────
  useEffect(() => {
    if (scheduleId === null) return  // scheduleId 없으면 연결 안 함

    connect()

    // cleanup: 컴포넌트 언마운트(페이지 이탈) 시 WebSocket 연결 해제
    // → 서버는 연결 종료 후 10초 대기 후 점유 좌석 자동 해제
    return () => {
      console.log('[WS] 정리 — 연결 종료')
      const ws = wsRef.current
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'component unmount')
      }
      wsRef.current = null
    }
  // connect는 useCallback으로 메모이제이션돼 있어 scheduleId 변경 시에만 재실행됨
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])

  // ── 좌석 토글 송신 ────────────────────────────────────────
  /**
   * sendToggle — 좌석 번호를 서버에 토글 요청
   * 서버 로직:
   *   - 점유 중이 아닌 좌석 → 점유 등록 (OCCUPIED 브로드캐스트)
   *   - 내가 점유한 좌석 → 점유 해제 (RELEASED 브로드캐스트)
   *   - 남이 점유한 좌석 → 무시 (프론트에서 클릭 막아야 함)
   */
  const sendToggle = useCallback((seatNumber: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] 전송 실패 — 연결되지 않음')
      return
    }

    const sid = scheduleIdRef.current
    if (sid === null) return

    const payload = {
      scheduleId: sid,
      seats: [{ seatNumber }],
    }

    ws.send(JSON.stringify(payload))
    console.log('[WS] 토글 전송:', payload)
  }, [])

  return { wsState, sendToggle }
}
