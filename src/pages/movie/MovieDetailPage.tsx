/**
 * MovieDetailPage.tsx — 상영작 상세
 *
 * API 연동:
 *  - GET /api/movie/{id}                     → 영화 단일 조회
 *  - GET /api/admin/schedule/{movieId}/movie → 해당 영화 전체 스케줄 (오늘 것만 필터)
 *
 * 수정 이력:
 *  - axios 하드코딩 제거 → apiClient 사용
 *  - GET /api/movie/{id} 엔드포인트 백엔드 추가 대응
 *  - ScheduleDTO 필드 정합: id / no / startAt / endAt / activation
 *  - theaterName(no) 사용 ("X관")
 */
import {useNavigate, useParams} from 'react-router-dom'
import {CalendarDays, ChevronLeft, Clock, Film, Tag} from 'lucide-react'
import {useEffect, useState} from 'react'
import apiClient, {type MovieDTO, resolvePosterUrl} from '../../api/apiClient'

/** 관람등급 → 표시 텍스트·색상 */
const RATING_INFO: Record<string, { label: string; color: string }> = {
    ALL: {label: '전체관람가', color: '#4caf50'},
    '12': {label: '12세 이상', color: '#2a88c8'},
    '15': {label: '15세 이상', color: '#ffb800'},
    '19': {label: '청소년 관람불가', color: '#e03c3c'},
}

