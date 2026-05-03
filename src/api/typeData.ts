// TMDB 포스터 URL 변환 함수 import (apiClient에서 관리)
// MovieDTO/ScheduleDTO/TheaterDTO는 이 파일에 직접 정의 — 중복 import 금지
import {getKSTDateString, resolvePosterUrl} from './apiClient'
// 상영관 좌석 배치 고정 상수 — 고객용 API는 theater 객체를 null로 반환하므로
// 좌석 수·리클라이너 여부를 이 파일에서 결정
import {DEFAULT_THEATER_CONFIG, THEATER_CONFIG} from '../config/theaterConfig'

/* 공용 함수 정의 */
// KST 기준 오늘 날짜 ('YYYY-MM-DD')
// ⚠️ toISOString()은 UTC 기준이라 한국(UTC+9) 자정~오전 9시 사이에 날짜가 하루 어긋남
// → toLocaleDateString('en-CA')를 사용하는 getKSTDateString()으로 교체
export const today = getKSTDateString()
export const now = new Date()


/** 타입 정의 */
export interface Movie {
    id: number;
    title: string;
    genre: string;
    rating: string;
    posterUrl: string;
    synopsis: string;
    director: string;
    cast: string;
    runtime: number;
    startAt: string;
    endAt: string;
}

//dto 정보
export interface MovieDTO {
    movieId: number;
    title: string;
    genre: string;
    rating: string;
    runtime: number;
    director: string;
    actors: string;
    description: string;
    startAt: string;
    endAt: string;
    createAt: string;
    posterPath: string | null;  // TMDB 경로 또는 null — resolvePosterUrl()로 변환
}

//변환 메소드
export const mapToMovie = (movieDTO: MovieDTO): Movie => ({
    id: movieDTO.movieId,
    title: movieDTO.title,
    genre: movieDTO.genre,
    rating: movieDTO.rating,
    // posterPath → TMDB CDN URL 또는 절대 경로로 변환 (이전: "/poster" + title 잘못된 수식 수정)
    posterUrl: resolvePosterUrl(movieDTO.posterPath),
    synopsis: movieDTO.description,
    director: movieDTO.director,
    cast: movieDTO.actors,
    runtime: movieDTO.runtime,
    // ?. + ?? '' : endAt이 null인 영화(상영 예정 등 종료일 미정)에도 안전하게 처리
    startAt: movieDTO.startAt?.slice(0, 10) ?? '',
    endAt: movieDTO.endAt?.slice(0, 10) ?? '',
})

export interface Schedule {
    scheduleId: number;
    date: string;
    startTime: string;
    endTime: string;
    theaterId: number;
    theaterName: string;
    availableSeats: number;
    totalSeats: number;
    movieId: number;
    isRecliner: boolean; // 리클라이너 상영관 여부 (seatPolicy.name === "Recliner")
}

export interface ScheduleDTO {
    id: number;
    theater: TheaterDTO | null; // 상영관 객체 — admin API는 중첩 객체, customer API는 null(no 필드로 대체)
    no: number;                 // 상영관 번호 — 항상 존재 (customer/admin 공통 최상위 필드)
    movie: MovieDTO | null;     // 영화 객체 — admin API는 중첩 객체, customer API는 null(movieId 필드로 대체)
    movieId: number;            // 영화 ID — 항상 존재 (customer/admin 공통 최상위 필드)
    startAt: string;
    endAt: string;
    activation: boolean;
}

export const mapToSchedule = (scheduleDTO: ScheduleDTO): Schedule => {
    // customer API는 theater/movie 중첩 객체 없이 no/movieId를 최상위로 반환
    // → optional chaining + fallback으로 양쪽 모두 대응
    const theaterNo = scheduleDTO.theater?.no ?? scheduleDTO.no
    const movieId = scheduleDTO.movie?.movieId ?? scheduleDTO.movieId

    // 고객용 API는 theater: null을 반환하므로 seatPolicy를 직접 참조할 수 없음
    // → theaterConfig.ts의 고정 상수에서 rows·cols·hasRecliner를 가져옴
    // → 관리자 API처럼 theater 객체가 있을 때는 seatPolicy.name으로 우선 판별
    const config = THEATER_CONFIG[theaterNo] ?? DEFAULT_THEATER_CONFIG
    const isRecliner = scheduleDTO.theater?.seatPolicy?.name === "리클라이너"
        ? true
        : config.hasRecliner

    return {
        scheduleId: scheduleDTO.id,
        date: scheduleDTO.startAt.substring(0, 10),
        startTime: scheduleDTO.startAt.substring(11, 16),
        endTime: scheduleDTO.endAt.substring(11, 16),
        theaterId: theaterNo,
        theaterName: theaterNo + "관",
        availableSeats: config.rows * config.cols,
        totalSeats: config.rows * config.cols,
        movieId,
        isRecliner,
    }
}

