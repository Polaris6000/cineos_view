/**
 * HomePage.jsx — 키오스크 홈(스플래시) 화면
 * UC: 홈
 *
 * 동작:
 *  - 상영 중 영화를 풀스크린 슬라이드쇼로 표시 (5초 자동 전환)
 *  - 화면 어디든 터치 → /movie/list 이동
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOW_PLAYING } from '../../api/mockData'
import styles from './HomePage.module.css'

/** 슬라이드 자동 전환 간격 (ms) */
const SLIDE_INTERVAL = 5000

/** 등급 → 표시 텍스트 */
const RATING_LABEL = {
  ALL: '전체관람가',
  '12': '12세 이상',
  '15': '15세 이상',
  '19': '청소년 관람불가',
}

function HomePage() {
  const navigate = useNavigate()

  // 현재 보여지는 슬라이드 인덱스
  const [currentIndex, setCurrentIndex] = useState(0)

  // 관리자 버튼 탭 카운트 (0~5)
  const [adminTapCount, setAdminTapCount] = useState(0)

  // 관리자 탭 타임아웃 ref (clearTimeout 용)
  const adminTimerRef = useRef(null)

  // 슬라이드 자동 전환 타이머 ref
  const slideTimerRef = useRef(null)

  const movies = NOW_PLAYING

  /**
   * 다음 슬라이드로 이동
   * useCallback으로 메모이제이션 → useEffect 의존성 배열에 안전하게 포함
   */
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % movies.length)
  }, [movies.length])

  /**
   * 슬라이드 자동 전환 타이머 설정
   * 슬라이드가 바뀔 때마다 타이머 리셋
   */
  useEffect(() => {
    if (movies.length <= 1) return // 1개 이하면 자동 전환 불필요

    slideTimerRef.current = setInterval(nextSlide, SLIDE_INTERVAL)

    // cleanup: 컴포넌트 언마운트 or 재실행 시 기존 타이머 제거
    return () => clearInterval(slideTimerRef.current)
  }, [nextSlide, movies.length])

  /**
   * 화면 전체 클릭 → 영화 목록으로 이동
   */
  const handleScreenClick = () => {
    navigate('/movie/list')
  }

  /**
   * 특정 슬라이드로 직접 이동 (인디케이터 클릭)
   * 클릭 시 자동 전환 타이머 리셋
   */
  const goToSlide = (index) => {
    setCurrentIndex(index)
    clearInterval(slideTimerRef.current)
    slideTimerRef.current = setInterval(nextSlide, SLIDE_INTERVAL)
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearTimeout(adminTimerRef.current)
    }
  }, [])

  // 영화가 없을 때 빈 상태 UI
  if (movies.length === 0) {
    return (
      <div className={styles.home} onClick={handleScreenClick}>
        <div className={styles.logo}>
          <img src="/logo_cineos.svg" alt="CineOS" />
        </div>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>CineOS</p>
          <p className={styles.emptySub}>현재 등록된 상영 영화가 없습니다.</p>
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
            {/* 배경: 그라디언트 + 포스터 이미지
                posterUrl 없으면 placeholder-poster.jpg 로 폴백
                onError: 이미지 로드 실패 시 숨겨서 그라디언트 배경 노출 */}
            <div className={`${styles.slideBg} ${styles[`slideBg${(index % 6) + 1}`]}`}>
              <img
                className={styles.slidePoster}
                src={movie.posterUrl || '/placeholder-poster.jpg'}
                alt=""
                aria-hidden="true"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            {/* 하단 딤 오버레이 */}
            <div className={styles.slideOverlay} aria-hidden="true" />

            {/* 영화 정보 */}
            <div className={styles.slideContent}>
              <span className={`${styles.ratingBadge} ${styles[`rating${movie.rating}`]}`}>
                {RATING_LABEL[movie.rating] ?? movie.rating}
              </span>
              <h1 className={styles.slideTitle}>{movie.title}</h1>
              <p className={styles.slideGenre}>{movie.genre}</p>
              <p className={styles.slidePeriod}>
                {movie.endAt
                  ? `${movie.startAt} ~ ${movie.endAt}`
                  : `${movie.startAt} 개봉 예정`}
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