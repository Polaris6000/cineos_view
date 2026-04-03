/**
 * mockData.ts — 백엔드 API 연동 전 테스트용 더미 데이터
 *
 * 실제 API 연동 시 이 파일을 참고해서 응답 구조 맞추면 됨.
 * 각 movieApi.ts 함수에서 import해서 사용.
 */

/** 타입 정의 */
export interface Movie {
  id: number;
  title: string;
  genre: string;
  rating: string;
  posterUrl: string | null;
  synopsis: string;
  director: string;
  cast: string;
  runtime: number;
  startAt: string;
  endAt: string | null;
}

/**
 * 상영관 타입 필터 옵션
 * - ALL: 전체
 * - NORMAL: 일반상영관 (hasRecliner: false)
 * - RECLINER: 리클라이너 상영관 (hasRecliner: true)
 */
export const THEATER_TYPE_OPTIONS = [
  { label: '전체',            value: 'ALL'      },
  { label: '일반상영관',      value: 'NORMAL'   },
  { label: '리클라이너 상영관', value: 'RECLINER' },
] as const;

export interface Theater {
  id: number;
  name: string;
  totalSeats: number;
  rows: number;
  cols: number;
  basePrice: number;
  hasRecliner: boolean;
  hasVip: boolean;
  hasCouple: boolean;
  cleanupTime: number; // 상영 후 정리시간 (분) — 스케줄 종료시간 계산에 사용됨
}

/* ───────────────────────────────────────────────────
   1. 영화 목록 (MovieDTO)
   ─────────────────────────────────────────────────── */
export const MOCK_MOVIES = [
  {
    id: 1,
    title: '듄: 파트 2',
    genre: 'SF / 어드벤처',
    rating: '12',      // ALL / 12 / 15 / 19
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '아라키스를 정복하기 위한 폴 아트레이데스의 여정. 차니와 함께 프레멘 전사가 되어 제국에 맞선다. 황금빛 모래 위에서 펼쳐지는 장대한 전쟁과 사랑의 이야기.',
    director: '드니 빌뇌브',
    cast: '티모시 샬라메, 젠데이아, 오스틴 버틀러',
    runtime: 166,
    startAt: '2026-03-01',
    endAt: '2026-05-31',
  },
  {
    id: 2,
    title: '쿵푸팬더 4',
    genre: '애니메이션 / 코미디',
    rating: 'ALL',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '포의 새로운 여정. 진정한 영웅은 누구인가? 용의 전사의 자리를 이어받을 후계자를 찾아라. 더 강해지고 더 웃긴 쿵푸 대모험.',
    director: '마이크 미첼',
    cast: '잭 블랙, 비올라 데이비스',
    runtime: 94,
    startAt: '2026-03-15',
    endAt: '2026-06-15',
  },
  {
    id: 3,
    title: '범죄도시 5',
    genre: '액션 / 범죄',
    rating: '15',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '마석도가 돌아왔다. 이번엔 더 강한 적과 마주치는데... 마석도의 주먹은 여전히 무섭고, 악당들은 끊이질 않는다.',
    director: '이상용',
    cast: '마동석, 이준혁, 에르테긴 이미르베코프',
    runtime: 109,
    startAt: '2026-04-23',
    endAt: '2026-07-20',
  },
  {
    id: 4,
    title: '인사이드 아웃 3',
    genre: '애니메이션 / 드라마',
    rating: 'ALL',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '이제 고등학생이 된 라일리. 더 복잡해진 감정들과 새로운 감정 캐릭터의 등장. 성장통 속에서 진짜 나를 찾아가는 이야기.',
    director: '켈시 만',
    cast: '에이미 포엘러, 마야 호크',
    runtime: 100,
    startAt: '2026-04-18',
    endAt: '2026-07-10',
  },
  {
    id: 5,
    title: '가디언즈 오브 갤럭시: 레거시',
    genre: 'SF / 액션',
    rating: '12',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '가디언즈의 마지막 임무. 로켓의 과거가 밝혀지고, 팀은 최후의 싸움에 나선다. 웃음과 눈물이 공존하는 마블의 걸작.',
    director: '제임스 건',
    cast: '크리스 프랫, 조 샐다나, 브래들리 쿠퍼',
    runtime: 150,
    startAt: '2026-05-01',
    endAt: '2026-08-01',
  },
  {
    id: 6,
    title: '공조3',
    genre: '액션 / 코미디',
    rating: '15',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '강진태와 림철령의 세 번째 합작! 이번엔 유럽 무대에서 펼쳐지는 남북 공조. 더 크고 더 웃긴 국제 스케일의 버디 액션.',
    director: '이석훈',
    cast: '현빈, 유해진',
    runtime: 118,
    startAt: '2026-05-05',
    endAt: '2026-08-05',
  },
  {
    id: 7,
    title: '엑소시스트: 비기닝',
    genre: '공포 / 스릴러',
    rating: '19',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '악마와의 첫 번째 만남. 메린 신부의 시작을 다룬 프리퀄. 원작의 공포를 계승하면서도 새로운 공포를 선보인다.',
    director: '데이비드 고든 그린',
    cast: '앨런 스콧 마이어스',
    runtime: 111,
    startAt: '2026-06-13',
    endAt: null, // null이면 상영 예정
  },
  {
    id: 8,
    title: '스파이더맨: 비욘드 더 스파이더버스',
    genre: 'SF / 애니메이션',
    rating: '12',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '마일스 모랄레스의 여정은 계속된다. 멀티버스의 운명을 건 마지막 싸움. 전작의 감동을 뛰어넘는 애니메이션의 새 역사.',
    director: '호아킨 도스 산토스',
    cast: '샤메익 무어, 헤일리 스타인펠드',
    runtime: 130,
    startAt: '2026-07-04',
    endAt: null,
  },
  // 상영종료된 영화 — 전체 로그 기능 테스트용
  {
    id: 9,
    title: '오펜하이머',
    genre: '드라마 / 역사',
    rating: '15',
    posterUrl: '/placeholder-poster.jpg',
    synopsis:
      '원자폭탄의 아버지 로버트 오펜하이머의 이야기. 세상을 바꾼 발명과 그에 따른 도덕적 갈등을 그린 크리스토퍼 놀란 감독의 역작.',
    director: '크리스토퍼 놀란',
    cast: '킬리언 머피, 에밀리 블런트, 맷 데이먼',
    runtime: 180,
    startAt: '2026-01-01',
    endAt: '2026-03-15', // 이미 종영된 영화 (오늘 기준 과거)
  },
]

