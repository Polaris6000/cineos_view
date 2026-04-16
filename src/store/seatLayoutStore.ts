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
import { generateSeats, MOCK_THEATERS, type Seat, type Theater } from '../api/mockData'

/** theaterId → Seat[] 매핑 */
const store = new Map<number, Seat[]>()

/**
 * 해당 상영관의 좌석 배치를 가져옵니다.
 * - 커스텀 배치가 저장돼 있으면 그것을 반환
 * - 없으면 generateSeats(theater)로 기본 배치 생성 후 저장
 */
export function getSeatLayout(theaterId: number, soldOutSeats: string[]): Seat[] {
  let baseSeats: Seat[] = [];

  if (store.has(theaterId)) {
    // 1. 저장된 기본 배치를 가져옴
    baseSeats = store.get(theaterId)!;
  } else {
    // 2. 없으면 생성해서 저장
    const theater = MOCK_THEATERS.find((t) => t.id === theaterId);
    if (!theater) return [];
    
    // 처음 생성 시에는 soldOutSeats 없이 기본 배치만 생성하는 것이 관리에 용이합니다.
    baseSeats = generateSeats(theater, []); 
    store.set(theaterId, baseSeats.map((s) => ({ ...s })));
  }

  // 3. [핵심] 가져온 기본 배치에 현재 넘어온 soldOutSeats 정보를 실시간으로 입힘
  return baseSeats.map((s) => ({
    ...s,
    // 만약 현재 좌석 ID가 서버에서 넘어온 soldOutSeats에 포함되어 있다면 상태를 변경
    status: soldOutSeats.includes(s.id) ? 'sold_out' : s.status
  }));
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
export function resetSeatLayout(theaterId: number): Seat[] {
  const theater = MOCK_THEATERS.find((t) => t.id === theaterId)
  if (!theater) return []
  const seats = generateSeats(theater)
  store.set(theaterId, seats.map((s) => ({ ...s })))
  return seats.map((s) => ({ ...s }))
}

/**
 * 변경 사항 여부 확인 (어드민 UI에서 "저장 전 변경됨" 표시용)
 */
export function hasCustomLayout(theaterId: number): boolean {
  return store.has(theaterId)
}

// ── 유틸: theater 타입 재export (사용처 편의용) ──
export type { Seat, Theater }
