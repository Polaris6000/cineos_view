/**
 * HomePage.tsx — 키오스크 홈(스플래시) 화면
 * UC: 홈
 *
 * 동작:
 *  - GET /api/movie/readAll → 상영 중 + 상영 예정 영화 모두 슬라이드쇼로 표시
 *  - 프론트에서 endAt 기준으로 종료된 영화 제외
 *  - 5초마다 자동 전환
 *  - 화면 어디든 터치 → /movie/list 이동
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { type MovieDTO, resolvePosterUrl } from '../../api/apiClient'
import styles from './HomePage.module.css'

/** 슬라이드 자동 전환 간격 (ms) */
const SLIDE_INTERVAL = 1000 * 5

/** 등급 → 표시 텍스트 (백엔드 Rating @JsonValue 기준) */
const RATING_LABEL: Record<string, string> = {
  ALL:  '전체관람가',
  '12': '12세 이상',
  '15': '15세 이상',
  '19': '청소년 관람불가',
}

/** 홈용 슬라이드 데이터 타입 */
interface SlideMovie {
  id:        number
  title:     string
  genre:     string | null
  rating:    string
  posterUrl: string
  startAt:   string
  endAt:     string | null
  /** 'NOW' = 상영 중, 'UPCOMING' = 상영 예정 */
  status:    'NOW' | 'UPCOMING'
}

// toISOString()은 UTC 기준이라 한국(UTC+9) 자정 이전에 하루 전 날짜가 나옴
// toLocaleDateString('en-CA')로 로컬 기준 YYYY-MM-DD 추출
const TODAY = new Date().toLocaleDateString('en-CA')

/** MovieDTO → 슬라이드 데이터 변환 */
function toSlide(dto: MovieDTO): SlideMovie {
  const startDate = dto.startAt?.slice(0, 10) ?? ''
  return {
    id:        dto.movieId,
    title:     dto.title,
    genre:     dto.genre,
    rating:    dto.rating,
    posterUrl: resolvePosterUrl(dto.posterPath),
    startAt:   startDate,
    endAt:     dto.endAt?.slice(0, 10) ?? null,
    status:    startDate > TODAY ? 'UPCOMING' : 'NOW',
  }
}

function HomePage() {
  const navigate = useNavigate()

  // 현재 보여지는 슬라이드 인덱스
  const [currentIndex, setCurrentIndex] = useState(0)

  // 슬라이드 데이터 (API)
  const [movies, setMovies] = useState<SlideMovie[]>([])
  const [loading, setLoading] = useState(true)

  // 슬라이드 자동 전환 타이머 ref
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * 영화 목록 로드 — 상영 중 + 상영 예정 모두 표시
   * GET /api/movie/admin/admin/readAll → 전체 영화 조회 후 프론트에서 종료된 영화 제외
   */
  useEffect(() => {
    apiClient.get<MovieDTO[]>('/movie/admin/admin/readAll')
      .then((res) => {
        const slides = res.data
          // 종료된 영화(endAt이 과거) 제외
          .filter((m) => !m.endAt || m.endAt.slice(0, 10) >= TODAY)
          .map(toSlide)
        setMovies(slides)
      })
      .catch((err) => {
        console.error('[HomePage] 영화 목록 로드 실패', err)
        setMovies([])
      })
      .finally(() => setLoading(false))
  }, [])

  /**
   * 다음 슬라이드로 이동
   * useCallback으로 메모이제이션 → useEffect 의존성 배열에 안전하게 포함
   */
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % movies.length)
  }, [movies.length])

  /**
   * 슬라이드 자동 전환 타이머 설정
   * movies 로드 완료 후, 2개 이상일 때만 동작
   */
  useEffect(() => {
    if (movies.length <= 1) return
    slideTimerRef.current = setInterval(nextSlide, SLIDE_INTERVAL)
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current)
    }
  }, [nextSlide, movies.length])

  /** 화면 전체 클릭 → 영화 목록으로 이동 */
  const handleScreenClick = () => navigate('/movie/list')

  /**
   * 특정 슬라이드로 직접 이동 (인디케이터 클릭)
   * 클릭 시 자동 전환 타이머 리셋
   */
  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    if (slideTimerRef.current) clearInterval(slideTimerRef.current)
    slideTimerRef.current = setInterval(nextSlide, SLIDE_INTERVAL)
  }

  // 로딩 중
  if (loading) {
    return (
      <div className={styles.home} onClick={handleScreenClick}>
        <div className={styles.logo}>
          <img src="/logo_cineos.svg" alt="CineOS" />
        </div>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>CineOS</p>
          <p className={styles.emptySub}>상영 중인 영화를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 상영 중 영화 없을 때
  if (movies.length === 0) {
    return (
      <div className={styles.home} onClick={handleScreenClick}>
        <div className={styles.logo}>
          <img src="/logo_cineos.svg" alt="CineOS" />
        </div>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>CineOS</p>
          <p className={styles.emptySub}>현재 등록된 영화가 없습니다.</p>
          <p className={styles.cta}>화면을 터치하면 상영 목록으로 이동합니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.home} onClick={handleScreenClick}>

      {/* ── 로고 (좌상단) ── */}
      <div className={styles.logo} aria-hidden="true">
        <img src="/logo_cineos.svg" alt="CineOS" />
      </div>

      {/* ── 슬라이드쇼 ── */}
      <div className={styles.slideshow} aria-live="polite">
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            className={`${styles.slide} ${index === currentIndex ? styles.slideActive : ''}`}
            aria-hidden={index !== currentIndex}
          >
            {/* 배경: 다크 + 포스터 이미지 */}
            <div className={styles.slideBg}>
              <img
                className={styles.slidePoster}
                src={movie.posterUrl}
                alt=""
                aria-hidden="true"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            {/* 하단 딤 오버레이 */}
            <div className={styles.slideOverlay} aria-hidden="true" />

            {/* 영화 정보 */}
            <div className={styles.slideContent}>
              {/* 상태 배지 + 등급 배지 (가로 배치) */}
              <h1 className={styles.slideTitle}>{movie.title}</h1>
              <p className={styles.slideGenre}>{movie.genre}</p>
              <div className={styles.badgeRow}>
                <span className={`${styles.statusBadge} ${movie.status === 'UPCOMING' ? styles.statusUpcoming : styles.statusNow}`}>
                  {movie.status === 'UPCOMING' ? '상영 예정' : '상영 중'}
                </span>
                <span className={`${styles.ratingBadge} ${styles[`rating${movie.rating}`]}`}>
                  {RATING_LABEL[movie.rating] ?? movie.rating}
                </span>
              </div>
              <p className={styles.slidePeriod}>
                {movie.endAt
                  ? `${movie.startAt} ~ ${movie.endAt}`
                  : `${movie.startAt} 개봉`}
              </p>
              <p className={styles.cta} aria-hidden="true">
                화면을 터치하여 예매하기
              </p>
            </div>
          </div>
        ))}

        {/* ── 슬라이드 인디케이터 ── */}
        {movies.length > 1 && (
          <div className={styles.indicators} aria-hidden="true">
            {movies.map((movie, index) => (
              <button
                key={movie.id}
                type="button"
                className={`${styles.indicator} ${index === currentIndex ? styles.indicatorActive : ''}`}
                onClick={(e) => { e.stopPropagation(); goToSlide(index) }}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default HomePage