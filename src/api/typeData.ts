// TMDB 포스터 URL 변환 함수 import (apiClient에서 관리)
// MovieDTO/ScheduleDTO/TheaterDTO는 이 파일에 직접 정의 — 중복 import 금지
import {getKSTDateString, resolvePosterUrl} from './apiClient'

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
    theater: TheaterDTO; // 상영관 정보 FK (JPA 전용)
    no: number; // 상영관 FK
    movie: MovieDTO; // 영화 번호 FK (JPA 전용)
    movieId: number; // 영화관 FK
    startAt: string; // 상영 시작 시간
    endAt: string; // 상영 종료 시간
    activation: boolean;
}

export const mapToSchedule = (scheduleDTO: ScheduleDTO): Schedule => ({
    scheduleId: scheduleDTO.id,
    date: scheduleDTO.startAt.substring(0, 10),
    startTime: scheduleDTO.startAt.substring(11, 16),
    endTime: scheduleDTO.endAt.substring(11, 16),
    theaterId: scheduleDTO.theater.no,
    theaterName: scheduleDTO.theater.no + "관",
    availableSeats: (scheduleDTO.theater.no + 4) * (scheduleDTO.theater.no + 7),
    totalSeats: (scheduleDTO.theater.no + 4) * (scheduleDTO.theater.no + 7),
    movieId: scheduleDTO.movie.movieId,
    isRecliner: scheduleDTO.theater.seatPolicy?.name === "리클라이너",
})

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
    movieTitle: paymentDTO.reservation.schedule.movie.title,
    paidAt: paymentDTO.createAt,
    paymentKey: paymentDTO.paymentKey,
    // paymentKey가 "POINT"면 포인트 전액 결제, 아니면 카드 결제
    paymentMethod: paymentDTO.paymentKey === "POINT" ? "POINT" : "CARD",
    phone: paymentDTO.reservation.phone.phone,
    // 포인트 적립량: 결제금액 × 적립비율(%) / 100
    pointEarned: paymentDTO.cost * paymentDTO.bonusPolicy.giveValue / 100,
    pointUsed: paymentDTO.usePoint,
    seats: paymentDTO.reservation.seats.map(s => s.seatNumber),
    startTime: paymentDTO.reservation.schedule.startAt.slice(11, 16),
    status: paymentDTO.status,
    theaterName: paymentDTO.reservation.schedule.theater.no + "관",
    // ticketCount: 예매 좌석 개수 = 인원 수 (이전 버그: 파일 잘려서 truncated 상태였음)
    ticketCount: paymentDTO.reservation.seats.length,
    totalAmount: paymentDTO.cost,
})