/** 현재 상영 중인 영화 (endAt 이 있는 것) */
export const NOW_PLAYING = MOCK_MOVIES.filter((m) => m.endAt !== null)

/** 상영 예정 영화 (endAt 이 null인 것) */
export const UPCOMING = MOCK_MOVIES.filter((m) => m.endAt === null)

/** 장르 목록 (필터용) */
export const GENRE_OPTIONS = [
  '전체', '액션', '애니메이션', 'SF', '코미디', '공포', '드라마', '어드벤처',
]

/** 등급 목록 (필터용) */
export const RATING_OPTIONS = [
  { label: '전체', value: '' },
  { label: '전체관람가', value: 'ALL' },
  { label: '12세', value: '12' },
  { label: '15세', value: '15' },
  { label: '청소년관람불가', value: '19' },
]


/* ───────────────────────────────────────────────────
   2. 요금 정책 (좌석 타입별 단가)
   일반: 5000, 리클라이너: 10000, 커플석: 15000, VIP: 7000
   청소년 할인: 2000원
   ─────────────────────────────────────────────────── */
export const SEAT_PRICES = {
  NORMAL:    5000,
  RECLINER:  10000,
  COUPLE:    15000,
  VIP:       7000,
}

/** 좌석 타입 → 표시 레이블 */
export const SEAT_TYPE_LABEL = {
  NORMAL:   '일반',
  RECLINER: '리클라이너',
  COUPLE:   '커플석',
  VIP:      'VIP',
}

/* ───────────────────────────────────────────────────
   3. 상영관 목록 (TheaterDTO)
   ─────────────────────────────────────────────────── */
