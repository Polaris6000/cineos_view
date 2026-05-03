/**
 * MovieListPage.jsx — 상영작 목록 페이지
 *
 * 기능:
 *  - 탭: 현재 상영 중 / 상영 예정 전환
 *  - 필터: 장르 · 등급 (단일 선택 칩)
 *  - 검색: 키워드로 영화 제목 필터링 (터치 키보드 연동)
 *  - 카드 그리드: 포스터 · 제목 · 장르 · 등급 배지 · 런타임
 *  - 카드 클릭 → 영화 상세 페이지로 이동
 *
 * 터치 키보드:
 *  - 검색 input 포커스(터치) 시 useKeyboard().openKeyboard() 호출
 *  - KeyboardContext 를 통해 전역 TouchKeyboard 컴포넌트가 하단에 표시됨
 *
 * FHD(1080×1920) 세로형 키오스크 기준 레이아웃
 */
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Film, Search, X} from 'lucide-react'
import axios from 'axios'
import {
    mapToMovie,
    mapToSchedule,
    mapToTheater,
    Movie,
    MovieDTO,
    Schedule,
    ScheduleDTO,
    Theater,
    TheaterDTO,
} from '../../api/typeData'
import styles from './MovieListPage.module.css'

// ── 필터 옵션 상수 ──
// 장르 옵션은 nowMovies에서 동적으로 추출 (아래 useMemo 참고)

/** 등급 필터 옵션 */
const RATING_OPTIONS = [
    {label: '전체', value: ''},
    {label: '전체관람가', value: 'ALL'},
    {label: '12세 이상', value: '12'},
    {label: '15세 이상', value: '15'},
    {label: '청소년 관람불가', value: '19'},
]

/** 상영관 타입 필터 옵션 */
const THEATER_TYPE_OPTIONS = [
    {label: '전체', value: 'ALL'},
    {label: '일반상영관', value: 'NORMAL'},
    {label: '리클라이너 상영관', value: 'RECLINER'},
]

/** 등급 → 표시 텍스트 (카드용 짧은 형식) */
const RATING_LABEL = {
    ALL: '전체관람가',
    '12': '12세 이상',
    '15': '15세 이상',
    '19': '청소년 관람불가',
}

