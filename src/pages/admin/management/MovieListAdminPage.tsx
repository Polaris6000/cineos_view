/**
 * MovieListAdminPage.tsx — 관리자 영화 목록
 *
 * API 연동:
 *  - GET  /api/movie/readAll       → 전체 영화 목록
 *  - DELETE /api/movie/remove?movieId={id} → 영화 삭제 (TODO: 낙관적 처리)
 */
import {useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import apiClient, {type MovieDTO, resolvePosterUrl} from '../../../api/apiClient'
import { useAuth } from '../../../context/AuthContext'

/* ── 타입 ──────────────────────────────────────────── */
type MovieStatus = 'NOW_PLAYING' | 'UPCOMING' | 'ENDED' | 'DELETE_PENDING'

/** MovieDTO를 페이지 내부에서 쓰기 편한 형태로 변환 */
interface AdminMovie {
    id: number
    title: string
    genre: string
    rating: string
    director: string
    cast: string   // MovieDTO.actors
    runtime: number
    synopsis: string   // MovieDTO.description
    startAt: string   // 'YYYY-MM-DD'
    endAt: string | null
    posterUrl: string
    movieId: number   // MovieFormPage isEdit 판단용
}

function toAdminMovie(dto: MovieDTO): AdminMovie {
    return {
        id: dto.movieId,
        movieId: dto.movieId,
        title: dto.title,
        genre: dto.genre ?? '',
        rating: dto.rating,
        director: dto.director ?? '',
        cast: dto.actors ?? '',
        runtime: dto.runtime,
        synopsis: dto.description ?? '',
        startAt: dto.startAt?.slice(0, 10) ?? '',
        endAt: dto.endAt ? dto.endAt.slice(0, 10) : null,
        posterUrl: resolvePosterUrl(dto.posterPath),
    }
}

/* ── 등급 배지 색상 ────────────────────────────────── */
const RATING_COLOR: Record<string, string> = {
    ALL: 'var(--badge-all)',
    '12': 'var(--color-info-main)',
    '15': 'var(--color-brand-default)',
    '19': 'var(--color-error-main)',
}

const TODAY = new Date().toLocaleDateString('en-CA')

/** 영화 상태 계산 */
function getMovieStatus(movie: AdminMovie, pendingDeletes: Set<number>): MovieStatus {
    if (pendingDeletes.has(movie.id)) return 'DELETE_PENDING'
    if (movie.startAt > TODAY) return 'UPCOMING'
    if (movie.endAt && movie.endAt < TODAY) return 'ENDED'
    return 'NOW_PLAYING'
}

function StatusBadge({status}: { status: MovieStatus }) {
    const styles: Record<MovieStatus, React.CSSProperties> = {
        NOW_PLAYING: {background: 'var(--color-success-bg)', color: 'var(--color-success-main)'},
        UPCOMING: {background: 'var(--primitive-brand-50)', color: 'var(--primitive-brand-700)'},
        ENDED: {background: 'var(--bg-base)', color: 'var(--text-muted)'},
        DELETE_PENDING: {background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)'},
    }
    const labels: Record<MovieStatus, string> = {
        NOW_PLAYING: '상영 중',
        UPCOMING: '상영 예정',
        ENDED: '상영 종료',
        DELETE_PENDING: '삭제 예정',
    }
    return (
        <span className="badge"
              style={{padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...styles[status]}}>
      {labels[status]}
    </span>
    )
}

function MovieListAdminPage() {
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    // 버튼 표시 여부
    // canRegister: 영화 등록 버튼 (ROLE_MOVIE_REGISTER)
    // canEdit: 영화 목록의 수정·삭제 버튼 (ROLE_MOVIE_EDIT = 영화 편집 권한)
    const canRegister = hasPermission('ROLE_MOVIE_REGISTER')
    const canEdit     = hasPermission('ROLE_MOVIE_EDIT')

    const [movies, setMovies] = useState<AdminMovie[]>([])
    const [loading, setLoading] = useState(true)
    const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set())
    const [search, setSearch] = useState('')
    const [showLog, setShowLog] = useState(false)

    /** GET /api/admin/movie/readAll — 관리자 전체 영화 목록
     * ⚠️ 백엔드 수정 필요:
     *   MovieController @GetMapping 이 "/admin/admin/readAll" 로 잘못 선언돼 있음
     *   → @GetMapping("/readAll") 로 수정해야 이 URL이 정상 동작함 */
    useEffect(() => {
        apiClient.get<MovieDTO[]>('/admin/movie/readAll')
            .then((res) => setMovies(res.data.map(toAdminMovie)))
            .catch((err) => console.error('[MovieListAdminPage] 영화 목록 로드 실패', err))
            .finally(() => setLoading(false))
    }, [])

    /** 필터링 + 정렬 */
    const filtered = useMemo(() => {
        return movies
            .filter((m) => {
                const status = getMovieStatus(m, pendingDeletes)
                if (!showLog && (status === 'ENDED' || status === 'DELETE_PENDING')) return false
                return m.title.includes(search) || m.genre.includes(search)
            })
            .sort((a, b) => {
                // 1차 정렬: 개봉일 내림차순 (미래 개봉일일수록 상단)
                const startDiff = b.startAt.localeCompare(a.startAt)
                if (startDiff !== 0) return startDiff

                // 2차 정렬: 종영일 오름차순 (종영일 가까운 순)
                // endAt이 null(미정)인 경우 매우 먼 미래로 취급하여 후순위 배치
                const aEnd = a.endAt ?? '9999-12-31'
                const bEnd = b.endAt ?? '9999-12-31'
                return aEnd.localeCompare(bEnd)
            })
    }, [movies, search, showLog, pendingDeletes])

    /** 상태별 카운터 */
    const counts = useMemo(() => {
        const result = {NOW_PLAYING: 0, UPCOMING: 0, ENDED: 0, DELETE_PENDING: 0}
        movies.forEach((m) => {
            result[getMovieStatus(m, pendingDeletes)]++
        })
        return result
    }, [movies, pendingDeletes])

    /** 삭제 처리 — 낙관적으로 DELETE_PENDING 표시, API 호출 */
    const handleDelete = (movie: AdminMovie) => {
        const status = getMovieStatus(movie, pendingDeletes)

        if (status === 'DELETE_PENDING') {
            if (window.confirm(`"${movie.title}" 삭제 예정을 취소하시겠습니까?`)) {
                setPendingDeletes((prev) => {
                    const n = new Set(prev);
                    n.delete(movie.id);
                    return n
                })
            }
            return
        }

        const ok = window.confirm(
            `"${movie.title}" 을 삭제하시겠습니까?\n\n⚠️ 삭제 후 복구할 수 없습니다.`
        )
        if (!ok) return

        // 낙관적 UI — 즉시 삭제예정 표시
        setPendingDeletes((prev) => new Set(prev).add(movie.id))

        // DELETE /api/movie/remove?movieId={id}
        apiClient.delete('/admin/movie/remove', {params: {movieId: movie.id}})
            .then(() => {
                // 성공 시 목록에서 제거
                setMovies((prev) => prev.filter((m) => m.id !== movie.id))
                setPendingDeletes((prev) => {
                    const n = new Set(prev);
                    n.delete(movie.id);
                    return n
                })
            })
            .catch((err) => {
                console.error('[MovieListAdminPage] 삭제 실패', err)
                // 롤백
                setPendingDeletes((prev) => {
                    const n = new Set(prev);
                    n.delete(movie.id);
                    return n
                })
                alert('삭제에 실패했습니다.')
            })
    }

    return (
        <div>
            <div style={headerRow}>
                <h2 style={pageTitle}>영화 목록</h2>
                {/* ROLE_MOVIE_REGISTER 없으면 등록 버튼 숨김 */}
                {canRegister && (
                    <button onClick={() => navigate('/admin/management/movie/form')} style={addBtn}>
                        + 영화 등록
                    </button>
                )}
            </div>

            {/* 상태 요약 */}
            <div style={countRow}>
                <span style={countChip}>상영 중 {counts.NOW_PLAYING}편</span>
                <span style={countChip}>상영 예정 {counts.UPCOMING}편</span>
                {counts.DELETE_PENDING > 0 && (
                    <span style={{
                        ...countChip,
                        color: 'var(--color-warning-text)',
                        background: 'var(--color-warning-bg)'
                    }}>
            삭제 예정 {counts.DELETE_PENDING}편
          </span>
                )}
                {counts.ENDED > 0 && (
                    <span style={{...countChip, color: 'var(--text-muted)'}}>
            상영 종료 {counts.ENDED}편
          </span>
                )}
            </div>

            {/* 검색 + 전체 로그 토글 */}
            <div style={{display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center'}}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="제목 또는 장르 검색"
                    style={{...searchInput, flex: 1, marginBottom: 0}}
                />
                <button
                    onClick={() => setShowLog((v) => !v)}
                    style={{
                        ...logBtn,
                        background: showLog ? 'var(--color-brand-default)' : 'var(--bg-surface)',
                        color: showLog ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                        border: showLog ? 'none' : '1px solid var(--border-default)',
                    }}
                >
                    {showLog ? '전체 로그 ON' : '전체 로그 OFF'}
                </button>
            </div>

            {/* 테이블 */}
            <div style={tableWrap}>
                <table style={table}>
                    <thead>
                    <tr style={thead}>
                        <th style={th}>제목</th>
                        <th style={th}>장르</th>
                        <th style={th}>등급</th>
                        <th style={th}>개봉일</th>
                        <th style={th}>종영일</th>
                        <th style={th}>상태</th>
                        <th style={th}>관리</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={7} style={noData}>불러오는 중...</td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <td colSpan={7} style={noData}>검색 결과 없음</td>
                        </tr>
                    ) : (
                        filtered.map((m) => {
                            const status = getMovieStatus(m, pendingDeletes)
                            const rowOpacity = (status === 'ENDED' || status === 'DELETE_PENDING') ? 0.6 : 1
                            return (
                                <tr key={m.id} style={{...tr, opacity: rowOpacity}}>
                                    <td style={{...td, fontWeight: 600}}>{m.title}</td>
                                    <td style={td}>{m.genre || '-'}</td>
                                    <td style={td}>
                      <span className="badge" style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          color: 'var(--bg-surface)',
                          background: RATING_COLOR[m.rating] ?? 'var(--text-secondary)',
                      }}>
                        {m.rating === 'ALL' ? '전체' : `${m.rating}세`}
                      </span>
                                    </td>
                                    <td style={{...td, fontSize: 13, color: 'var(--text-secondary)'}}>
                                        {m.startAt || '-'}
                                    </td>
                                    <td style={{...td, fontSize: 13, color: 'var(--text-secondary)'}}>
                                        {m.endAt ?? <span style={{color: 'var(--text-muted)'}}>미정</span>}
                                    </td>
                                    <td style={td}><StatusBadge status={status}/></td>
                                    <td style={td}>
                                        <div style={{display: 'flex', gap: 6}}>
                                            {/* ROLE_MOVIE_EDIT 없으면 수정 버튼 숨김 */}
                                            {canEdit && status !== 'ENDED' && (
                                                <button
                                                    onClick={() => navigate('/admin/management/movie/form', {state: {movie: m}})}
                                                    style={editBtn}
                                                >수정</button>
                                            )}
                                            {/* ROLE_MOVIE_EDIT 없으면 삭제 버튼 숨김 (등록·수정·삭제 권한 통합) */}
                                            {canEdit && status !== 'ENDED' && (
                                                <button
                                                    onClick={() => handleDelete(m)}
                                                    style={status === 'DELETE_PENDING' ? cancelDeleteBtn : deleteBtn}
                                                >
                                                    {status === 'DELETE_PENDING' ? '취소' : '삭제'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ── 스타일 ── */
const headerRow = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}
const pageTitle = {fontSize: 22, fontWeight: 800, color: 'var(--text-primary)'}
const addBtn = {
    padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer'
}
const countRow = {display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' as const}
const countChip = {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: 'var(--bg-surface)', color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)'
}
const searchInput = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
    boxSizing: 'border-box' as const, outline: 'none'
}
const logBtn = {
    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0
}
const tableWrap = {
    background: 'var(--bg-surface)', borderRadius: 12, overflow: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
}
const table = {width: '100%', borderCollapse: 'collapse' as const, minWidth: 800}
const thead = {background: 'var(--bg-base)'}
const th = {
    padding: '12px 16px', textAlign: 'left' as const, fontSize: 13,
    fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
    whiteSpace: 'nowrap' as const
}
const tr = {borderBottom: '1px solid var(--border-subtle)', transition: 'opacity 0.2s'}
const td = {padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)'}
const noData = {padding: 24, textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: 14}
const editBtn = {
    padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
    border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer'
}
const deleteBtn = {
    padding: '6px 14px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)',
    border: '1px solid var(--color-error-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer'
}
const cancelDeleteBtn = {
    padding: '6px 14px', background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)',
    border: '1px solid var(--color-warning-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer'
}

export default MovieListAdminPage
