/**
 * seatLayoutStore.ts — 상영관별 커스텀 좌석 배치 전역 저장소
 *
 * 어드민 SeatEditPage에서 편집한 좌석 배치를 여기에 저장하면,
 * 고객 SeatPage에서도 동일 데이터를 참조합니다.
 *
 * 실제 서비스에서는 PATCH /api/admin/theaters/:id/seats API 연동으로 대체.
 * 현재는 모듈 수준 싱글턴 Map으로 인메모리 관리.
 *
 * 사용:
 *   import { getSeatLayout, setSeatLayout } from '../../store/seatLayoutStore'
 *   const seats = getSeatLayout(theaterId, fallbackGenerator)
 *   setSeatLayout(theaterId, modifiedSeats)
 */
// mockData 의존성 제거 — 이 store는 현재 사용되지 않음 (SeatPage는 실 API 사용)
// 추후 어드민 좌석 편집 기능 구현 시 실 API로 교체 예정

/** 좌석 상태 타입 */
type SeatStatus = 'empty' | 'selected' | 'sold_out' | 'occupied'

/** 좌석 인터페이스 */
interface Seat {
  id:       string
  row:      string
  col:      number
  seatType: 'NORMAL' | 'RECLINER'
  status:   SeatStatus
}

/** 상영관 인터페이스 (미사용 — 타입 재export용 유지) */
interface Theater {
  id:          number
  name:        string
  rows:        number
  cols:        number
  hasRecliner: boolean
}

/** theaterId → Seat[] 매핑 */
const store = new Map<number, Seat[]>()

/**
 * 해당 상영관의 좌석 배치를 가져옵니다.
 * - 커스텀 배치가 저장돼 있으면 그것을 반환
 * - 없으면 generateSeats(theater)로 기본 배치 생성 후 저장
 */
/**
 * 좌석 배치를 가져옵니다.
 * - 커스텀 배치가 저장돼 있으면 그것을 반환
 * - 없으면 빈 배열 반환 (실 API 기반으로 교체 예정)
 */
export function getSeatLayout(theaterId: number, soldOutSeats: string[]): Seat[] {
  if (!store.has(theaterId)) return []

  const baseSeats = store.get(theaterId)!
  // 저장된 배치에 현재 매진 좌석 상태 반영
  return baseSeats.map((s) => ({
    ...s,
    status: soldOutSeats.includes(s.id) ? 'sold_out' : s.status,
  }))
}

/**
 * 어드민이 편집한 좌석 배치를 저장합니다.
 * 이후 고객 SeatPage에서 getSeatLayout() 호출 시 이 데이터를 받습니다.
 */
export function setSeatLayout(theaterId: number, seats: Seat[]): void {
  store.set(theaterId, seats.map((s) => ({ ...s })))
}

/**
 * 특정 상영관 배치를 초기 기본값으로 리셋합니다.
 */
/**
 * 특정 상영관 배치를 초기화합니다. (실 API 연동 전까지 빈 배열 반환)
 */
export function resetSeatLayout(theaterId: number): Seat[] {
  store.delete(theaterId)
  return []
}

/**
 * 변경 사항 여부 확인 (어드민 UI에서 "저장 전 변경됨" 표시용)
 */
export function hasCustomLayout(theaterId: number): boolean {
  return store.has(theaterId)
}

// ── 유틸: theater 타입 재export (사용처 편의용) ──
export type { Seat, Theater }
