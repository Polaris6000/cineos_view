/**
 * MovieFormPage.tsx — 영화 등록 / 수정 (UC-18, UC-19)
 *
 * [레이아웃]
 *   ┌──────────────────────────────┬──────────────────┐
 *   │   영화 등록/수정 폼           │  TMDB 검색 패널  │
 *   │   (포스터 + 기본정보 입력)    │  (리스트 형태)   │
 *   │                              │  (항상 표시)     │
 *   │   [취소]  [등록 / 수정]      │                  │
 *   └──────────────────────────────┴──────────────────┘
 *
 * [TMDB 자동 불러오기]
 *   - 우측 패널에서 인기 영화 조회 & 제목 검색 (리스트 형태)
 *   - 항목 클릭 → 백엔드 상세 조회 후 폼 자동 입력
 *   - 자동 입력 후 사용자가 내용 검토·수정 가능
 *   - "등록" / "수정" 클릭 시에만 DB 저장
 *
 * [API 연동]
 *   - 등록: POST /api/movie/upload  (multipart/form-data)
 *   - 수정: POST /api/movie/modify  (multipart/form-data)
 */
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle,
  Search,
  Film,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import {
  getPopularMovies,
  searchTmdbMovies,
  getTmdbMovieDetail,
  type TmdbMovieItem,
} from '../../../api/tmdbApi'
import apiClient from '../../../api/apiClient'

/* ─────────────────────────────────────────
   관람등급 옵션
───────────────────────────────────────── */
const RATING_OPTIONS = [
  { value: 'ALL', label: '전체관람가' },
  { value: '12',  label: '12세 이상' },
  { value: '15',  label: '15세 이상' },
  { value: '19',  label: '청소년관람불가' },
]

/* ─────────────────────────────────────────
   타입 정의
───────────────────────────────────────── */
interface FormData {
  title:      string
  genre:      string
  rating:     string
  director:   string
  cast:       string       // 백엔드 필드명: actors
  runtime:    string | number
  synopsis:   string       // 백엔드 필드명: description
  startAt:    string
  endAt:      string | null
  /**
   * TMDB에서 선택 시 백엔드가 반환한 포스터 full URL
   * 백엔드 saveImageFromDTO()가 https로 시작하면 자동 다운로드함
   */
  posterPath: string | null
}

interface FormErrors {
  title?:    string
  genre?:    string
  director?: string
  runtime?:  string
  startAt?:  string
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
function MovieFormPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // 수정 모드 판단: location.state.movie 가 있으면 수정
  const editMovie = location.state?.movie ?? null
  const isEdit    = editMovie !== null

  /* ── 폼 상태 ── */
  const [form, setForm] = useState<FormData>({
    title:      editMovie?.title      ?? '',
    genre:      editMovie?.genre      ?? '',
    rating:     editMovie?.rating     ?? 'ALL',
    director:   editMovie?.director   ?? '',
    cast:       editMovie?.cast       ?? '',
    runtime:    editMovie?.runtime    ?? '',
    synopsis:   editMovie?.synopsis   ?? '',
    startAt:    editMovie?.startAt    ?? '',
    endAt:      editMovie?.endAt      ?? '',
    posterPath: null,
  })

  // 포스터 미리보기 URL (base64 or TMDB URL)
  const [posterPreview, setPosterPreview] = useState<string | null>(
    editMovie?.posterUrl ?? null
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const [errors,      setErrors]      = useState<FormErrors>({})
  const [success,     setSuccess]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // TMDB 자동 입력 완료 배너
  const [tmdbFilled, setTmdbFilled] = useState(false)

  /* ── TMDB 패널 상태 ── */
  const [tmdbQuery,    setTmdbQuery]    = useState('')
  const [tmdbMovies,   setTmdbMovies]   = useState<TmdbMovieItem[]>([])
  const [tmdbLoading,  setTmdbLoading]  = useState(false)
  const [selectingId,  setSelectingId]  = useState<number | null>(null)
  const [tmdbError,    setTmdbError]    = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)

  /* ── 마운트 시 인기 영화 로드 ── */
  useEffect(() => {
    fetchPopularMovies()
  }, [])

