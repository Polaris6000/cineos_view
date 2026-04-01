/**
 * MovieDetailPage.jsx — 상영작 상세 (UC-02)
 *
 * 동작:
 *  - URL 파라미터 :id 로 영화 조회
 *  - 포스터(없으면 placeholder-poster.jpg), 제목, 장르, 등급, 감독, 출연, 런타임, 줄거리 표시
 *  - "예매하기" 클릭 → movieId 넘기며 /booking/schedule 이동
 *  - 매진 시 버튼 비활성화, 상영 예정작은 예매 버튼 미표시
 *
 * FHD(1080×1920) 세로형 키오스크 기준으로 레이아웃 설계
 * 이모지 제거 → Lucide React 아이콘으로 대체
 *
 * TODO: GET /api/movies/:id 연동
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, Film, CalendarDays, Tag } from 'lucide-react'
import { MOCK_MOVIES, MOCK_SCHEDULES } from '../../api/mockData'

/** 관람등급 → 표시 텍스트·색상 */
const RATING_INFO = {
  ALL:  { label: '전체관람가',      color: '#4caf50' },
  '12': { label: '12세 이상',       color: '#2a88c8' },
  '15': { label: '15세 이상',       color: '#ffb800' },
  '19': { label: '청소년 관람불가', color: '#e03c3c' },
}

