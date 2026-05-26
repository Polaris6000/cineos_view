/**
 * SchedulePage.jsx — 시간·인원 선택
 *
 * 동작 흐름:
 *  1. 당일 상영 시간 선택 (날짜 선택 제거 — 당일 예매만 지원)
 *  2. 인원 유형별 수 선택 (성인/청소년/경로/장애인)
 *  3. "다음: 좌석 선택" → SeatPage 로 이동하며 예매 정보 전달
 *
 * state 수신:
 *  - location.state.movieId     : 영화 ID
 *  - location.state.movieTitle  : 영화 제목
 *  - location.state.preSelectedSchedule (선택적): 상세 페이지에서 미리 선택한 시간
 *
 * 변경사항:
 *  - 날짜 선택 제거 → 오늘 날짜로 고정 (당일 예매만 가능)
 *  - preSelectedSchedule 지원 → 상세 페이지에서 시간 클릭 시 자동 선택
 *  - STEP 번호 재정렬 (1: 시간 선택, 2: 인원 선택)
 */
import {useEffect, useMemo, useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {ChevronDown, ChevronLeft, ChevronUp, Clock, Film, Info, Users} from 'lucide-react'
import axios from 'axios'

import {mapToSchedule, mapToTheater, ReservationDetailesDTO, Schedule, ScheduleDTO, Theater} from '../../api/typeData'
import {fetchEarlyBirdAmount, fetchPersonTypes, isEarlyBirdTime, PersonType} from '../../api/discountApi'

// API 호출 실패 시 사용하는 하드코딩 폴백값
const DEFAULT_PERSON_TYPES: PersonType[] = [
  {type: 'adult', label: '성인', discount: 0},
  {type: 'teen', label: '청소년', discount: 2000},
  {type: 'senior', label: '경로', discount: 3000},
]

/** 날짜 포맷: "03/29(토)" */
function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}(${days[d.getDay()]})`
}

/** 상영 시작 후 예매를 허용할 유예 시간 (분) */
const BOOKING_GRACE_MINUTES = 10

/**
 * 예매 불가 상태인지 확인
 * 상영 시작 후 BOOKING_GRACE_MINUTES분이 지났을 때 비로소 예매 불가 처리
 * daySchedules는 이미 오늘 날짜 기준이므로 시분 비교만으로 충분
 * now를 외부에서 주입받아 setInterval 갱신 시 최신 시각을 반영
 */
function isPast(startTime: string, now: Date): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const deadline = new Date(now)
  // 시작 시각 + 유예 시간 = 실제 예매 마감 시각
  deadline.setHours(h, m + BOOKING_GRACE_MINUTES, 0, 0)
  return now > deadline
}

/**
 * 상영이 이미 시작됐지만 유예 시간 내(= 예매 가능)인지 확인
 * isPast가 false이고 현재 시각이 시작 시각을 넘은 경우
 */
function isOngoing(startTime: string, now: Date): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date(now)
  start.setHours(h, m, 0, 0)
  return now > start
}

function SchedulePage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 이전 페이지(MovieDetail)에서 넘겨받은 movieId, movieTitle, preSelectedSchedule
  const {movieId, movieTitle, preSelectedSchedule} = location.state ?? {}
  
  // movieId 없으면 홈으로 리다이렉트
  if (!movieId) {
    navigate('/')
    return null
  }
  
  // 영화 정보는 location.state.movieTitle로 전달받으므로 별도 API 호출 불필요
  // (백엔드에 GET /api/movie/{id} 단건 조회 엔드포인트 없음 — MovieController 확인)
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [theater, setTheater] = useState<Theater>();
  
  // 전체 ScheduleDTO 목록 저장 — selectedSched 변경 시 올바른 theater 매핑에 사용
  const [rawScheduleDTOs, setRawScheduleDTOs] = useState<ScheduleDTO[]>([])
  
  // 인원 타입별 할인 정보 (API에서 로드, 실패 시 폴백값 사용)
  const [personTypes, setPersonTypes] = useState<PersonType[]>(DEFAULT_PERSON_TYPES)
  
  // 조조 할인 1인당 금액 (API에서 로드, 오전 10시 이전 상영에만 적용)
  const [earlyBirdPerPerson, setEarlyBirdPerPerson] = useState<number>(0)
  
  useEffect(() => {
    const axiosSchedule = async () => {
      try {
        // movieId에 해당하는 스케줄만 반환하는 고객용 API 사용
        // 기존 /schedule/DTOlist(전체조회 후 클라이언트 필터)에서 변경
        const {data} = await axios.get<ScheduleDTO[]>(`/api/schedule/${movieId}/movie`)
        
        const formattedSchedule = data.map((dto) => mapToSchedule(dto))
        
        setRawScheduleDTOs(data)
        setSchedules(formattedSchedule)
        
        // customer API는 theater 객체를 null로 반환 → null일 때는 세팅 스킵
        // (SeatPage가 /api/theater/list로 자체 조회하므로 없어도 동작함)
        if (data.length > 0 && data[0].theater) {
          setTheater(mapToTheater(data[0].theater))
        }
      } catch (error) {
        console.error("스케쥴 로딩 중 에러:", error)
      }
    }
    
    axiosSchedule()
  }, [])
  
  // 할인 정책 로드 (인원 타입 + 조조 할인)
  useEffect(() => {
    const loadDiscounts = async () => {
      try {
        // 두 API를 동시에 호출해 로딩 시간 단축
        const [types, earlyBird] = await Promise.all([
          fetchPersonTypes(),
          fetchEarlyBirdAmount(),
        ])
        setPersonTypes(types)
        setEarlyBirdPerPerson(earlyBird)
        
        // 인원 초기 상태도 API 결과 기준으로 재구성 (성인 1명, 나머지 0명)
        const initial = Object.fromEntries(types.map(t => [t.type, 0]))
        setPersons({...initial, adult: 1})
      } catch (e) {
        console.error('할인 정책 로딩 실패, 기본값 유지:', e)
        // 폴백: DEFAULT_PERSON_TYPES가 이미 초기값으로 세팅돼 있으므로 별도 처리 불필요
      }
    }
    loadDiscounts()
  }, [])
  
  //스케쥴에 남은 좌석에 대한 표기
  useEffect(() => {
    const axiosReservation = async () => {
      if (!movieId) return;
      try {
        // 1. 예약 상세 데이터 가져오기 (List<reservationDetailesDTO>)
        const {data} = await axios.get<ReservationDetailesDTO[]>(`/api/reservation/seatCount/movie/${movieId}`);
        
        // 2. [가공] 스케줄별로 예약된 총 좌석 수 계산 (O(N))
        // 결과 예시: { "101": 5, "102": 3 } (ID 101번 스케줄에 총 5석 예약됨)
        const reservedMap = data
          .filter(res => !res.returned)
          .reduce((acc, curr) => {
            // curr.schedule은 ScheduleDTO 타입 → 'id' 필드 사용 (scheduleId는 mapToSchedule 후 Schedule 타입에만 존재)
            const schedId = curr.schedule.id;
            const seatCount = curr.seats.length; // 해당 예약 건의 좌석 수
            
            acc[schedId] = (acc[schedId] || 0) + seatCount;
            return acc;
          }, {} as Record<number, number>);
        
        // 3. [끼워넣기] 기존 schedules 상태 업데이트
        setSchedules(prevSchedules =>
          prevSchedules.map(sched => ({
            ...sched,
            // 전체 좌석 - 가공한 맵에서 찾은 예약 수
            availableSeats: sched.totalSeats - (reservedMap[sched.scheduleId] ?? 0)
          }))
        );
        
      } catch (error) {
        console.error("예약 데이터 가공 중 에러:", error);
      }
    };
    
    if (schedules.length > 0) {
      axiosReservation();
    }
  }, [movieId, schedules.length]); // schedules 전체를 넣으면 무한루프 위험이 있어 length 권장
  
  
  /**
   * 현재 시각을 1분마다 갱신하는 state
   * React는 시간이 흘러도 자동으로 재렌더하지 않으므로,
   * setInterval로 강제 갱신해 isPast / isOngoing 결과가 실시간 반영되게 함
   */
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000) // 1분마다 갱신
    return () => clearInterval(id)
  }, [])

  // 오늘 날짜 고정 (당일 예매만 가능) — KST 기준 로컬 날짜 사용
  // toISOString()은 UTC 기준이라 한국 자정~오전 9시에 날짜 어긋남 → toLocaleDateString 사용
  const today = now.toLocaleDateString('en-CA')
  
  // ── 선택 상태 ──
  // preSelectedSchedule: 상세 페이지에서 시간 클릭 시 초기값으로 세팅
  const [selectedSched, setSelectedSched] = useState(preSelectedSchedule ?? null)
  // 인원: 할인 정책 로드 useEffect에서 personTypes 기준으로 재초기화됨
  const [persons, setPersons] = useState<Record<string, number>>({adult: 1, teen: 0, senior: 0})
  
  /**
   * 스케줄 선택 시 해당 스케줄의 상영관(Theater)을 동기화
   * rawScheduleDTOs에서 scheduleId가 일치하는 DTO의 theater를 변환해 setTheater
   * → SeatPage에 올바른 상영관 정보 전달
   */
  useEffect(() => {
    if (!selectedSched || rawScheduleDTOs.length === 0) return
    const matchedDTO = rawScheduleDTOs.find(
      (dto) => dto.id === (selectedSched.scheduleId ?? selectedSched.id)
    )
    // customer API는 theater null 반환 → 객체가 있을 때만 theater 업데이트
    if (matchedDTO && matchedDTO.theater) {
      setTheater(mapToTheater(matchedDTO.theater))
    }
  }, [selectedSched, rawScheduleDTOs])
  
  // 오늘 날짜의 상영 목록 전체 (지나간 것 포함)
  const daySchedules = useMemo(
    () => schedules.filter((s) => s.date === today),
    [schedules, today]
  )
  
  // 예매 가능한 상영 목록 — 종료 배너 표시 여부 판단에 사용 (now 변경 시 재계산)
  const futureSchedules = useMemo(
    () => daySchedules.filter((s) => !isPast(s.startTime, now)),
    [daySchedules, now]
  )
  
  /** 인원 수 변경 (+/-) */
  const changePerson = (type: string, delta: number) => {
    setPersons((prev) => {
      const next = (prev[type] ?? 0) + delta
      const total = Object.values({...prev, [type]: next}).reduce((a, b) => a + b, 0)
      // 0명 미만 or 8명 초과 불가
      if (next < 0 || total > 8) return prev
      return {...prev, [type]: next}
    })
  }
  
  const totalPersons = Object.values(persons).reduce((a, b) => a + b, 0)
  
  // 선택된 시간이 오전 10시 이전이면 조조 할인 적용
  // earlyBirdPerPerson은 API에서 로드한 1인당 할인액 (예: 1000원)
  const earlyBirdAmount = selectedSched && isEarlyBirdTime(selectedSched.startTime)
    ? earlyBirdPerPerson
    : 0
  
  // 다음 버튼 활성화 조건
  const canProceed = selectedSched !== null && totalPersons > 0
  
  /**
   * 비활성 상태일 때 안내 메시지
   * 어떤 조건을 채워야 다음으로 갈 수 있는지 표시
   */
  const getHintMessage = () => {
    if (!selectedSched && totalPersons === 0) return '관람 시간과 인원을 선택해 주세요.'
    if (!selectedSched) return '관람하실 시간과 상영관을 선택해 주세요.'
    if (totalPersons === 0) return '인원을 1명 이상 선택해 주세요.'
    return ''
  }
  
  /** 다음 단계 → SeatPage */
  const handleNext = () => {
    if (!canProceed || !selectedSched) return
    
    /**
     * SeatPage는 ScheduleDTO 형식을 기대함:
     *   schedule.id  → WebSocket 연결 (useWebSocket)
     *   schedule.no  → 상영관 번호 조회 (GET /api/theater/list)
     *
     * 하지만 SchedulePage는 mapToSchedule() 후 Schedule 타입 사용:
     *   scheduleId (= ScheduleDTO.id)
     *   theaterId  (= ScheduleDTO.theater.no)
     *
     * 두 필드를 alias로 추가해 SeatPage에서 정상 동작하도록 맞춤
     */
    const scheduleForSeat = {
      ...selectedSched,
      id: selectedSched.scheduleId,   // SeatPage: useWebSocket(schedule.id)
      no: selectedSched.theaterId,    // SeatPage: theaterRes.data.find(t => t.no === schedule.no)
    }
    
    navigate('/booking/seat', {
      state: {
        movieId,
        movieTitle: movieTitle,
        schedule: scheduleForSeat,
        theater,
        persons,
        totalPersons,
        personTypes,        // SeatPage에서 calcTotal() 할인 계산에 사용
        earlyBirdAmount,    // 조조 할인 1인당 금액 (미적용이면 0)
      },
    })
  }
  
  return (
    <div style={pageWrap}>
      
      {/* ── 뒤로 가기 ── */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={20}/>
        영화 상세
      </button>
      
      {/* ── 페이지 제목 ── */}
      <h2 style={pageTitle}>
        <Clock size={24} style={{marginRight: 10, verticalAlign: 'middle'}}/>
        시간 · 인원 선택
      </h2>
      
      {/* 영화 제목 + 날짜 배지 */}
      <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36}}>
        <div style={movieBadge}>
          <Film size={16} style={{marginRight: 6}}/>
          {movieTitle}
        </div>
        {/* 당일 예매만 가능하므로 오늘 날짜 표시 */}
        <div style={movieBadge}>
          <Clock size={16} style={{marginRight: 6}}/>
          {fmtDateLabel(today)} 당일 예매
        </div>
      </div>
      
      {/* ── STEP 1: 시간 선택 ── */}
      <section style={section}>
        <h3 style={stepTitle}>
          <span style={stepNum}>1</span>
          시간 선택
        </h3>
        {/* 오늘 남은 상영이 없을 때: 전체 비어있거나 페이지 머무는 동안 모두 지나간 경우 */}
        {(daySchedules.length === 0 || futureSchedules.length === 0) && (
          <div style={noRemainingNotice}>
            <Clock size={16} style={{flexShrink: 0, marginTop: 1}}/>
            <span>오늘 예정된 상영이 모두 종료되었습니다.</span>
          </div>
        )}
        
        {daySchedules.length === 0 ? null : (
          <div style={timeGrid}>
            {daySchedules.map((s) => {
              // now state 기준으로 판단 — setInterval 갱신 시 자동 반영
              const past = isPast(s.startTime, now)
              // 상영 시작 후 유예 시간 내 = 상영중이지만 예매 가능
              const ongoing = !past && isOngoing(s.startTime, now)
              const soldOut = !past && s.availableSeats === 0
              const isSelected = selectedSched?.scheduleId === s.scheduleId
              const disabled = past || soldOut
              
              return (
                <button
                  key={s.scheduleId}
                  onClick={() => !disabled && setSelectedSched(s)}
                  disabled={disabled}
                  style={{
                    ...timeBtn,
                    ...(isSelected ? timeBtnActive : {}),
                    ...(past ? timeBtnPast : soldOut ? timeBtnSoldOut : {}),
                  }}
                >
                  <p style={{fontSize: 26, fontWeight: 700, margin: '8px 0 4px'}}>
                    {s.startTime}
                  </p>
                  <p style={{fontSize: 13, color: 'var(--text-secondary)', margin: 0}}>
                    {s.theaterName} · ~{s.endTime}
                    {s.isRecliner && (
                      <span style={{
                        display: 'inline-block',
                        marginLeft: 6,
                        padding: '1px 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--primitive-neutral-0)',
                        background: 'var(--color-seat-recliner-border)',
                        borderRadius: 4,
                        verticalAlign: 'middle',
                        letterSpacing: '0.03em',
                      }}>
                                                리클라이너
                                            </span>
                    )}
                    {/* 상영중 배지: 시작 후 유예 시간 내일 때 표시 */}
                    {ongoing && (
                      <span style={{
                        display: 'inline-block',
                        marginLeft: 6,
                        padding: '1px 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--color-error-main)',
                        borderRadius: 4,
                        verticalAlign: 'middle',
                        letterSpacing: '0.03em',
                      }}>
                                                상영중
                                            </span>
                    )}
                    {/* 조조 할인 배지: 지나간 상영엔 표시 안 함 */}
                    {!past && !ongoing && earlyBirdPerPerson > 0 && isEarlyBirdTime(s.startTime) && (
                      <span style={{
                        display: 'inline-block',
                        marginLeft: 6,
                        padding: '1px 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--color-brand-default)',
                        borderRadius: 4,
                        verticalAlign: 'middle',
                      }}>
                                                조조 -{earlyBirdPerPerson.toLocaleString()}원
                                            </span>
                    )}
                  </p>
                  <p style={{
                    fontSize: 13,
                    color: past
                      ? 'var(--text-muted)'
                      : soldOut
                        ? 'var(--color-error-main)'
                        : ongoing
                          ? 'var(--color-warning-main, #f59e0b)'
                          : 'var(--color-success-main)',
                    margin: '6px 0 0',
                    fontWeight: 600,
                  }}>
                    {past ? '종료' : soldOut ? '매진' : ongoing ? `${s.availableSeats}석 남음` : `${s.availableSeats}석 남음`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>
      
      {/* ── STEP 2: 인원 선택 ── */}
      <section style={section}>
        <h3 style={stepTitle}>
          <span style={stepNum}>2</span>
          인원 선택
          <span style={{fontSize: 14, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8}}>
            (최대 8명)
          </span>
        </h3>
        {/* 선택된 시간이 조조 시간대면 인원 선택 위에 조조 할인 안내 표시 */}
        {earlyBirdAmount > 0 && (
          <div style={earlyBirdBanner}>
            <span style={{fontWeight: 700}}>조조 할인 적용중</span>
            <span style={{marginLeft: 6}}>
                            1인당 {earlyBirdAmount.toLocaleString()}원 추가 할인
                        </span>
          </div>
        )}
        <div style={personList}>
          {personTypes.map(({type, label, discount}) => (
            <div key={type} style={personRow}>
              <div>
                <span style={{fontSize: 17, color: 'var(--text-primary)', fontWeight: 600}}>
                  {label}
                </span>
                {discount > 0 && (
                  <span style={{fontSize: 13, color: 'var(--color-success-main)', marginLeft: 8}}>
                    -{discount.toLocaleString()}원 할인
                  </span>
                )}
              </div>
              <div style={counter}>
                <button
                  onClick={() => changePerson(type, -1)}
                  style={counterBtn}
                  aria-label={`${label} 감소`}
                >
                  <ChevronDown size={20}/>
                </button>
                <span style={counterNum}>{persons[type]}</span>
                <button
                  onClick={() => changePerson(type, +1)}
                  style={counterBtn}
                  aria-label={`${label} 증가`}
                >
                  <ChevronUp size={20}/>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* 기타 할인 안내 — 유아·장애인·국가유공자 등은 카운터에서 별도 문의 */}
        <div style={otherDiscountNotice}>
          <Info size={14} style={{flexShrink: 0, marginTop: 1}}/>
          <span>
            유아·장애인·국가유공자 등 기타 할인은 매표소 카운터에서 예매해 주세요.
          </span>
        </div>
        
        <p style={{fontSize: 15, color: 'var(--text-secondary)', marginTop: 12}}>
          총 인원:{' '}
          <strong style={{color: 'var(--color-brand-default)', fontSize: 17}}>
            {totalPersons}명
          </strong>
        </p>
      </section>
      
      {/* ── 다음 단계 버튼 영역 ── */}
      {/* fixed footer 대신 콘텐츠 하단에 크게 배치 (키오스크 사용성) */}
      <div style={nextArea}>
        {/* 선택 요약 또는 조건 안내 */}
        {canProceed ? (
          <div style={summaryBox}>
            <Users size={16} style={{marginRight: 6}}/>
            {fmtDateLabel(today)} · {selectedSched.startTime} · {selectedSched.theaterName} · {totalPersons}명
            {earlyBirdAmount > 0 && (
              <span style={{
                marginLeft: 10,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                background: 'var(--color-brand-default)',
                color: '#111',
                borderRadius: 6,
              }}>
                                조조 -{(earlyBirdAmount * totalPersons).toLocaleString()}원
                            </span>
            )}
          </div>
        ) : (
          <div style={hintBox}>
            <Info size={16} style={{marginRight: 6, flexShrink: 0}}/>
            {getHintMessage()}
          </div>
        )}
        
        <button
          onClick={handleNext}
          disabled={!canProceed}
          style={{
            ...nextBtn,
            ...(!canProceed ? nextBtnDisabled : {}),
          }}
        >
          좌석 선택으로 이동
        </button>
      </div>
    </div>
  )
}

/* ── 스타일 ── */
const pageWrap = {maxWidth: 900, margin: '0 auto', padding: '32px 40px 80px'}
const backBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none',
  color: 'var(--text-secondary)', fontSize: 16,
  cursor: 'pointer', padding: '10px 0', marginBottom: 24,
}
const pageTitle = {
  fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12,
  display: 'flex', alignItems: 'center',
}
const movieBadge = {
  display: 'inline-flex', alignItems: 'center',
  padding: '8px 18px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 24,
  color: 'var(--text-secondary)', fontSize: 15, marginBottom: 36,
}
const section = {marginBottom: 40}
const stepTitle = {
  fontSize: 18, fontWeight: 700, color: 'var(--color-brand-default)',
  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
}
const stepNum = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: '50%',
  background: 'var(--color-brand-default)', color: 'var(--primitive-neutral-900)',
  fontSize: 14, fontWeight: 800, flexShrink: 0,
}

// dateRow, dateBtn, dateBtnActive, todayLabel — 날짜 선택 UI용 (현재 당일 고정이라 미사용, 향후 다일 선택 확장 시 활용)
const _dateRow: React.CSSProperties = {display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8}
const _dateBtn: React.CSSProperties = {
  flexShrink: 0, padding: '12px 20px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 12,
  color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center',
  minWidth: 90, position: 'relative',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
}
const _dateBtnActive: React.CSSProperties = {
  borderColor: 'var(--color-brand-default)',
  background: 'rgba(255,184,0,0.1)'
}
const _todayLabel: React.CSSProperties = {fontSize: 11, color: 'var(--color-brand-default)', fontWeight: 700}
void _dateRow;
void _dateBtn;
void _dateBtnActive;
void _todayLabel // 미사용 경고 억제

// 조조 할인 적용 안내 배너 (인원 선택 섹션 상단)
const earlyBirdBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: '10px 16px', marginBottom: 12,
  background: 'rgba(255,184,0,0.12)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 10,
  fontSize: 14, color: 'var(--color-brand-default)',
}

// 오늘 남은 상영 없음 안내 (인라인 배너)
const noRemainingNotice: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 8,
  padding: '14px 18px', marginBottom: 20,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6,
}

const timeGrid: React.CSSProperties = {display: 'flex', gap: 16, flexWrap: 'wrap'}
const timeBtn: React.CSSProperties = {
  padding: '16px 20px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 14,
  textAlign: 'center', minWidth: 150, cursor: 'pointer',
  color: 'var(--text-primary)',
}
const timeBtnActive = {borderColor: 'var(--color-brand-default)', background: 'rgba(255,184,0,0.1)'}
const timeBtnSoldOut = {opacity: 0.4, cursor: 'not-allowed'}
// 이미 지나간 상영 — 흐리게 처리하고 클릭 불가
const timeBtnPast: React.CSSProperties = {opacity: 0.35, cursor: 'not-allowed', filter: 'grayscale(0.6)'}

const personList: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 16,
  background: 'var(--bg-surface)', borderRadius: 16, padding: '20px 24px',
}
const otherDiscountNotice: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 8,
  marginTop: 12, padding: '12px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
}
const personRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const counter: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 16}
const counterBtn: React.CSSProperties = {
  width: 48, height: 48, borderRadius: '50%',
  border: '1px solid var(--border-efault)',
  background: 'var(--bg-base)', color: 'var(--text-primary)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const counterNum: React.CSSProperties = {
  width: 36, textAlign: 'center',
  fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
}

/* 다음 버튼 영역 — 키오스크 하단 가까이 크게 배치 */
const nextArea = {
  marginTop: 16, padding: '32px 0 0',
  borderTop: '1px solid var(--border-subtle)',
}
const summaryBox = {
  display: 'flex', alignItems: 'center',
  padding: '12px 20px', marginBottom: 16,
  background: 'rgba(255,184,0,0.08)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 12, fontSize: 15, color: 'var(--color-brand-default)', fontWeight: 600,
}

const hintBox = {
  fontSize: 14, color: 'var(--text-muted)',
  textAlign: 'center' as const,
  padding: '8px 0',
}
const nextBtn: React.CSSProperties = {
  width: '100%', padding: '22px 0',
  fontSize: 20, fontWeight: 700,
  background: 'var(--color-brand-default)', color: '#111',
  border: 'none', borderRadius: 14, cursor: 'pointer',
}
const nextBtnDisabled: React.CSSProperties = {
  background: 'var(--bg-elevated)', color: 'var(--text-muted)',
  cursor: 'not-allowed',
}

export default SchedulePage