  /* ── TMDB API 호출 ── */

  /** 인기 영화 목록 로드 */
  const fetchPopularMovies = async () => {
    setTmdbLoading(true)
    setTmdbError(null)
    setIsSearchMode(false)
    try {
      const movies = await getPopularMovies(1)
      setTmdbMovies(movies)
    } catch {
      setTmdbError('인기 영화를 불러오지 못했습니다.\n백엔드 서버를 확인해 주세요.')
      setTmdbMovies([])
    } finally {
      setTmdbLoading(false)
    }
  }

  /** TMDB 검색 */
  const handleSearch = async () => {
    if (!tmdbQuery.trim()) {
      fetchPopularMovies()
      return
    }
    setTmdbLoading(true)
    setTmdbError(null)
    setIsSearchMode(true)
    try {
      const movies = await searchTmdbMovies(tmdbQuery.trim())
      setTmdbMovies(movies)
      if (movies.length === 0) setTmdbError(`"${tmdbQuery}" 결과 없음`)
    } catch {
      setTmdbError('검색에 실패했습니다.')
      setTmdbMovies([])
    } finally {
      setTmdbLoading(false)
    }
  }

  /**
   * TMDB 항목 선택 → 상세 조회 → 폼 자동 입력
   *
   * 백엔드 MovieDTO 필드명 매핑:
   *   actors      → form.cast
   *   description → form.synopsis
   */
  const handleSelectMovie = async (movie: TmdbMovieItem) => {
    if (selectingId !== null) return
    setSelectingId(movie.id)
    setTmdbError(null)
    try {
      const detail = await getTmdbMovieDetail(movie.id)

      setForm((prev) => ({
        ...prev,
        title:      detail.title       || prev.title,
        genre:      detail.genre       || prev.genre,
        director:   detail.director    || prev.director,
        cast:       detail.actors      || prev.cast,
        runtime:    detail.runtime     || prev.runtime,
        synopsis:   detail.description || prev.synopsis,
        posterPath: detail.posterPath  ?? null,
        // TMDB release_dates KR certification 기반 등급 자동 입력
        rating:     detail.rating      || prev.rating,
      }))

      // 포스터 미리보기: detail > list 순으로 시도
      const previewUrl = detail.posterPath ?? movie.posterPath
      if (previewUrl) setPosterPreview(previewUrl)

      setTmdbFilled(true)
      setErrors({})
      setSubmitError(null)
    } catch {
      setTmdbError('영화 정보를 불러오지 못했습니다.\n다시 시도해 주세요.')
    } finally {
      setSelectingId(null)
    }
  }

  /* ── 폼 핸들러 ── */

  const handleChange = (field: keyof FormData, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSubmitError(null)
  }