/** 런타임(분) → "2시간 46분" 형식 변환 */
function formatRuntime(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}` : `${m}분`
}

function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // TODO: useEffect 안에서 GET /api/movies/:id 호출로 교체
  const movie = MOCK_MOVIES.find((m) => m.id === Number(id))

  // 오늘 상영 일정 및 잔여 좌석 합산
  const schedules = MOCK_SCHEDULES[movie?.id] || []
  const today = new Date().toISOString().slice(0, 10)
  const todaySchedules = schedules.filter((s) => s.date === today)
  const totalAvailable = todaySchedules.reduce((acc, s) => acc + s.availableSeats, 0)

  if (!movie) {
    return (
      <div style={notFoundWrap}>
        <Film size={64} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-secondary)', marginTop: 24, fontSize: 18 }}>
          영화 정보를 찾을 수 없습니다.
        </p>
        <button onClick={() => navigate('/movie/list')} style={btnPrimary}>
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  const rating    = RATING_INFO[movie.rating] ?? RATING_INFO['ALL']
  const isSoldOut = movie.endAt !== null && totalAvailable === 0

  /**
   * 예매하기 버튼 클릭 → SchedulePage 이동
   * preSelectedSchedule 없으면 시간 선택부터 시작
   */
  const handleBook = () => {
    navigate('/booking/schedule', {
      state: { movieId: movie.id, movieTitle: movie.title },
    })
  }

  /**
   * 특정 상영 시간 클릭 → SchedulePage 로 이동하면서 해당 스케줄 pre-select
   * SchedulePage 에서 selectedSched 초기값으로 사용됨
   */
  const handleBookWithSchedule = (schedule) => {
    navigate('/booking/schedule', {
      state: {
        movieId:            movie.id,
        movieTitle:         movie.title,
        preSelectedSchedule: schedule, // 상세 페이지에서 선택한 시간 전달
      },
    })
  }

  return (
    <div style={pageWrap}>

      {/* ── 뒤로 가기 버튼 ── */}
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ChevronLeft size={20} />
        목록으로
      </button>

      {/* ── 상단 카드: 포스터 + 정보 ── */}
      <div style={card}>

        {/* 포스터 영역 — posterUrl 없으면 placeholder-poster.jpg 사용 */}
        <div style={posterWrap}>
          <img
            src={movie.posterUrl || '/placeholder-poster.jpg'}
            alt={`${movie.title} 포스터`}
            style={posterImg}
            onError={(e) => { e.target.src = '/placeholder-poster.jpg' }}
          />
          {/* 관람등급 배지 */}
          <span style={{ ...ratingBadge, background: rating.color }}>{rating.label}</span>
        </div>

        {/* 정보 영역 */}
        <div style={info}>
          <h1 style={titleStyle}>{movie.title}</h1>

          {/* 장르·런타임 태그 */}
          <div style={tagRow}>
            {[movie.genre].map((t) => (
              <span key={t} style={tag}>
                <Tag size={12} style={{ marginRight: 4 }} />
                {t}
              </span>
            ))}
            <span style={tag}>
              <Clock size={12} style={{ marginRight: 4 }} />
              {formatRuntime(movie.runtime)}
            </span>
          </div>

          {/* 감독·출연·개봉 정보 */}
          <dl style={dl}>
            <dt style={dt}>감독</dt>
            <dd style={dd}>{movie.director}</dd>
            <dt style={dt}>출연</dt>
            <dd style={dd}>{movie.cast}</dd>
            <dt style={dt}>개봉</dt>
            <dd style={dd}>{movie.startAt}</dd>
            {movie.endAt && (
              <>
                <dt style={dt}>종영</dt>
                <dd style={dd}>{movie.endAt}</dd>
              </>
            )}
          </dl>

          {/* 줄거리 */}
          <div style={synopsisBox}>
            <p style={synopsisLabel}>줄거리</p>
            <p style={synopsisText}>{movie.synopsis}</p>
          </div>

          {/* 잔여 좌석 (상영 중인 영화만) */}
          {movie.endAt && (
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 20 }}>
              오늘 잔여 좌석:{' '}
              <strong style={{ color: totalAvailable > 20 ? '#00ad74' : '#e03c3c', fontSize: 17 }}>
                {totalAvailable}석
              </strong>
            </p>
          )}
        </div>
      </div>

      {/* ── 예매 버튼 / 상영예정 배지 ── */}
      {/* 키오스크 사용성 고려: 화면 하단에 크고 눌리기 쉬운 버튼으로 배치 */}
      <div style={actionArea}>
        {movie.endAt ? (
          <button
            onClick={handleBook}
            disabled={isSoldOut}
            style={{
              ...bookBtn,
              ...(isSoldOut
                ? { background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                : {}),
            }}
          >
            <Film size={22} />
            {isSoldOut ? '매진' : '예매하기'}
          </button>
        ) : (
          <div style={upcomingBadge}>
            <CalendarDays size={20} />
            <span>{movie.startAt} 개봉 예정</span>
          </div>
        )}
      </div>

      {/* ── 오늘 상영 시간표 ── */}
      {movie.endAt && todaySchedules.length > 0 && (
        <div style={scheduleSection}>
          <h2 style={sectionTitle}>오늘 상영 시간표</h2>
          <div style={scheduleGrid}>
            {todaySchedules.map((s) => (
              <button
                key={s.scheduleId}
                onClick={() => handleBookWithSchedule(s)} /* 클릭한 시간 전달 */
                disabled={s.availableSeats === 0}
                style={{
                  ...scheduleItem,
                  opacity: s.availableSeats === 0 ? 0.4 : 1,
                  cursor: s.availableSeats === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-brand-default)', margin: 0 }}>
                  {s.startTime}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                  ~ {s.endTime} · {s.theaterName}
                </p>
                <p style={{
                  fontSize: 13,
                  color: s.availableSeats === 0 ? '#e03c3c' : '#00ad74',
                  margin: '4px 0 0',
                  fontWeight: 600,
                }}>
                  {s.availableSeats === 0 ? '매진' : `${s.availableSeats}석 남음`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────── 스타일 ─────────────────── */

const notFoundWrap = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: 600, gap: 16,
}

/* FHD 기준: 최대 너비 960px, 충분한 패딩 */
const pageWrap = {
  maxWidth: 960, margin: '0 auto', padding: '32px 40px 80px',
}

const backBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none',
  color: 'var(--text-secondary)', fontSize: 16,
  cursor: 'pointer', padding: '10px 0', marginBottom: 32,
}

const card = { display: 'flex', gap: 48, flexWrap: 'wrap' }

const posterWrap = { position: 'relative', flexShrink: 0, width: 300 }

const posterImg = {
  width: '100%', borderRadius: 16, display: 'block',
  objectFit: 'cover', aspectRatio: '2/3',
}

const ratingBadge = {
  position: 'absolute', top: 14, left: 14,
  padding: '5px 12px', borderRadius: 8,
  fontSize: 12, fontWeight: 700, color: '#fff',
}

const info = { flex: 1, minWidth: 320 }

const titleStyle = {
  fontSize: 30, fontWeight: 800, color: 'var(--text-primary)',
  marginBottom: 16, lineHeight: 1.3,
}

const tagRow = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }

const tag = {
  display: 'flex', alignItems: 'center',
  padding: '6px 14px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 20,
  fontSize: 14, color: 'var(--text-secondary)',
}

const dl  = {
  display: 'grid', gridTemplateColumns: '56px 1fr',
  gap: '10px 16px', marginBottom: 24,
}
const dt  = { color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }
const dd  = { color: 'var(--text-secondary)', fontSize: 14, margin: 0 }

const synopsisBox   = {
  background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 24,
}
const synopsisLabel = {
  fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
  marginBottom: 10, letterSpacing: 1,
}
const synopsisText  = {
  fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.9, margin: 0,
}

/* 예매 버튼 영역 — 넓고 눌리기 쉽게 */
const actionArea = {
  padding: '40px 0 32px',
  borderTop: '1px solid var(--border-subtle)',
  marginTop: 40, marginBottom: 40,
}

const bookBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 12, width: '100%', padding: '28px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 16,
  fontSize: 24, fontWeight: 800, cursor: 'pointer', letterSpacing: 1,
}

const upcomingBadge = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 10, padding: '24px 0',
  background: 'var(--bg-surface)', borderRadius: 16,
  color: 'var(--text-secondary)', fontSize: 18, fontWeight: 600,
}

const btnPrimary = {
  marginTop: 24, padding: '16px 32px',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
}

const scheduleSection = {}
const sectionTitle    = {
  fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20,
}
const scheduleGrid    = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 16,
}
const scheduleItem    = {
  padding: '18px 16px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 14,
  textAlign: 'center', color: 'var(--text-primary)',
}

export default MovieDetailPage