/** 런타임(분) → "2시간 46분" 형식 변환 */
function formatRuntime(minutes: number | undefined | null) {
    if (!minutes) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}` : `${m}분`
}

function MovieDetailPage() {
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()
    const today = new Date().toLocaleDateString('en-CA')

    const [movie, setMovie] = useState<MovieDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    /* ── 영화 단일 조회 ── */
    useEffect(() => {
        if (!id) return
        setLoading(true)

        /**
         * 백엔드 버그 우회 [팀원 수정 필요]:
         *   MovieController.java 112번 줄:
         *     @GetMapping("/{movieId}/readOne")
         *     public ResponseEntity<MovieDTO> getMovieById(@PathVariable Long id) { ... }
         *
         *   URL 경로 변수명은 {movieId} 인데 파라미터명은 id → Spring이 바인딩 못 해서 500 에러
         *   수정 방법: @PathVariable Long id → @PathVariable Long movieId (또는 @PathVariable("movieId") Long id)
         *
         *   [임시 우회]
         *   /movie/readAll 로 전체 목록을 받은 뒤 movieId 로 필터링
         *   백엔드가 수정되면 아래 코드를 다시 단일 조회로 교체할 것:
         *     apiClient.get<MovieDTO>(`/movie/${id}/readOne`)
         */
        apiClient.get<MovieDTO[]>('/movie/all')
            .then((res) => {
                const found = res.data.find((m) => m.movieId === Number(id))
                if (found) {
                    setMovie(found)
                } else {
                    console.error('[MovieDetailPage] 영화를 찾을 수 없음 id=', id)
                    setError(true)
                }
            })
            .catch((err) => {
                console.error('[MovieDetailPage] 영화 조회 실패', err)
                setError(true)
            })
            .finally(() => setLoading(false))
    }, [id])


    /* ── 로딩 / 에러 / 없음 ── */
    if (loading) {
        return (
            <div style={notFoundWrap}>
                <p style={{color: 'var(--text-secondary)', fontSize: 16}}>불러오는 중...</p>
            </div>
        )
    }

    if (error || !movie) {
        return (
            <div style={notFoundWrap}>
                <Film size={64} color="var(--text-muted)"/>
                <p style={{color: 'var(--text-secondary)', marginTop: 24, fontSize: 18}}>
                    영화 정보를 찾을 수 없습니다.
                </p>
                <button onClick={() => navigate('/movie/list')} style={btnPrimary}>
                    목록으로 돌아가기
                </button>
            </div>
        )
    }

    const rating = RATING_INFO[movie.rating] ?? RATING_INFO['ALL']

    /**
     * 영화 상태 판단
     *  - endAt 없음 → 현재 상영 중 (또는 개봉 후 종료 미처리)
     *  - startAt > today → 개봉 예정
     */
    const isUpcoming = movie.startAt > today
    const isEnded = movie.endAt != null && movie.endAt.slice(0, 10) < today

    /** 예매하기 클릭 → 상영 스케줄 선택 페이지로 이동 */
    const handleBook = () => {
        navigate('/booking/schedule', {
            state: {movieId: movie.movieId, movieTitle: movie.title},
        })
    }

    return (
        <div style={pageWrap}>

            {/* ── 뒤로 가기 ── */}
            <button onClick={() => navigate(-1)} style={backBtn}>
                <ChevronLeft size={20}/>
                목록으로
            </button>

            {/* ── 상단 카드: 포스터 + 정보 ── */}
            <div style={card}>

                {/* 포스터 */}
                <div style={posterWrap}>
                    <img
                        src={resolvePosterUrl(movie.posterPath)}
                        alt={`${movie.title} 포스터`}
                        style={posterImg}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-poster.jpg'
                        }}
                    />
                    <span style={{...ratingBadge, background: rating.color}}>{rating.label}</span>
                </div>

                {/* 텍스트 정보 */}
                <div style={info}>
                    <h1 style={titleStyle}>{movie.title}</h1>

                    <div style={tagRow}>
                        {movie.genre && (
                            <span style={tag}>
                <Tag size={12} style={{marginRight: 4}}/>
                                {movie.genre}
              </span>
                        )}
                        <span style={tag}>
              <Clock size={12} style={{marginRight: 4}}/>
                            {formatRuntime(movie.runtime)}
            </span>
                    </div>

                    <dl style={dl}>
                        {movie.director && <>
                            <dt style={dt}>감독</dt>
                            <dd style={dd}>{movie.director}</dd>
                        </>}
                        {movie.actors && <>
                            <dt style={dt}>출연</dt>
                            <dd style={dd}>{movie.actors}</dd>
                        </>}
                        <dt style={dt}>개봉</dt>
                        <dd style={dd}>{movie.startAt?.slice(0, 10)}</dd>
                        {movie.endAt && (
                            <>
                                <dt style={dt}>종영</dt>
                                <dd style={dd}>{movie.endAt.slice(0, 10)}</dd>
                            </>
                        )}
                    </dl>

                    {movie.description && (
                        <div style={synopsisBox}>
                            <p style={synopsisLabel}>줄거리</p>
                            <p style={synopsisText}>{movie.description}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 예매 버튼 / 배지 ── */}
            <div style={actionArea}>
                {isUpcoming ? (
                    <div style={upcomingBadge}>
                        <CalendarDays size={20}/>
                        <span>{movie.startAt?.slice(0, 10)} 개봉 예정</span>
                    </div>
                ) : isEnded ? (
                    <div style={upcomingBadge}>
                        <Film size={20}/>
                        <span>상영 종료</span>
                    </div>
                ) : (
                    <button onClick={handleBook} style={bookBtn}>
                        <Film size={22}/>
                        예매하기
                    </button>
                )}
            </div>

        </div>
    )
}

/* ─────────────────── 스타일 ─────────────────── */
const notFoundWrap: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 600, gap: 16,
}
const pageWrap: React.CSSProperties = {
    maxWidth: 960, margin: '0 auto', padding: '32px 40px 80px',
}
const backBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none',
    color: 'var(--text-secondary)', fontSize: 16,
    cursor: 'pointer', padding: '10px 0', marginBottom: 32,
}
const card: React.CSSProperties = {display: 'flex', gap: 48, flexWrap: 'wrap'}
const posterWrap: React.CSSProperties = {position: 'relative', flexShrink: 0, width: 300}
const posterImg: React.CSSProperties = {
    width: '100%', borderRadius: 16, display: 'block',
    objectFit: 'cover', aspectRatio: '2/3',
}
const ratingBadge: React.CSSProperties = {
    position: 'absolute', top: 14, left: 14,
    padding: '5px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 700, color: '#fff',
}
const info: React.CSSProperties = {flex: 1, minWidth: 320}
const titleStyle: React.CSSProperties = {
    fontSize: 30, fontWeight: 800, color: 'var(--text-primary)',
    marginBottom: 16, lineHeight: 1.3,
}
const tagRow: React.CSSProperties = {display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24}
const tag: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    padding: '6px 14px', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: 20,
    fontSize: 14, color: 'var(--text-secondary)',
}
const dl: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '56px 1fr',
    gap: '10px 16px', marginBottom: 24,
}
const dt: React.CSSProperties = {color: 'var(--text-muted)', fontSize: 14, fontWeight: 600}
const dd: React.CSSProperties = {color: 'var(--text-secondary)', fontSize: 14, margin: 0}
const synopsisBox: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 24,
}
const synopsisLabel: React.CSSProperties = {
    fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
    marginBottom: 10, letterSpacing: 1,
}
const synopsisText: React.CSSProperties = {
    fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.9, margin: 0,
}
const actionArea: React.CSSProperties = {
    padding: '40px 0 32px',
    borderTop: '1px solid var(--border-subtle)',
    marginTop: 40, marginBottom: 40,
}
const bookBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 12, width: '100%', padding: '28px 0',
    background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 16,
    fontSize: 24, fontWeight: 800, cursor: 'pointer', letterSpacing: 1,
}
const upcomingBadge: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '24px 0',
    background: 'var(--bg-surface)', borderRadius: 16,
    color: 'var(--text-secondary)', fontSize: 18, fontWeight: 600,
}
const btnPrimary: React.CSSProperties = {
    marginTop: 24, padding: '16px 32px',
    background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
}

export default MovieDetailPage