  /** 포스터 직접 파일 업로드 */
  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPosterPreview(ev.target?.result as string)
      // 직접 파일 업로드 시 TMDB posterPath 초기화 (file 우선)
      setForm((prev) => ({ ...prev, posterPath: null }))
      setTmdbFilled(false)
    }
    reader.readAsDataURL(file)
  }

  /** 유효성 검사 */
  const validate = (): FormErrors => {
    const errs: FormErrors = {}
    if (!form.title.trim())
      errs.title    = '제목을 입력해 주세요.'
    if (!form.genre.trim())
      errs.genre    = '장르를 입력해 주세요.'
    if (!form.director.trim())
      errs.director = '감독을 입력해 주세요.'
    if (!form.runtime || isNaN(Number(form.runtime)) || Number(form.runtime) <= 0)
      errs.runtime  = '올바른 런타임을 입력해 주세요. (분 단위 숫자)'
    if (!form.startAt)
      errs.startAt  = '개봉일을 선택해 주세요.'
    return errs
  }

  /**
   * 폼 제출 → DB 저장
   *
   * multipart/form-data로 전송:
   *   - 파일 업로드: image 필드에 File 객체
   *   - TMDB 선택:  posterPath 필드에 이미지 URL
   *   - 백엔드 saveImageFromDTO()가 URL이면 자동 다운로드
   *
   * 필드명 변환:
   *   form.cast     → 'actors'
   *   form.synopsis → 'description'
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const fd = new FormData()

      // 기본 텍스트 필드
      fd.append('title',       form.title)
      fd.append('genre',       form.genre)
      fd.append('rating',      form.rating)
      fd.append('runtime',     String(form.runtime))
      fd.append('director',    form.director)
      fd.append('actors',      form.cast)         // cast → actors
      fd.append('description', form.synopsis)     // synopsis → description
      if (form.startAt) fd.append('startAt', form.startAt)
      // endAt은 백엔드 DTO가 LocalDateTime이므로 날짜만 있으면 T00:00:00 붙여서 전송
      if (form.endAt)   fd.append('endAt', `${form.endAt}T00:00:00`)

      // 등록 모드: createAt = 현재 날짜·시간 (백엔드 LocalDateTime 형식: yyyy-MM-ddTHH:mm:ss)
      // 수정 모드에서는 createAt 변경 없음
      if (!isEdit) {
        const now = new Date().toISOString().slice(0, 10) // "2026-04-19"
        fd.append('createAt', now)
      }

      // 수정 모드: movieId 포함
      if (isEdit) {
        const movieId = editMovie?.movieId ?? editMovie?.id
        if (movieId != null) fd.append('movieId', String(movieId))
      }

      // 포스터: 직접 업로드 파일 OR TMDB URL
      const file = fileRef.current?.files?.[0]
      if (file) {
        // 직접 파일 업로드 → image 필드
        fd.append('image', file)
      } else if (form.posterPath) {
        // TMDB 선택 → posterPath 필드 (백엔드에서 URL 다운로드)
        fd.append('posterPath', form.posterPath)
      }

      /**
       * multipart/form-data 전송 시 Content-Type 헤더를 직접 지정하지 않음
       * → axios가 FormData를 감지해 자동으로 multipart/form-data; boundary=... 설정
       * 명시하면 boundary가 빠져서 파싱 실패할 수 있음
       */
      /**
       * 등록: POST  /api/movie/upload  (백엔드 @PostMapping)
       * 수정: PATCH /api/movie/modify  (백엔드 @PatchMapping) ← 반드시 patch 사용
       * POST로 보내면 405 Method Not Allowed 발생
       */
      const endpoint = isEdit ? '/admin/movie/modify' : '/admin/movie/upload'
      // Content-Type을 undefined로 지정 → apiClient 기본값(application/json) 제거
      // → axios가 FormData를 감지해 multipart/form-data; boundary=... 자동 설정
      await (isEdit
        ? apiClient.patch(endpoint, fd, { headers: { 'Content-Type': undefined } })
        : apiClient.post(endpoint,  fd, { headers: { 'Content-Type': undefined } })
      )

      setSuccess(true)
      setTimeout(() => navigate('/admin/management/movie/list'), 1500)

    } catch (err: unknown) {
      // axios 에러인 경우 서버 응답 메시지 추출
      let message = '알 수 없는 오류가 발생했습니다.'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { status?: number; data?: unknown } }).response
        const status = res?.status ?? ''
        const data   = res?.data
        const detail = typeof data === 'string' ? data
          : data && typeof data === 'object' && 'message' in data
            ? String((data as { message: unknown }).message)
            : JSON.stringify(data)
        message = `서버 오류 ${status}: ${detail}`
      } else if (err instanceof Error) {
        message = err.message
      }
      setSubmitError(`${isEdit ? '수정' : '등록'}에 실패했습니다. ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── 성공 화면 ── */
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <CheckCircle size={52} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>
          {isEdit ? '수정 완료!' : '등록 완료!'}
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>영화 목록으로 돌아갑니다.</p>
      </div>
    )
  }

  /* ── 메인 렌더 ── */
  return (
    <>
      {/* TMDB 리스트 행 hover CSS */}
      <style>{`
        @keyframes _spin { to { transform: rotate(360deg) } }
        ._spin { animation: _spin 0.75s linear infinite; display: inline-flex; }
        .tmdb-row:hover  { background: var(--bg-modal) !important; }
        .tmdb-row:active { opacity: 0.7; }
      `}</style>

      <h2 style={pageTitle}>{isEdit ? '영화 수정' : '영화 등록'}</h2>

      {/* ══════════════════════════════════════
          2컬럼: 좌(폼) + 우(TMDB 패널)
      ══════════════════════════════════════ */}
      <div style={twoColLayout}>

        {/* ╔══════════════╗
            ║  LEFT — 폼   ║
            ╚══════════════╝ */}
        <div style={leftCol}>

          {/* TMDB 자동입력 완료 배너
              배경색: var(--bg-surface) — 다크/라이트 모두 대응
              테두리: var(--color-brand-default) (골드) */}
          {tmdbFilled && (
            <div style={tmdbFilledBanner}>
              <Sparkles size={14} color="var(--color-brand-default)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
                TMDB 정보를 불러왔습니다. 내용을 검토·수정한 뒤{' '}
                <strong>{isEdit ? '수정' : '등록'}</strong>을 눌러주세요.
              </span>
              <button type="button" onClick={() => setTmdbFilled(false)} style={bannerCloseBtn}>
                <X size={12} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── 포스터 섹션 ── */}
            <div style={section}>
              <span style={sectionLabel}>포스터 이미지</span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={posterBox} onClick={() => fileRef.current?.click()}>
                  {posterPreview ? (
                    <img
                      src={posterPreview}
                      alt="포스터 미리보기"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : (
                    <div style={posterPH}>
                      <span style={{ fontSize: 28 }}>📷</span>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        클릭하여 업로드
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePosterChange}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                  <p>권장: 2:3 비율</p>
                  <p>지원: JPG, PNG, WEBP</p>
                  {tmdbFilled && posterPreview && (
                    <p style={{ color: 'var(--color-brand-default)', marginTop: 4, fontWeight: 600, fontSize: 11 }}>
                      ✓ TMDB 포스터
                    </p>
                  )}
                  {posterPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPosterPreview(null)
                        setForm((prev) => ({ ...prev, posterPath: null }))
                        setTmdbFilled(false)
                        if (fileRef.current) fileRef.current.value = ''
                      }}
                      style={removePosterBtn}
                    >
                      이미지 제거
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── 기본 정보 섹션 ── */}
            <div style={section}>
              <span style={sectionLabel}>기본 정보</span>
              <div style={grid2}>
                <Field label="제목" required error={errors.title}>
                  <input
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    style={input} placeholder="영화 제목"
                  />
                </Field>
                <Field label="장르" error={errors.genre}>
                  <input
                    value={form.genre}
                    onChange={(e) => handleChange('genre', e.target.value)}
                    style={input} placeholder="예: 액션, SF"
                  />
                </Field>
                <Field label="관람등급" required>
                  <select
                    value={form.rating}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    style={input}
                  >
                    {RATING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="감독" required error={errors.director}>
                  <input
                    value={form.director}
                    onChange={(e) => handleChange('director', e.target.value)}
                    style={input} placeholder="감독 이름"
                  />
                </Field>
                <Field label="상영시간(분)" required error={errors.runtime}>
                  <input
                    type="number"
                    value={form.runtime}
                    onChange={(e) => handleChange('runtime', e.target.value)}
                    style={input} placeholder="예: 120" min={1}
                  />
                </Field>
                <Field label="개봉일" required error={errors.startAt}>
                  <input
                    type="date"
                    value={form.startAt}
                    onChange={(e) => handleChange('startAt', e.target.value)}
                    style={input}
                  />
                </Field>
                <Field label="종영일">
                  <input
                    type="date"
                    value={form.endAt ?? ''}
                    onChange={(e) => handleChange('endAt', e.target.value || null)}
                    style={input} min={form.startAt}
                  />
                </Field>
              </div>

              <Field label="출연진" style={{ marginTop: 12 }}>
                <input
                  value={form.cast}
                  onChange={(e) => handleChange('cast', e.target.value)}
                  style={input} placeholder="주연 배우 (쉼표로 구분)"
                />
              </Field>

              <Field label="줄거리" style={{ marginTop: 12 }}>
                <textarea
                  value={form.synopsis}
                  onChange={(e) => handleChange('synopsis', e.target.value)}
                  style={{ ...input, height: 90, resize: 'vertical' }}
                  placeholder="영화 줄거리를 입력해 주세요."
                />
              </Field>
            </div>

            {/* 제출 에러 */}
            {submitError && (
              <div style={submitErrorBox}>{submitError}</div>
            )}

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={cancelBtn}
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="submit"
                style={{ ...submitBtn, opacity: submitting ? 0.7 : 1 }}
                disabled={submitting}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span className="_spin"><RefreshCw size={15} /></span>
                    {isEdit ? '수정 중...' : '등록 중...'}
                  </span>
                ) : (
                  isEdit ? '수정' : '등록'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ╔══════════════════════╗
            ║  RIGHT — TMDB 패널   ║
            ║  (리스트 형태)        ║
            ╚══════════════════════╝ */}
        <div style={rightCol}>
          <div style={tmdbPanel}>

            {/* 패널 헤더 */}
            <div style={tmdbPanelHeader}>
              <Film size={15} color="var(--color-brand-default)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                TMDB 불러오기
              </span>
            </div>

            {/* 검색 바 */}
            <div style={tmdbSearchWrap}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={13}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="제목 검색..."
                  style={tmdbSearchInput}
                />
              </div>
              {isSearchMode ? (
                // 검색 모드: X 버튼 → 인기 영화 복귀
                <button
                  type="button"
                  style={tmdbIconBtn}
                  onClick={() => { setTmdbQuery(''); fetchPopularMovies() }}
                  title="초기화"
                >
                  <X size={13} />
                </button>
              ) : (
                // 기본 모드: 돋보기 버튼 → 검색 실행
                <button
                  type="button"
                  style={tmdbIconBtn}
                  onClick={handleSearch}
                  disabled={tmdbLoading}
                >
                  <Search size={13} />
                </button>
              )}
            </div>

            {/* 목록 타이틀 */}
            <p style={tmdbListLabel}>
              {isSearchMode
                ? `"${tmdbQuery}" (${tmdbMovies.length}건)`
                : '🔥 인기 영화'}
            </p>

            {/* 로딩 */}
            {tmdbLoading && (
              <div style={tmdbCenter}>
                <span className="_spin" style={{ color: 'var(--color-brand-default)' }}>
                  <RefreshCw size={20} />
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  불러오는 중...
                </span>
              </div>
            )}

            {/* 에러 */}
            {!tmdbLoading && tmdbError && (
              <div style={tmdbErrorBox}>{tmdbError}</div>
            )}

            {/* ── 영화 리스트 ── */}
            {!tmdbLoading && !tmdbError && tmdbMovies.length > 0 && (
              <div style={tmdbList}>
                {tmdbMovies.map((movie, idx) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="tmdb-row"
                    style={{
                      ...tmdbRow,
                      borderTop: idx === 0 ? '1px solid var(--border-default)' : 'none',
                      // 선택 중인 항목: 브랜드 색 배경
                      background: selectingId === movie.id
                        ? 'var(--bg-modal)'
                        : 'transparent',
                      opacity: selectingId !== null && selectingId !== movie.id ? 0.45 : 1,
                      cursor: selectingId !== null ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => handleSelectMovie(movie)}
                    disabled={selectingId !== null}
                    title={movie.title}
                  >
                    {/* 로딩 중인 항목에 스피너 표시 */}
                    {selectingId === movie.id ? (
                      <span className="_spin" style={{ color: 'var(--color-brand-default)', flexShrink: 0 }}>
                        <RefreshCw size={13} />
                      </span>
                    ) : (
                      <Film size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    )}
                    {/* 영화 제목 */}
                    <span style={tmdbRowTitle}>{movie.title}</span>
                    {/* 우측 화살표 */}
                    <ChevronRight size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 'auto' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Field 래퍼 컴포넌트
───────────────────────────────────────── */
interface FieldProps {
  label:     string
  required?: boolean
  error?:    string
  children:  React.ReactNode
  style?:    React.CSSProperties
}
function Field({ label, required, error, children, style }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={fieldLabel}>
        {label}
        {required && <span style={{ color: 'var(--color-error-main)' }}> *</span>}
      </label>
      {children}
      {error && <p style={errorMsg}>{error}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────
   스타일 정의
───────────────────────────────────────── */

const twoColLayout: React.CSSProperties = {
  display: 'flex', gap: 20, alignItems: 'flex-start',
}
const leftCol: React.CSSProperties = {
  flex: 1, minWidth: 0,
}
const rightCol: React.CSSProperties = {
  width: 260, flexShrink: 0,
  position: 'sticky', top: 20,
}

/* TMDB 패널 */
const tmdbPanel: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 12,
  border: '1px solid var(--color-brand-default)',
  overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}
const tmdbPanelHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7,
  padding: '11px 14px 10px',
  borderBottom: '1px solid var(--border-default)',
  background: 'var(--bg-base)',
}
const tmdbSearchWrap: React.CSSProperties = {
  display: 'flex', gap: 6, padding: '10px 10px 6px',
}
const tmdbSearchInput: React.CSSProperties = {
  width: '100%', padding: '7px 8px 7px 28px',
  border: '1px solid var(--border-default)', borderRadius: 7,
  fontSize: 13, color: 'var(--text-primary)',
  background: 'var(--input-bg)', outline: 'none', boxSizing: 'border-box',
}
const tmdbIconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, flexShrink: 0,
  background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 7, cursor: 'pointer',
}
const tmdbListLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  padding: '0 12px 4px', margin: 0,
}
const tmdbCenter: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '28px 0', gap: 4,
}
const tmdbErrorBox: React.CSSProperties = {
  margin: '0 10px 10px', padding: '10px 12px',
  background: 'var(--color-error-bg)',
  border: '1px solid var(--color-error-text)',
  borderRadius: 8, fontSize: 12, color: 'var(--color-error-text)',
  whiteSpace: 'pre-line',
}

/* 영화 리스트 (스크롤 가능) */
const tmdbList: React.CSSProperties = {
  maxHeight: 460, overflowY: 'auto',
  borderTop: 'none',
}
/* 리스트 행 */
const tmdbRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '9px 12px',
  borderBottom: '1px solid var(--border-default)',
  textAlign: 'left', cursor: 'pointer',
  transition: 'background 0.1s, opacity 0.15s',
}
const tmdbRowTitle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)',
  // 1줄 말줄임
  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  flex: 1,
}

/* 폼 스타일 */
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16,
}
const section: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 12,
  padding: '18px 20px', marginBottom: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 12,
}
const grid2: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px',
}
const input: React.CSSProperties = {
  padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
}
const errorMsg: React.CSSProperties = {
  fontSize: 11, color: 'var(--color-error-main)', margin: 0,
}
const posterBox: React.CSSProperties = {
  width: 108, height: 162, border: '2px dashed var(--border-default)',
  borderRadius: 8, cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
}
const posterPH: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
}
const removePosterBtn: React.CSSProperties = {
  marginTop: 8, padding: '3px 9px',
  background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
  borderRadius: 6, fontSize: 11, color: 'var(--color-error-text)', cursor: 'pointer',
}
const cancelBtn: React.CSSProperties = {
  padding: '11px 22px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)',
}
const submitBtn: React.CSSProperties = {
  flex: 1, padding: '11px 22px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s',
}
const submitErrorBox: React.CSSProperties = {
  padding: '10px 14px', marginBottom: 12,
  background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
  borderRadius: 8, fontSize: 13, color: 'var(--color-error-text)',
}

/* TMDB 자동입력 완료 배너
   background: var(--bg-surface) — 다크/라이트 모두 안전하게 대응
   border:     var(--color-brand-default) — 골드 테두리로 구분 */
const tmdbFilledBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '9px 12px', marginBottom: 12,
  background: 'var(--bg-surface)',
  border: '1px solid var(--color-brand-default)',
  borderRadius: 8,
}
const bannerCloseBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', padding: 2,
  display: 'flex', alignItems: 'center', flexShrink: 0,
}

export default MovieFormPage