export const MOCK_THEATERS = [
  {
    id: 1,
    name: '1관',
    totalSeats: 150,
    rows: 10,
    cols: 15,
    basePrice: 14000,
    hasRecliner: false,
    hasVip: true,
    hasCouple: true,
    cleanupTime: 15, // 정리시간 15분
  },
  {
    id: 2,
    name: '2관',
    totalSeats: 120,
    rows: 10,
    cols: 12,
    basePrice: 14000,
    hasRecliner: false,
    hasVip: false,
    hasCouple: true, // 마지막 행 커플석 있음
    cleanupTime: 10, // 정리시간 10분
  },
  {
    id: 3,
    name: '3관',
    totalSeats: 80,
    rows: 8,
    cols: 10,
    basePrice: 14000,
    hasRecliner: false,
    hasVip: false,
    hasCouple: true, // 마지막 행 커플석 있음
    cleanupTime: 10, // 정리시간 10분
  },
  {
    id: 4,
    name: '4관',
    totalSeats: 100,
    rows: 10,
    cols: 10,
    basePrice: 14000,
    hasRecliner: true,
    hasVip: false,
    hasCouple: false,
    cleanupTime: 20, // 리클라이너관 정리시간 20분
  },
]

/* ───────────────────────────────────────────────────
   4. 상영 일정 (ScheduleDTO)
   ─────────────────────────────────────────────────── */

/** 오늘 기준 날짜 포맷 유틸 */
const fmt = (d) => d.toISOString().slice(0, 10)

/** 오늘~6일 후 날짜 배열 */
const _today = new Date()
export const SCHEDULE_DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(_today)
  d.setDate(_today.getDate() + i)
  return fmt(d)
})

/**
 * 영화별 상영 일정
 * movieId → ScheduleItem[]
 */
export const MOCK_SCHEDULES = {
  1: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 100 + i * 3, date, startTime: '10:00', endTime: '12:46', theaterId: 1, theaterName: '1관', availableSeats: 80 + i * 3, totalSeats: 150 },
    { scheduleId: 101 + i * 3, date, startTime: '14:30', endTime: '17:16', theaterId: 1, theaterName: '1관', availableSeats: 50 + i * 2, totalSeats: 150 },
    { scheduleId: 102 + i * 3, date, startTime: '19:00', endTime: '21:46', theaterId: 1, theaterName: '1관', availableSeats: 10 + i, totalSeats: 150 },
  ]),
  2: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 200 + i * 2, date, startTime: '11:00', endTime: '12:34', theaterId: 2, theaterName: '2관', availableSeats: 60 + i * 5, totalSeats: 120 },
    { scheduleId: 201 + i * 2, date, startTime: '15:00', endTime: '16:34', theaterId: 2, theaterName: '2관', availableSeats: 30 + i * 3, totalSeats: 120 },
  ]),
  3: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 300 + i * 2, date, startTime: '13:00', endTime: '14:49', theaterId: 2, theaterName: '2관', availableSeats: 70 + i * 2, totalSeats: 120 },
    { scheduleId: 301 + i * 2, date, startTime: '19:30', endTime: '21:19', theaterId: 2, theaterName: '2관', availableSeats: 20 + i * 4, totalSeats: 120 },
  ]),
  4: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 400 + i * 2, date, startTime: '10:30', endTime: '12:10', theaterId: 4, theaterName: '4관', availableSeats: 80 + i, totalSeats: 100 },
    { scheduleId: 401 + i * 2, date, startTime: '16:00', endTime: '17:40', theaterId: 4, theaterName: '4관', availableSeats: 40 + i * 3, totalSeats: 100 },
  ]),
  5: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 500 + i * 2, date, startTime: '12:00', endTime: '14:30', theaterId: 3, theaterName: '3관', availableSeats: 30 + i * 2, totalSeats: 80 },
    { scheduleId: 501 + i * 2, date, startTime: '18:00', endTime: '20:30', theaterId: 3, theaterName: '3관', availableSeats: 5 + i, totalSeats: 80 },
  ]),
  6: SCHEDULE_DATES.flatMap((date, i) => [
    { scheduleId: 600 + i * 2, date, startTime: '11:30', endTime: '13:28', theaterId: 2, theaterName: '2관', availableSeats: 60 + i * 3, totalSeats: 120 },
    { scheduleId: 601 + i * 2, date, startTime: '20:00', endTime: '21:58', theaterId: 2, theaterName: '2관', availableSeats: 20 + i * 2, totalSeats: 120 },
  ]),
}

/* ───────────────────────────────────────────────────
   5. 좌석 맵 생성 유틸
   generateSeats(rows, cols, options) → SeatItem[]
   SeatItem: { id, row, col, status, seatType }
   status: 'empty' | 'sold_out' | 'disabled'
   seatType: 'NORMAL' | 'RECLINER' | 'COUPLE' | 'VIP'
   ─────────────────────────────────────────────────── */
