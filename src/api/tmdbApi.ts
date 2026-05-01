/**
 * tmdbApi.ts — TMDB 관련 백엔드 API 호출 함수 모음
 *
 * 백엔드 엔드포인트 (TmdbController):
 *   GET /api/tmdb/popular?page=1     → 인기 영화 목록 (TmdbMovieItem[])
 *   GET /api/tmdb/search?title=검색어 → 제목 검색 결과 (TmdbMovieItem[])
 *   GET /api/tmdb/{tmdbId}           → 영화 상세 정보 (TmdbMovieDetail)
 *
 * ※ 백엔드에서 popular/search 응답의 posterPath는 이미 full URL로 내려옴
 *   (https://image.tmdb.org/t/p/w500/xxx.jpg)
 *   → 프론트에서 별도로 base URL 붙일 필요 없음
 */

/**
 * TMDB 영화 목록 아이템 타입
 * (백엔드 TmdbMovieDTO에 대응)
 * popular / search 결과 모두 이 타입으로 반환됨
 */
export interface TmdbMovieItem {
    /** TMDB 영화 고유 ID */
    id: number
    /** 영화 제목 (한국어) */
    title: string
    /**
     * 포스터 이미지 전체 URL
     * 백엔드에서 이미 imageBaseUrl을 붙여서 반환함
     * e.g. "https://image.tmdb.org/t/p/w500/abc123.jpg"
     */
    posterPath: string | null
}

/**
 * TMDB 영화 상세 정보 타입
 * (백엔드 MovieDTO에 대응)
 *
 * ※ 백엔드 필드명:
 *   - actors      (배우, 쉼표 구분)
 *   - description (줄거리)
 *   - posterPath  (full URL, 백엔드에서 붙여서 반환)
 */
export interface TmdbMovieDetail {
    /** 영화 제목 */
    title: string
    /** 장르 (쉼표 구분, e.g. "액션, SF") */
    genre: string
    /** 감독 이름 */
    director: string
    /** 출연 배우 상위 5명 (쉼표 구분) — 백엔드 필드명: actors */
    actors: string
    /** 상영시간 (분) */
    runtime: number
    /** 줄거리 (overview) — 백엔드 필드명: description */
    description?: string
    /**
     * 포스터 이미지 전체 URL
     * 백엔드에서 tmdbConfig.imageUrl + posterPath로 조합해서 반환
     */
    posterPath: string | null
    /**
     * 한국 관람 등급 (TMDB release_dates KR certification 기반)
     * "ALL" | "12" | "15" | "19"
     * 조회 실패 시 "ALL" 기본값
     */
    rating?: string
}

/**
 * 인기 영화 목록 조회
 *
 * @param page - 페이지 번호 (기본값 1)
 * @returns TMDB 인기 영화 목록 (posterPath는 full URL)
 */
export async function getPopularMovies(page = 1): Promise<TmdbMovieItem[]> {
    const res = await fetch(`/api/tmdb/popular?page=${page}`)
    if (!res.ok) throw new Error(`인기 영화 조회 실패: ${res.status}`)
    return res.json()
}

/**
 * 영화 제목 검색
 *
 * @param title - 검색할 영화 제목
 * @returns 검색 결과 목록 (posterPath는 full URL)
 */
export async function searchTmdbMovies(title: string): Promise<TmdbMovieItem[]> {
    const res = await fetch(`/api/tmdb/search?title=${encodeURIComponent(title)}`)
    if (!res.ok) throw new Error(`영화 검색 실패: ${res.status}`)
    return res.json()
}

/**
 * 영화 상세 정보 조회 (폼 자동 입력용)
 *
 * 백엔드에서:
 * 1. TMDB에서 장르·감독·배우·런타임 등 상세 정보 조회
 * 2. 포스터 이미지를 서버 로컬에 자동 저장 (실패해도 500 아님)
 * 3. MovieDTO 형태로 반환 (posterPath = full image URL)
 *
 * @param tmdbId - TMDB 영화 고유 ID
 * @returns 폼 자동 입력에 사용할 영화 상세 정보
 */
export async function getTmdbMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
    const res = await fetch(`/api/tmdb/${tmdbId}`)
    if (!res.ok) throw new Error(`영화 상세 조회 실패: ${res.status}`)
    return res.json()
}
