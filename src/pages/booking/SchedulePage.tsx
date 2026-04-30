/**
 * SchedulePage.jsx — 시간·인원 선택 (UC-03 2~3단계)
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
 * TODO: GET /api/schedules?movieId=&date= 연동
 */
import { useState, useMemo, useEffect} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Film, Clock, Users, ChevronDown, ChevronUp, Info } from 'lucide-react'
// mockData 의존성 제거 — 백엔드 연동 완료로 목데이터 불필요, 인라인 상수 사용
const PERSON_TYPES: { type: string; label: string; discount: number }[] = [
  { type: 'adult',  label: '성인',   discount: 0    },
  { type: 'teen',   label: '청소년', discount: 2000 },
  { type: 'senior', label: '경로',   discount: 3000 },
]

import axios from 'axios'

import {
Schedule, ScheduleDTO, mapToSchedule,
ReservationDetailesDTO,
Theater, mapToTheater
} from '../../api/typeData'

/** 날짜 포맷: "03/29(토)" */
function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}(${days[d.getDay()]})`
}

function SchedulePage() {
  const navigate = useNavigate()
  const location = useLocation()

  // 이전 페이지(MovieDetail)에서 넘겨받은 movieId, movieTitle, preSelectedSchedule
  const { movieId, movieTitle, preSelectedSchedule } = location.state ?? {}

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

  useEffect(() => {
    const axiosSchedule = async () => {
      try {
        const { data } = await axios.get<ScheduleDTO[]>('/api/schedule/DTOlist')

        console.log("스케쥴 정보", data)

        const movieDTOs = data.filter(dto => dto.movie.movieId === movieId)
        const formattedSchedule = movieDTOs.map((dto) => mapToSchedule(dto))

        setRawScheduleDTOs(movieDTOs) // theater 역참조용으로 원본 DTO 보관
        setSchedules(formattedSchedule)

        // 초기 theater: 첫 번째 스케줄의 상영관 (선택 전 기본값)
        if (movieDTOs.length > 0) {
          setTheater(mapToTheater(movieDTOs[0].theater))
        }
      } catch (error) {
        console.error("❌ 스케쥴 로딩 중 에러:", error)
      }
    }

    axiosSchedule()
  }, []) //첫 로딩에 사용

  //스케쥴에 남은 좌석에 대한 표기
  useEffect(() => {
    const axiosReservation = async () => {
      if (!movieId) return;
      try {
        // 1. 예약 상세 데이터 가져오기 (List<reservationDetailesDTO>)
        const { data } = await axios.get<ReservationDetailesDTO[]>(`/api/reservation/seatCount/movie/${movieId}`);

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
        console.error("❌ 예약 데이터 가공 중 에러:", error);
      }
    };

    if (schedules.length > 0) {
      axiosReservation();
    }
  }, [movieId, schedules.length]); // schedules 전체를 넣으면 무한루프 위험이 있어 length 권장


  // 오늘 날짜 고정 (당일 예매만 가능) — KST 기준 로컬 날짜 사용
  // toISOString()은 UTC 기준이라 한국 자정~오전 9시에 날짜 어긋남 → toLocaleDateString 사용
  const today = new Date().toLocaleDateString('en-CA')

  // ── 선택 상태 ──
  // preSelectedSchedule: 상세 페이지에서 시간 클릭 시 초기값으로 세팅
  const [selectedSched, setSelectedSched] = useState(preSelectedSchedule ?? null)
  // 인원: SeatPage, PaymentPage와 동일하게 소문자 키 사용
  const [persons, setPersons] = useState<Record<string, number>>({ adult: 1, teen: 0, senior: 0 })

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
    if (matchedDTO) {
      setTheater(mapToTheater(matchedDTO.theater))
    }
  }, [selectedSched, rawScheduleDTOs])

  // 오늘 날짜의 상영 목록만 표시
  const daySchedules = useMemo(
    () => schedules.filter((s) => s.date === today),
    [schedules, today]
  )

  /** 인원 수 변경 (+/-) */
  const changePerson = (type: string, delta: number) => {
    setPersons((prev) => {
      const next  = (prev[type] ?? 0) + delta
      const total = Object.values({ ...prev, [type]: next }).reduce((a, b) => a + b, 0)
      // 0명 미만 or 8명 초과 불가
      if (next < 0 || total > 8) return prev
      return { ...prev, [type]: next }
    })
  }

  const totalPersons = Object.values(persons).reduce((a, b) => a + b, 0)

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
      },
    })
  }

  return (
    <div style={pageWrap}>

      {/* ── 뒤로 가기 ── */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={20} />
        영화 상세
      </button>

      {/* ── 페이지 제목 ── */}
      <h2 style={pageTitle}>
        <Clock size={24} style={{ marginRight: 10, verticalAlign: 'middle' }} />
        시간 · 인원 선택
      </h2>

      {/* 영화 제목 + 날짜 배지 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
        <div style={movieBadge}>
          <Film size={16} style={{ marginRight: 6 }} />
          {movieTitle}
        </div>
        {/* 당일 예매만 가능하므로 오늘 날짜 표시 */}
        <div style={movieBadge}>
          <Clock size={16} style={{ marginRight: 6 }} />
          {fmtDateLabel(today)} 당일 예매
        </div>
      </div>

      {/* ── STEP 1: 시간 선택 ── */}
      <section style={section}>
        <h3 style={stepTitle}>
          <span style={stepNum}>1</span>
          시간 선택
        </h3>
        {daySchedules.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            선택하신 날짜에 상영 일정이 없습니다.
          </p>
        ) : (
          <div style={timeGrid}>
            {daySchedules.map((s) => {
              const soldOut    = s.availableSeats === 0
              const isSelected = selectedSched?.scheduleId === s.scheduleId
              return (
                <button
                  key={s.scheduleId}
                  onClick={() => !soldOut && setSelectedSched(s)}
                  disabled={soldOut}
                  style={{
                    ...timeBtn,
                    ...(isSelected ? timeBtnActive : {}),
                    ...(soldOut ? timeBtnSoldOut : {}),
                  }}
                >
                  <p style={{ fontSize: 26, fontWeight: 700, margin: '8px 0 4px' }}>
                    {s.startTime}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    {s.theaterName} · ~{s.endTime}
                  </p>
                  <p style={{
                    fontSize: 13,
                    color: soldOut ? '#e03c3c' : '#00ad74',
                    margin: '6px 0 0',
                    fontWeight: 600,
                  }}>
                    {soldOut ? '매진' : `${s.availableSeats}석 남음`}
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
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
            (최대 8명)
          </span>
        </h3>
        <div style={personList}>
          {PERSON_TYPES.map(({ type, label, discount }) => (
            <div key={type} style={personRow}>
              <div>
                <span style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {label}
                </span>
                {discount > 0 && (
                  <span style={{ fontSize: 13, color: '#00ad74', marginLeft: 8 }}>
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
                  <ChevronDown size={20} />
                </button>
                <span style={counterNum}>{persons[type]}</span>
                <button
                  onClick={() => changePerson(type, +1)}
                  style={counterBtn}
                  aria-label={`${label} 증가`}
                >
                  <ChevronUp size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 기타 할인 안내 — 유아·장애인·국가유공자 등은 카운터에서 별도 문의 */}
        <div style={otherDiscountNotice}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            유아·장애인·국가유공자 등 기타 할인은 매표소 카운터에서 예매해 주세요.
          </span>
        </div>

        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 12 }}>
          총 인원:{' '}
          <strong style={{ color: 'var(--color-brand-default)', fontSize: 17 }}>
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
            <Users size={16} style={{ marginRight: 6 }} />
            {fmtDateLabel(today)} · {selectedSched.startTime} · {selectedSched.theaterName} · {totalPersons}명
          </div>
        ) : (
          <div style={hintBox}>
            <Info size={16} style={{ marginRight: 6, flexShrink: 0 }} />
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
const pageWrap  = { maxWidth: 900, margin: '0 auto', padding: '32px 40px 80px' }
const backBtn   = {
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
const section   = { marginBottom: 40 }
const stepTitle = {
  fontSize: 18, fontWeight: 700, color: 'var(--color-brand-default)',
  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
}
const stepNum   = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: '50%',
  background: 'var(--color-brand-default)', color: 'var(--primitive-neutral-900)',
  fontSize: 14, fontWeight: 800, flexShrink: 0,
}

// dateRow, dateBtn, dateBtnActive, todayLabel — 날짜 선택 UI용 (현재 당일 고정이라 미사용, 향후 다일 선택 확장 시 활용)
const _dateRow: React.CSSProperties       = { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }
const _dateBtn: React.CSSProperties       = {
  flexShrink: 0, padding: '12px 20px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 12,
  color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center',
  minWidth: 90, position: 'relative',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
}
const _dateBtnActive: React.CSSProperties = { borderColor: 'var(--color-brand-default)', background: 'rgba(255,184,0,0.1)' }
const _todayLabel: React.CSSProperties    = { fontSize: 11, color: 'var(--color-brand-default)', fontWeight: 700 }
void _dateRow; void _dateBtn; void _dateBtnActive; void _todayLabel // 미사용 경고 억제

const timeGrid: React.CSSProperties  = { display: 'flex', gap: 16, flexWrap: 'wrap' }
const timeBtn: React.CSSProperties   = {
  padding: '16px 20px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 14,
  textAlign: 'center', minWidth: 150, cursor: 'pointer',
  color: 'var(--text-primary)',
}
const timeBtnActive  = { borderColor: 'var(--color-brand-default)', background: 'rgba(255,184,0,0.1)' }
const timeBtnSoldOut = { opacity: 0.4, cursor: 'not-allowed' }

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
const personRow: React.CSSProperties  = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const counter: React.CSSProperties    = { display: 'flex', alignItems: 'center', gap: 16 }
const counterBtn: React.CSSProperties = {
  width: 48, height: 48, borderRadius: '50%',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-base)', color: 'var(--text-primary)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const counterNum: React.CSSProperties = {
  width: 36, textAlign: 'center',
  fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
}

/* 다음 버튼 영역 — 키오스크 하단 가까이 크게 배치 */
const nextArea  = {
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
const hintBox   = {
  display: 'flex', alignItems: 'center',
  padding: '12px 20px', marginBottom: 16,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, fontSize: 15, color: 'var(--text-secondary)',
}
const nextBtn   = {
  display: 'block', width: '100%',
  padding: '22px 0',
  background: 'var(--color-brand-default)',
  color: 'var(--primitive-neutral-900)',
  border: 'none', borderRadius: 14,
  fontSize: 18, fontWeight: 800,
  cursor: 'pointer', letterSpacing: '0.02em',
}
const nextBtnDisabled = { opacity: 0.4, cursor: 'not-allowed' }

export default SchedulePage