export interface Seat {
  id: string;
  row: string;
  col: number;
  status: 'empty' | 'sold_out' | 'disabled';
  seatType: 'NORMAL' | 'RECLINER' | 'COUPLE' | 'VIP';
}

/**
 * generateSeats(theater) — 상영관별 고유 좌석 배치 생성
 *
 * 상영관별 레이아웃 규칙:
 *   1관 (10×15, hasVip)  : 1행(A) = VIP / 마지막행(J) = COUPLE / 나머지 = NORMAL
 *   2관 (10×12)          : 마지막행(J) = COUPLE / 좌우 끝 일부 disabled / 나머지 = NORMAL
 *   3관 (8×10)           : 마지막행(H) = COUPLE / C·D행 1번 좌석 disabled(휠체어 공간) / 나머지 = NORMAL
 *   4관 (10×10, recliner): 전 좌석 RECLINER, 커플석 없음
 *
 * sold_out 처리: 결정론적 해시 ((r*7 + c*3 + theaterId*13) % 17)로 일부 좌석 매진 표시
 *   - COUPLE / VIP 은 매진 임계값을 낮춰 희소하게 표현
 */
export function generateSeats(theater: Theater): Seat[] {
  const { id, rows, cols, hasRecliner } = theater;
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const seats: Seat[] = [];

  for (let r = 0; r < rows; r++) {
    const isLastRow = r === rows - 1; // 마지막 행 여부

    for (let c = 1; c <= cols; c++) {
      const seatId = `${rowLabels[r]}${c}`;

      /* ── 좌석 타입 결정 ── */
      let seatType: Seat['seatType'] = 'NORMAL';

      if (hasRecliner) {
        // 4관(리클라이너): 전 좌석 RECLINER, 커플석 없음
        seatType = 'RECLINER';
      } else if (isLastRow) {
        // 일반관 마지막 행: 전 좌석 COUPLE
        seatType = 'COUPLE';
      } else if (id === 1 && r === 0) {
        // 1관 A행(최전방): VIP 석
        seatType = 'VIP';
      }

      /* ── 좌석 상태 결정 ── */
      let status: Seat['status'] = 'empty';

      // 상영관별 disabled 처리 (휠체어·통로 공간)
      if (id === 2) {
        // 2관: B~F행 좌우 끝 1열 disabled (양쪽 통로 접근석)
        if ((c === 1 || c === cols) && r >= 1 && r <= 5) {
          status = 'disabled';
        }
      } else if (id === 3) {
        // 3관: C·D행(r=2,3) 1번 좌석 disabled (휠체어 공간)
        if (c === 1 && (r === 2 || r === 3)) {
          status = 'disabled';
        }
      }

      // 결정론적 sold_out 처리 (같은 입력이면 항상 같은 결과)
      if (status === 'empty') {
        const hash = (r * 7 + c * 3 + id * 13) % 17;
        // COUPLE·VIP은 희소하게(임계값 낮음), 일반석은 더 많이 매진
        const threshold = (seatType === 'COUPLE' || seatType === 'VIP') ? 2 : 5;
        if (hash < threshold) {
          status = 'sold_out';
        }
      }

      seats.push({ id: seatId, row: rowLabels[r], col: c, status, seatType });
    }
  }

  return seats;
}

/* ───────────────────────────────────────────────────
   6. 가격 정책 (PricingPolicyDTO)
   ─────────────────────────────────────────────────── */
export const MOCK_POLICIES = [
  { id: 1, name: '일반 성인',  type: 'ADULT',    discount: 0,    description: '기본 성인 요금' },
  { id: 2, name: '청소년 할인', type: 'TEEN',     discount: 2000, description: '만 13~18세, 학생증 지참' },
  { id: 3, name: '경로 우대',  type: 'SENIOR',   discount: 3000, description: '만 65세 이상, 신분증 지참' },
  { id: 4, name: '장애인 할인', type: 'DISABLED', discount: 4000, description: '장애인복지카드 지참' },
  { id: 5, name: '조조 할인',  type: 'MORNING',  discount: 3000, description: '오전 11시 이전 첫 회차' },
  { id: 6, name: '문화의 날',  type: 'CULTURE',  discount: 2000, description: '매월 마지막 수요일' },
]

/* ───────────────────────────────────────────────────
   7. 통계 데이터
   ─────────────────────────────────────────────────── */

