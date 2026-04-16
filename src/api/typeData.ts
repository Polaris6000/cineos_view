/* 공용 함수 정의*/
export const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
export const now = new Date


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
}

//변환 메소드
export const mapToMovie = (movieDTO: MovieDTO): Movie => ({
    id: movieDTO.movieId,
    title: movieDTO.title,
    genre: movieDTO.genre,
    rating: movieDTO.rating,
    posterUrl: "/poster" + movieDTO.title,
    synopsis: movieDTO.description,
    director: movieDTO.director,
    cast: movieDTO.actors,
    runtime: movieDTO.runtime,
    "startAt": movieDTO.startAt.slice(0, 10),
    endAt: movieDTO.endAt.slice(0, 10)
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
    movieId: scheduleDTO.movie.movieId
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
    hasRecliner: theaterDTO.seatPolicy.name == "Recliner",
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

export const mapToBooking = (paymentDTO : PaymentDTO) : BookingDTO => ({
    bookingId : paymentDTO.id,
    canRefund : paymentDTO.status === "PAY" ? true : false,
    date : paymentDTO.reservation.schedule.startAt.slice(0,10),
    movieTitle : paymentDTO.reservation.schedule.movie.title,
    paidAt : paymentDTO.createAt,
    paymentKey : paymentDTO.paymentKey,
    paymentMethod : paymentDTO.paymentKey === "POINT" ? "POINT" : "CARD" ,
    phone : paymentDTO.reservation.phone.phone,
    pointEarned: paymentDTO.cost * paymentDTO.bonusPolicy.giveValue / 100,
    pointUsed: paymentDTO.usePoint,
    seats: paymentDTO.reservation.seats.map(s => s.seatNumber),
    startTime:paymentDTO.reservation.schedule.startAt.slice(11,16),
    status:paymentDTO.status,
    theaterName: paymentDTO.reservation.schedule.theater.no + "관",
    ticketCount:  paymentDTO.reservation.seats.map(s => s.seatNumber).length,
    totalAmount: paymentDTO.cost + paymentDTO.usePoint
})