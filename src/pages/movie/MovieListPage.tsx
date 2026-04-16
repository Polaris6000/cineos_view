/**
 * MovieListPage.tsx — 상영작 목록 페이지
 *
 * 기능:
 *  - 탭: 현재 상영 중 / 상영 예정 전환
 *  - 필터: 장르 · 등급 (단일 선택 칩)
 *  - 검색: 키워드로 영화 제목 필터링 (터치 키보드 연동)
 *  - 카드 그리드: 포스터 · 제목 · 장르 · 등급 배지 · 런타임
 *  - 카드 클릭 → UC-02 영화 상세 페이지로 이동
 *
 * API 연동:
 *  - 현재 상영 중 탭: GET /api/movie/admin/admin/readAll → startAt ≤ today AND endAt 없거나 ≥ today 필터링
 *  - 상영 예정 탭:    GET /api/movie/admin/admin/readAll → startAt > today 필터링
 *
 * FHD(1080×1920) 세로형 키오스크 기준 레이아웃
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Film } from 'lucide-react'
import { RATING_OPTIONS } from '../../api/mockData'
import apiClient, { type MovieDTO, type ScheduleDTO, type TheaterDTO, type SeatPolicyDTO, resolvePosterUrl } from '../../api/apiClient'
import styles from './MovieListPage.module.css'

/** 상영관 종류 필터 옵션 */
const THEATER_TYPE_OPTIONS = [
  { value: '',          label: '전체' },
  { value: 'NORMAL',    label: '일반 상영관' },
  { value: 'RECLINER',  label: '리클라이너' },
]

/** 등급 → 표시 텍스트 (카드용 짧은 형식) */
const RATING_LABEL: Record<string, string> = {
  ALL:  '전체관람가',
  '12': '12세 이상',
  '15': '15세 이상',
  '19': '청소년 관람불가',
}