/** 런타임(분) → "2시간 46분" 형식 변환 */
function formatRuntime(minutes: number | undefined | null) {
    if (!minutes) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}` : `${m}분`
}

function MovieListPage() {
    const navigate = useNavigate()

    // 필터 상태
    const [selectedGenre, setSelectedGenre] = useState('전체')
    const [selectedRating, setSelectedRating] = useState('')
    // 상영관 타입 필터: 'ALL' | 'NORMAL' | 'RECLINER'
    const [selectedTheaterType, setSelectedTheaterType] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // 현재 상영 중인 영화 목록
    const [nowMovies, setNowMovies] = useState<Movie[]>([])

    const [schedules, setSchedule] = useState<Schedule[]>([]);
    const [theaters, setTheater] = useState<Theater[]>([]);


    //이부분을 get호출로 변경
    useEffect(() => {
        const axiosMovies = async () => {
            try {
                const {data} = await axios.get<MovieDTO[]>('/api/movie/all')
                const formattedMovies = data.map((dto) => mapToMovie(dto))

                setNowMovies(formattedMovies)

            } catch (error) {
                console.error("영화 로딩 중 에러:", error);
            }
        };

        axiosMovies();
    }, []); // 빈 배열: 페이지 처음 들어올 때만 실행

    // 스케줄 정보 로드 (상영관 타입 필터용)
    useEffect(() => {
        const axiosSchedule = async () => {
            try {
                const {data} = await axios.get<ScheduleDTO[]>('/api/schedule/DTOlist')
                setSchedule(data.map((dto) => mapToSchedule(dto)))
            } catch (error) {
                console.error("스케쥴 로딩 중 에러:", error)
            }
        }
        axiosSchedule()
    }, [])

// 영화관 정보 조회: GET /api/theater/dtoAll (CustomerController, 인증 불필요)
    useEffect(() => {
        const axiosTheater = async () => {
            try {
                const {data} = await axios.get<TheaterDTO[]>('/api/theater/dtoAll')
                console.log("영화관 정보 : ", data);


                const formattedTheater = data.map((dto) => mapToTheater(dto))

                // console.log("변환된 데이터:", formattedTheater); // 화면 확인

                setTheater(formattedTheater)

            } catch (error) {
                console.error(" 영화관 로딩 중 에러:", error);
            }
        };

        axiosTheater();
    }, []); //첫 로딩에 사용

    const today = new Date().toLocaleDateString('en-CA')

    /**
     * 시작 시간(HH:mm)이 현재 시각보다 이전인지 확인
     * 당일 기준이므로 날짜는 이미 today로 필터된 상태에서 호출
     */
    const isPast = (startTime: string): boolean => {
        const now = new Date()
        const [h, m] = startTime.split(':').map(Number)
        const t = new Date()
        t.setHours(h, m, 0, 0)
        return now > t
    }

    /**
     * 해당 영화의 오늘 상영 중 아직 시작하지 않은 회차가 하나라도 있으면 true
     * schedules 로드 전(length === 0)에는 true 반환 — 로드 전 깜박임 방지
     */
    const hasRemainingToday = (movieId: number): boolean => {
        if (schedules.length === 0) return true
        const todaySchedules = schedules.filter(s => s.movieId === movieId && s.date === today)
        if (todaySchedules.length === 0) return false
        return todaySchedules.some(s => !isPast(s.startTime))
    }

    // schedule.isRecliner를 직접 사용 — theaters 별도 조회 불필요, ID 매칭 실패 문제 원천 제거
    const getMovieTheaterTypes = (movieId: number): Set<string> => {
        const todaySchedules = schedules.filter((s) => s.movieId === movieId && s.date === today)
        const types = new Set<string>()
        todaySchedules.forEach((s) => {
            if (s.isRecliner) types.add('RECLINER')
            else types.add('NORMAL')
        })
        return types
    }

    /**
     * 장르 옵션 동적 추출
     *
     * nowMovies가 바뀔 때마다 실제 존재하는 장르만 칩으로 표시.
     * movie.genre는 "액션,SF" 처럼 쉼표 구분 문자열일 수 있으므로 split 후 중복 제거.
     * '전체'는 항상 첫 번째, 나머지는 가나다/알파벳 정렬.
     */
    const genreOptions = useMemo(() => {
        const genreSet = new Set<string>()
        nowMovies.forEach(movie => {
            movie.genre
                .split(',')                  // "액션,SF" → ["액션", "SF"]
                .map(g => g.trim())          // 앞뒤 공백 제거
                .filter(Boolean)             // 빈 문자열 제거
                .forEach(g => genreSet.add(g))
        })
        return ['전체', ...Array.from(genreSet).sort()]
    }, [nowMovies])

    /**
     * 영화 목록이 바뀌어 현재 선택된 장르가 더 이상 존재하지 않으면 '전체'로 리셋.
     * 예: "SF" 영화가 내려간 뒤 SF 칩이 사라졌는데 필터가 SF로 남아있는 상황 방지.
     */
    useEffect(() => {
        if (selectedGenre !== '전체' && !genreOptions.includes(selectedGenre)) {
            setSelectedGenre('전체')
        }
    }, [genreOptions, selectedGenre])

    /**
     * 장르 파싱 헬퍼 — 쉼표 구분 장르 문자열을 배열로 변환
     * useMemo/filter 내부에서 반복 사용하므로 useCallback으로 메모이제이션
     */
    const parseGenres = useCallback((genreStr: string): string[] => {
        return genreStr.split(',').map(g => g.trim()).filter(Boolean)
    }, [])

    /**
     * useMemo로 필터링 결과 메모이제이션
     * baseList, 필터 상태가 바뀔 때만 재계산
     */
    const filteredMovies = useMemo(() => {
        return nowMovies.filter(movie => {
            // 오늘 상영이 모두 종료된 영화는 목록에서 제외
            if (!hasRemainingToday(movie.id)) return false
            if (selectedGenre !== '전체' && !parseGenres(movie.genre).includes(selectedGenre)) return false
            if (selectedRating && movie.rating !== selectedRating) return false
            if (selectedTheaterType !== 'ALL') {
                const types = getMovieTheaterTypes(movie.id)
                if (!types.has(selectedTheaterType)) return false
            }
            if (searchQuery.trim() && !movie.title.includes(searchQuery.trim())) return false
            return true
        })
        // schedules는 비동기 로드 + isPast 기준이 시각에 따라 달라지므로 반드시 deps에 포함
    }, [nowMovies, selectedGenre, selectedRating, selectedTheaterType, searchQuery, parseGenres, schedules, theaters])

    /** 카드 클릭 → 영화 상세 페이지 */
    const handleCardClick = (movieId: number) => {
        navigate(`/movie/detail/${movieId}`)
    }

    return (
        <div className={styles.page}>

            {/* ── 페이지 헤더 ── */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>영화</h1>
            </div>

            {/* ── 필터 바 ── */}
            <section className={styles.filterBar} aria-label="필터 및 검색">

                {/* 장르 필터 */}
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>장르</span>
                    <div className={styles.chipGroup} role="group">
                        {/* genreOptions: nowMovies에서 동적으로 추출 — 영화가 없어지면 칩도 사라짐 */}
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

                {/* 상영관 타입 필터: 일반상영관 / 리클라이너 상영관 */}
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

                {/* 검색 — 터치 시 터치 키보드 팝업 */}
                <div className={`${styles.filterRow} ${styles.filterRowSearch}`}>
                    <span className={styles.filterLabel}>검색</span>
                    <div className={styles.searchWrap}>
                        <Search size={18} className={styles.searchIcon}/>
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
                                <X size={18}/>
                            </button>
                        )}
                    </div>
                </div>

            </section>

            {/* ── 결과 영역 ── */}
            <section className={styles.resultArea} role="tabpanel" aria-live="polite">
                {filteredMovies.length === 0 ? (
                    /* 빈 결과 */
                    <div className={styles.empty}>
                        <Film size={52} color="var(--text-muted)"/>
                        <p className={styles.emptyText}>
                            {searchQuery
                                ? `"${searchQuery}" 검색 결과가 없습니다.`
                                : '현재 상영 중인 영화가 없습니다.'}
                        </p>
                    </div>
                ) : (
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
                                            onError={e => {
                                                (e.target as HTMLImageElement).src = '/placeholder-poster.jpg'
                                            }}
                                        />
                                    </div>

                                    {/* 카드 텍스트 */}
                                    <div className={styles.cardBody}>
                                        <h2 className={styles.cardTitle}>{movie.title}</h2>
                                        <div className={styles.cardMeta}>
                                            <div className={styles.cardMetaRow}>
                        <span className={`${styles.badge} ${styles[`badge${movie.rating}`]}`}>
                          {(RATING_LABEL as Record<string, string>)[movie.rating] ?? movie.rating}
                        </span>
                                                {getMovieTheaterTypes(movie.id).has('RECLINER') && (
                                                    <span className={styles.reclinerBadge}>리클라이너</span>
                                                )}
                                            </div>
                                            <span className={styles.cardGenre}>{movie.genre}</span>
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
