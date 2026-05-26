import apiClient from './apiClient'

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

export async function getPopularMovies(page = 1): Promise<TmdbMovieItem[]> {
    const res = await apiClient.get<TmdbMovieItem[]>(`/tmdb/popular?page=${page}`)
    return res.data
}

export async function searchTmdbMovies(title: string): Promise<TmdbMovieItem[]> {
    const res = await apiClient.get<TmdbMovieItem[]>(`/tmdb/search?title=${encodeURIComponent(title)}`)
    return res.data
}

export async function getTmdbMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
    const res = await apiClient.get<TmdbMovieDetail>(`/tmdb/${tmdbId}`)
    return res.data
}