/** 최근 30일 일별 통계 */
export const MOCK_DAILY_STATS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  const isWeekend = d.getDay() === 0 || d.getDay() === 6
  const base = isWeekend ? 350 : 180
  const tickets = base + (i * 7) % 100
  return {
    date: fmt(d),
    tickets,
    revenue: tickets * 8000,
  }
})

/** 최근 12개월 월별 통계 */
export const MOCK_MONTHLY_STATS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - (11 - i))
  const tickets = 5000 + i * 500 + (i % 3) * 1000
  return {
    month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    tickets,
    revenue: tickets * 8000,
  }
})

/** 요일별 평균 통계 (0=일 ~ 6=토) */
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토']
export const MOCK_DAY_STATS = DAYS_KR.map((day, i) => {
  const isWeekend = i === 0 || i === 6
  const tickets = isWeekend ? 420 + i * 10 : 150 + i * 30
  return { day, tickets, revenue: tickets * 8000 }
})

/** 시간대별 평균 통계 (09시~22시) */
export const MOCK_HOUR_STATS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 9
  const isPeak = hour >= 18 && hour <= 21
  const tickets = isPeak ? 90 + i * 5 : 20 + i * 3
  return {
    hour: `${String(hour).padStart(2, '0')}:00`,
    tickets,
    revenue: tickets * 8000,
  }
})

/** 영화별 통계 */
export const MOCK_MOVIE_STATS = NOW_PLAYING.map((m, i) => {
  const tickets = 1000 + (6 - i) * 800 + i * 200
  return {
    movieId: m.id,
    title: m.title,
    tickets,
    revenue: tickets * 8000,
    rating: m.rating,
  }
}).sort((a, b) => b.revenue - a.revenue)

/* ───────────────────────────────────────────────────
   8. 예약 목록 (BookingDTO) — 환불 처리용
   ─────────────────────────────────────────────────── */
export const MOCK_BOOKINGS = [
  {
    bookingId: 'BK20260329001',
    phone: '010-1234-5678',
    movieTitle: '듄: 파트 2',
    theaterName: '1관',
    date: '2026-04-15',  // 미래 날짜 — 상영시작 전 → 환불 가능 테스트용
    startTime: '19:00',
    seats: ['G7', 'G8'],
    ticketCount: 2,
    totalAmount: 10000,
    pointUsed: 0,
    pointEarned: 500,
    paymentMethod: '신용카드',
    paidAt: '2026-03-29T18:51:00',
    status: 'CONFIRMED',
    canRefund: true,
  },
  {
    bookingId: 'BK20260329002',
    phone: '010-9876-5432',
    movieTitle: '범죄도시 5',
    theaterName: '2관',
    date: '2026-03-29',
    startTime: '13:00',
    seats: ['C3'],
    ticketCount: 1,
    totalAmount: 5000,
    pointUsed: 2000,
    pointEarned: 150,
    paymentMethod: '신용카드',
    paidAt: '2026-03-29T09:01:00',
    status: 'CONFIRMED',
    canRefund: false,
  },
  {
    bookingId: 'BK20260328010',
    phone: '010-5555-7777',
    movieTitle: '쿵푸팬더 4',
    theaterName: '2관',
    date: '2026-03-28',
    startTime: '15:00',
    seats: ['D4', 'D5', 'D6'],
    ticketCount: 3,
    totalAmount: 15000,
    pointUsed: 0,
    pointEarned: 750,
    paymentMethod: '카드',
    paidAt: '2026-03-27T16:45:00',
    status: 'REFUNDED',
    canRefund: false,
  },
]

/* ───────────────────────────────────────────────────
   9. 인원 유형 / 결제 수단
   ─────────────────────────────────────────────────── */
export const PERSON_TYPES = [
  { type: 'ADULT',    label: '성인',   discount: 0 },
  { type: 'TEEN',     label: '청소년', discount: 2000 }, // 청소년 2000원 할인
  { type: 'SENIOR',   label: '경로',   discount: 3000 },
  { type: 'DISABLED', label: '장애인', discount: 4000 },
]

/**
 * 결제 수단 — 현금·네이버페이 제거, 카드 및 간편결제만 지원
 */
export const PAYMENT_METHODS = [
  { id: 'CARD',   label: '신용/체크카드' },
  { id: 'KAKAO',  label: '카카오페이' },
  { id: 'TOSS',   label: '토스' },
] as const; // 값을 읽기 전용 상수로 고정
