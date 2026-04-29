// 인원 타입별 할인 금액 (단위: 원)
// 할인 정책이 바뀌면 여기서만 수정하면 됨
export const DISCOUNT_AMOUNT = {
  adult:  0,     // 성인 - 할인 없음
  teen:   2000,  // 청소년
  child:  2000,  // 유아
  senior: 3000,  // 경로
} as const

// 인원 타입 목록 - SeatPage / PaymentPage 공용
// type 값은 백엔드 TicketType enum과 일치해야 함
export const PERSON_TYPES: { type: string; label: string; discount: number }[] = [
  { type: 'adult',  label: '성인',   discount: DISCOUNT_AMOUNT.adult  },
  { type: 'teen',   label: '청소년', discount: DISCOUNT_AMOUNT.teen   },
  { type: 'child',  label: '유아',   discount: DISCOUNT_AMOUNT.child  },
  { type: 'senior', label: '경로',   discount: DISCOUNT_AMOUNT.senior },
]

// 포인트 적립률 (5%)
export const POINT_RATE = 0.05