export interface Theater {
    id: number;
    name: string;
    totalSeats: number;
    rows: number;
    cols: number;
    basePrice: number;
    hasRecliner: boolean;
    // hasVip 제거 — VIP석 운용하지 않음 (일반/리클라이너/커플만 사용)
    hasCouple: boolean;
    cleanupTime: number; // 상영 후 정리시간 (분) — 스케줄 종료시간 계산에 사용됨
}

export interface TheaterDTO {
    no: number;
    seatPolicy: {
        policyId: number;
        name: string;
        cost: number;
    };
    cleanupTime: number;
}

export const mapToTheater = (theaterDTO: TheaterDTO): Theater => ({
    id: theaterDTO.no,
    name: theaterDTO.no + "관",
    totalSeats: (theaterDTO.no + 4) * (theaterDTO.no + 7),
    rows: theaterDTO.no + 4,
    cols: theaterDTO.no + 7,
    basePrice: theaterDTO.seatPolicy.cost,
    hasRecliner: theaterDTO.seatPolicy?.name === "리클라이너",
    hasCouple: false,
    cleanupTime: theaterDTO.cleanupTime
})

export interface PaymentDetailes {
    bookingId: string,
    phone: string,
    movieTitle: string,
    theaterName: string,
    date: string,  // 미래 날짜 — 상영시작 전 → 환불 가능 테스트용
    startTime: string,
    seats: string[],
    ticketCount: number,
    totalAmount: number,
    pointUsed: number,
    pointEarned: number,
    paymentMethod: string,
    paidAt: string,
    status: string,
    canRefund: boolean,
}

export interface ReservationDetailesDTO {
    id: string;
    schedule: ScheduleDTO;
    phone: MemberDTO;
    seats: ReservationSeatDTO[];
    returned: boolean;
    createAt: string;
}

export interface MemberDTO {
    phone: string;
    point: number;
    createAt: string;
}

export interface ReservationSeatDTO {
    id: number;
    reservationDetailsId: string;
    seatNumber: string;
}

export interface SocketSeat {
    userId: string;
    scheduleId: number;
    seats: any[];
    action: string //"GET", "RESERVE", "RELEASE"
}


export interface BookingDTO {
    bookingId: string;
    phone: string;
    movieTitle: string;
    theaterName: string;
    date: string;  // 미래 날짜 — 상영시작 전 → 환불 가능 테스트용
    startTime: string;
    seats: string[];
    ticketCount: number;
    totalAmount: number;
    pointUsed: number;
    pointEarned: number;
    paymentMethod: string;
    paidAt: string;
    status: string;
    canRefund: boolean;
    paymentKey: string;
}

export interface PaymentDTO {
    id: string;
    cost: number;
    createAt: string;
    paymentKey: string;
    status: string;
    usePoint: number;
    bonusPolicy: {
        activation: boolean;
        endAt: string;
        giveValue: number;
        id: number;
        policyName: string;
        startAt: string;
    };
    couponNum: {
        couponNum: string;
        status: boolean;
        discountPolicy: {
            id: number;
            policyName: string;
            discountType: string;
            discountValue: number;
            conditionType: string;
            startAt: string;
            endAt: string;
            activation: boolean;
        }
    };
    reservation: ReservationDetailesDTO
}

export const mapToBooking = (paymentDTO: PaymentDTO): BookingDTO => ({
    bookingId: paymentDTO.id,
    // status가 PAY일 때만 환불 가능
    canRefund: paymentDTO.status === "PAY",
    date: paymentDTO.reservation.schedule.startAt.slice(0, 10),
    movieTitle: paymentDTO.reservation.schedule.movie?.title ?? '',
    paidAt: paymentDTO.createAt,
    paymentKey: paymentDTO.paymentKey,
    // paymentKey가 "POINT"면 포인트 전액 결제, 아니면 카드 결제
    paymentMethod: paymentDTO.paymentKey === "POINT" ? "POINT" : "CARD",
    phone: paymentDTO.reservation.phone?.phone ?? '-',
    // 포인트 적립량: 결제금액 × 적립비율(%) / 100
    pointEarned: paymentDTO.bonusPolicy != null
        ? paymentDTO.cost * paymentDTO.bonusPolicy.giveValue / 100
        : 0,
    pointUsed: paymentDTO.usePoint,
    seats: paymentDTO.reservation.seats.map(s => s.seatNumber),
    startTime: paymentDTO.reservation.schedule.startAt.slice(11, 16),
    status: paymentDTO.status,
    theaterName: (paymentDTO.reservation.schedule.theater?.no ?? paymentDTO.reservation.schedule.no) + "관",
    ticketCount: paymentDTO.reservation.seats.length,
    totalAmount: paymentDTO.cost,
})