/** 런타임(분) → "2시간 46분" 형식 변환 */
function formatRuntime(minutes: number | undefined) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}` : `${m}분`
}

/**
 * 백엔드 MovieDTO → 프론트 표시용 Movie 형식으로 변환
 * 필드명 차이: movieId→id, actors→cast, description→synopsis, posterPath→posterUrl
 */
function toDisplayMovie(dto: MovieDTO) {
  return {
    id:        dto.movieId,
    title:     dto.title,
    genre:     dto.genre ?? '',
    rating:    dto.rating,
    runtime:   dto.runtime,
    director:  dto.director ?? '',
    cast:      dto.actors ?? '',
    synopsis:  dto.description ?? '',
    startAt:   dto.startAt,
    endAt:     dto.endAt,
    posterUrl: resolvePosterUrl(dto.posterPath),
  }
}

function MovieListPage() {
  const navigate = useNavigate()
  const today    = new Date().toLocaleDateString('en-CA')

  // 현재 활성 탭: 'now' | 'upcoming'
  const [activeTab, setActiveTab] = useState('now')

  // API 데이터
  const [nowPlaying, setNowPlaying] = useState<ReturnType<typeof toDisplayMovie>[]>([])
  const [upcoming,   setUpcoming]   = useState<ReturnType<typeof toDisplayMovie>[]>([])
  const [loading,    setLoading]    = useState(false)

  // 필터 상태
  const [selectedGenre,       setSelectedGenre]       = useState('전체')
  const [selectedRating,      setSelectedRating]      = useState('')
  const [selectedTheaterType, setSelectedTheaterType] = useState('')
  const [searchQuery,         setSearchQuery]         = useState('')



  //영화에 대한 정보를 저장.
  const [nowMovies, setNowMovies] = useState<Movie[]>([]); //현재 상영중인 영화
  const [commingMovies, setCommingMovies] = useState<Movie[]>([]); // 상영 예정인 영화

  const [schedules, setSchedule] = useState<Schedule[]>([]);
  const [theaters, setTheater] = useState<Theater[]>([]);


  //이부분을 get호출로 변경
  useEffect(() => {
    const axiosMovies = async () => {
      try {
        const { data } = await axios.get<MovieDTO[]>('/api/movie/readAll')
        const formattedMovies = data.map((dto) => mapToMovie(dto))

        console.log("변환된 데이터:", formattedMovies); // 화면 확인
        console.log("today : ",today);


        setNowMovies(formattedMovies.filter((movie) => movie.startAt <= today && movie.endAt >= today))
        setCommingMovies(formattedMovies.filter((movie) =>  movie.startAt > today ))

      } catch (error) {
        console.error("❌ 영화 로딩 중 에러:", error);
      }
    };

    axiosMovies();
  }, []); // 빈 배열: 페이지 처음 들어올 때만 실행

  //스케쥴 정보를 가져오기 위해서 사용
  useEffect(() => {
    const axiosSchedule = async () => {
        try {
            const { data } = await axios.get<ScheduleDTO[]>('/api/admin/schedule/DTOlist')
            console.log("스케쥴 정보", data);


            const formattedSchedule = data.map((dto) => mapToSchedule(dto))
            // console.log("변환된 데이터:", formattedSchedule); // 화면 확인

            setSchedule(formattedSchedule);

        } catch (error) {
            console.error("❌ 스케쥴 로딩 중 에러:", error);
        }
    };

    axiosSchedule();
}, []); //첫 로딩에 사용

//영화관 정보를 가져오기 위해서 사용
useEffect(() => {
    const axiosTheater = async () => {
        try {
            const { data } = await axios.get<TheaterDTO[]>('/api/admin/theater/dtoAll')
            console.log("영화관 정보 : ", data);


            const formattedTheater = data.map((dto) => mapToTheater(dto))

            // console.log("변환된 데이터:", formattedTheater); // 화면 확인

            setTheater(formattedTheater)

        } catch (error) {
            console.error("❌ 영화관 로딩 중 에러:", error);
        }
    };

    axiosTheater();
}, []); //첫 로딩에 사용

  // 탭에 따라 기본 목록 결정
  const baseList = activeTab === 'now' ? nowPlaying : upcoming

  /**
   * 현재 탭 영화 목록 기준 장르 옵션 동적 생성
   * 영화에 없는 장르는 표시하지 않음
   */
  const genreOptions = useMemo(() => {
    const genres = new Set<string>()
    baseList.forEach((m) => {
      m.genre.split(',').forEach((g) => {
        const t = g.trim()
        if (t) genres.add(t)
      })
  const getMovieTheaterTypes = (movieId: number): Set<string> => {
    const today = new Date().toISOString().slice(0, 10)
    const todaySchedules = (schedules).filter((s) => s.movieId === movieId && s.date === today)
    const types = new Set<string>()
    todaySchedules.forEach((s) => {
      const theater = theaters.find((t) => t.id === s.theaterId)
      if (!theater) return
      if (theater.hasRecliner) types.add('RECLINER')
      else types.add('NORMAL')
    })
    return ['전체', ...Array.from(genres).sort()]
  }, [baseList])

  /**
   * useMemo로 필터링 결과 메모이제이션
   */
  const filteredMovies = useMemo(() => {
    return baseList.filter(movie => {
      // 장르 필터 (동적)
      if (selectedGenre !== '전체' && !movie.genre.includes(selectedGenre)) return false
      // 등급 필터
      if (selectedRating && movie.rating !== selectedRating) return false
      // 상영관 종류 필터
      if (selectedTheaterType) {
        const types = movieTheaterTypes.get(movie.id)
        if (!types || !types.has(selectedTheaterType)) return false
      }
      // 검색어 필터
      if (searchQuery.trim() && !movie.title.includes(searchQuery.trim())) return false
      return true
    })
  }, [baseList, selectedGenre, selectedRating, selectedTheaterType, searchQuery, movieTheaterTypes])

  /** 탭 전환 시 필터 전체 초기화 */
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSelectedGenre('전체')
    setSelectedRating('')
    setSelectedTheaterType('')
    setSearchQuery('')
  }

  /** 카드 클릭 → 영화 상세 페이지 */
  const handleCardClick = (movieId: number) => {
    navigate(`/movie/detail/${movieId}`)
  }

  return (
    <div className={styles.page}>

      {/* ── 페이지 헤더 ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>현장 예매</h1>
      </div>

      {/* ── 탭: 현재 상영 중 / 상영 예정 ── */}
      <div className={styles.tabs} role="tablist" aria-label="상영 구분">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'now'}
          className={`${styles.tab} ${activeTab === 'now' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('now')}
        >
          현재 상영 중
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upcoming'}
          className={`${styles.tab} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('upcoming')}
        >
          상영 예정작
        </button>
      </div>

      {/* ── 필터 바 ── */}
      <section className={styles.filterBar} aria-label="필터 및 검색">

        {/* 장르 필터 — 현재 탭 영화 목록 기준 동적 생성 */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>장르</span>
          <div className={styles.chipGroup} role="group">
            {genreOptions.map(genre => (
              <button
                key={genre}
                type="button"
                className={`${styles.chip} ${selectedGenre === genre ? styles.chipActive : ''}`}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* 상영관 종류 필터 */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>상영관</span>
          <div className={styles.chipGroup} role="group">
            {THEATER_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.chip} ${selectedTheaterType === opt.value ? styles.chipActive : ''}`}
                onClick={() => setSelectedTheaterType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 등급 필터 */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>등급</span>
          <div className={styles.chipGroup} role="group">
            {RATING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.chip} ${selectedRating === opt.value ? styles.chipActive : ''}`}
                onClick={() => setSelectedRating(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 검색 — 터치 시 터치 키보드 팝업 */}
        <div className={`${styles.filterRow} ${styles.filterRowSearch}`}>
          <span className={styles.filterLabel}>검색</span>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="영화 제목을 입력해 주세요"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              maxLength={50}
            />
            {/* X 버튼: 검색어 있을 때만 표시 */}
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

      </section>

      {/* ── 결과 영역 ── */}
      <section className={styles.resultArea} role="tabpanel" aria-live="polite">
        {/* 로딩 표시 */}
        {loading && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>불러오는 중...</p>
          </div>
        )}
        {!loading && filteredMovies.length === 0 && (
          /* 빈 결과 */
          <div className={styles.empty}>
            <Film size={52} color="var(--text-muted)" />
            <p className={styles.emptyText}>
              {searchQuery
                ? `"${searchQuery}" 검색 결과가 없습니다.`
                : activeTab === 'now'
                  ? '현재 상영 중인 영화가 없습니다.'
                  : '상영 예정 영화가 없습니다.'}
            </p>
          </div>
        )}
        {!loading && filteredMovies.length > 0 && (
          /* 영화 카드 그리드 */
          <ul className={styles.grid} aria-label="영화 목록">
            {filteredMovies.map(movie => (
              <li key={movie.id}>
                <article
                  className={styles.card}
                  onClick={() => handleCardClick(movie.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleCardClick(movie.id)}
                  aria-label={`${movie.title} 상세 보기`}
                >
                  {/* 포스터 이미지 */}
                  <div className={styles.cardImgWrap}>
                    <img
                      className={styles.cardImg}
                      src={movie.posterUrl || '/placeholder-poster.jpg'}
                      alt={`${movie.title} 포스터`}
                      onError={e => { (e.target as HTMLImageElement).src = '/placeholder-poster.jpg' }}
                    />
                  </div>

                  {/* 카드 텍스트 */}
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{movie.title}</h2>
                    <div className={styles.cardMeta}>
                      <span className={`${styles.badge} ${styles[`badge${movie.rating}`]}`}>
                        {RATING_LABEL[movie.rating] ?? movie.rating}
                      </span>
                      <div className={styles.cardGenre}>{movie.genre}</div>
                    </div>
                    <p className={styles.cardRuntime}>{formatRuntime(movie.runtime)}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}

export default MovieListPage
