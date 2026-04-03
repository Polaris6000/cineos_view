/**
 * MovieListAdminPage.tsx — 관리자 영화 목록
 *
 * 변경사항:
 *  - 삭제 시 목록에서 즉시 제거되지 않고 '삭제예정' 상태로 변경
 *  - 개봉일(startAt) / 종영일(endAt) 컬럼 추가
 *  - 상영종료 영화는 기본 뷰에서 숨김 → "전체 로그" 토글로 볼 수 있음
 *  - 상태 배지: 상영중 / 상영예정 / 상영종료 / 삭제예정
 *
 * TODO: GET /api/admin/movies 연동
 * TODO: DELETE /api/admin/movies/:id (→ 서버에서도 deletePending 처리)
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_MOVIES } from '../../../api/mockData'

/* ── 타입 ──────────────────────────────────────────── */
type MovieStatus = 'NOW_PLAYING' | 'UPCOMING' | 'ENDED' | 'DELETE_PENDING'

/* ── 등급 배지 색상 ────────────────────────────────── */
const RATING_COLOR: Record<string, string> = {
  ALL: 'var(--badge-all)',
  '12': 'var(--color-info-main)',
  '15': 'var(--color-brand-default)',
  '19': 'var(--color-error-main)',
}

/* ── 오늘 날짜 (비교용) ────────────────────────────── */
const TODAY = new Date().toISOString().slice(0, 10)

/**
 * 영화의 현재 상태를 계산하는 헬퍼
 * pendingDeletes: 삭제예정으로 표시된 영화 id Set
 */
function getMovieStatus(movie: typeof MOCK_MOVIES[0], pendingDeletes: Set<number>): MovieStatus {
  if (pendingDeletes.has(movie.id)) return 'DELETE_PENDING'
  if (movie.endAt && movie.endAt < TODAY) return 'ENDED'
  if (movie.endAt) return 'NOW_PLAYING'
  return 'UPCOMING'
}

/** 상태별 배지 스타일 */
function StatusBadge({ status }: { status: MovieStatus }) {
  const styles: Record<MovieStatus, React.CSSProperties> = {
    NOW_PLAYING:    { background: 'var(--color-success-bg)',   color: 'var(--color-success-main)' },
    UPCOMING:       { background: 'var(--primitive-brand-50)', color: 'var(--primitive-brand-700)' },
    ENDED:          { background: 'var(--bg-base)',            color: 'var(--text-muted)' },
    DELETE_PENDING: { background: 'var(--color-warning-bg)',   color: 'var(--color-warning-text)' },
  }
  const labels: Record<MovieStatus, string> = {
    NOW_PLAYING:    '상영 중',
    UPCOMING:       '상영 예정',
    ENDED:          '상영 종료',
    DELETE_PENDING: '삭제 예정',
  }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...styles[status] }}>
      {labels[status]}
    </span>
  )
}

function MovieListAdminPage() {
  const navigate = useNavigate()

  // 로컬 상태: 삭제예정으로 표시된 영화 id 집합
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set())

  // 검색어
  const [search, setSearch] = useState('')

  // 전체 로그 모드: true이면 상영종료·삭제예정 포함, false면 활성 영화만 표시
  const [showLog, setShowLog] = useState(false)

  /**
   * 필터링 로직
   * - 기본 뷰: 상영중 + 상영예정만 (종료/삭제예정 숨김)
   * - 전체 로그: 모든 영화 포함
   * - 검색어: 제목 or 장르 포함
   */
  const filtered = useMemo(() => {
    return MOCK_MOVIES.filter((m) => {
      const status = getMovieStatus(m, pendingDeletes)
      const matchesSearch = m.title.includes(search) || m.genre.includes(search)

      // 전체 로그 모드가 아니면 종료/삭제예정 영화 숨김
      if (!showLog && (status === 'ENDED' || status === 'DELETE_PENDING')) return false

      return matchesSearch
    })
  }, [search, showLog, pendingDeletes])

  /**
   * 삭제 처리 — 즉시 목록에서 제거하지 않고 '삭제예정' 상태로 변경
   * 실제 반영은 익일 00:00, 잔여 예매는 자동 환불됨
   */
  const handleDelete = (movie: typeof MOCK_MOVIES[0]) => {
    const status = getMovieStatus(movie, pendingDeletes)

    // 이미 삭제예정인 경우 → 취소 가능
    if (status === 'DELETE_PENDING') {
      const ok = window.confirm(`"${movie.title}" 삭제 예정을 취소하시겠습니까?`)
      if (ok) {
        setPendingDeletes((prev) => {
          const next = new Set(prev)
          next.delete(movie.id)
          return next
        })
      }
      return
    }

    const ok = window.confirm(
      `"${movie.title}" 을 삭제 예정으로 변경하시겠습니까?\n\n` +
      `⚠️ 삭제는 익일 00:00 부터 반영됩니다.\n` +
      `잔여 예매는 자동으로 환불 처리됩니다.\n\n계속 진행하시겠습니까?`
    )
    if (ok) {
      // 목록에서 즉시 제거하지 않고 삭제예정 Set에 추가
      setPendingDeletes((prev) => new Set(prev).add(movie.id))
      // TODO: DELETE /api/admin/movies/:id
    }
  }

  // 카운터: 상태별 영화 수 (상단 요약용)
  const counts = useMemo(() => {
    const result = { NOW_PLAYING: 0, UPCOMING: 0, ENDED: 0, DELETE_PENDING: 0 }
    MOCK_MOVIES.forEach((m) => {
      result[getMovieStatus(m, pendingDeletes)]++
    })
    return result
  }, [pendingDeletes])

  return (
    <div>
      {/* 헤더 */}
      <div style={headerRow}>
        <h2 style={pageTitle}>영화 목록</h2>
        <button onClick={() => navigate('/admin/management/movie/form')} style={addBtn}>
          + 영화 등록
        </button>
      </div>

      {/* 상태별 요약 카운터 */}
      <div style={countRow}>
        <span style={countChip}>상영 중 {counts.NOW_PLAYING}편</span>
        <span style={countChip}>상영 예정 {counts.UPCOMING}편</span>
        {counts.DELETE_PENDING > 0 && (
          <span style={{ ...countChip, color: 'var(--color-warning-text)', background: 'var(--color-warning-bg)' }}>
            삭제 예정 {counts.DELETE_PENDING}편
          </span>
        )}
        {counts.ENDED > 0 && (
          <span style={{ ...countChip, color: 'var(--text-muted)' }}>
            상영 종료 {counts.ENDED}편
          </span>
        )}
      </div>

      {/* 검색 + 전체 로그 토글 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 또는 장르 검색"
          style={{ ...searchInput, flex: 1, marginBottom: 0 }}
        />
        {/* 전체 로그 토글 — 상영종료/삭제예정 영화 포함 여부 */}
        <button
          onClick={() => setShowLog((v) => !v)}
          style={{
            ...logBtn,
            background: showLog ? 'var(--color-brand-default)' : 'var(--bg-surface)',
            color:      showLog ? 'var(--btn-primary-text)'     : 'var(--text-secondary)',
            border:     showLog ? 'none' : '1px solid var(--border-default)',
          }}
        >
          {showLog ? '전체 로그 ON' : '전체 로그 OFF'}
        </button>
      </div>

      {/* 영화 목록 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>ID</th>
              <th style={th}>제목</th>
              <th style={th}>장르</th>
              <th style={th}>등급</th>
              {/* 관리자가 개봉일·종영일을 바로 확인할 수 있도록 컬럼 추가 */}
              <th style={th}>개봉일</th>
              <th style={th}>종영일</th>
              <th style={th}>상태</th>
              <th style={th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={noData}>검색 결과 없음</td></tr>
            ) : (
              filtered.map((m) => {
                const status = getMovieStatus(m, pendingDeletes)
                // 상영종료·삭제예정 행은 흐리게 처리
                const rowOpacity = (status === 'ENDED' || status === 'DELETE_PENDING') ? 0.6 : 1
                return (
                  <tr key={m.id} style={{ ...tr, opacity: rowOpacity }}>
                    <td style={td}>{m.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{m.title}</td>
                    <td style={td}>{m.genre}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        color: 'var(--bg-surface)',
                        background: RATING_COLOR[m.rating] ?? 'var(--text-secondary)',
                      }}>
                        {m.rating === 'ALL' ? '전체' : `${m.rating}세`}
                      </span>
                    </td>
                    {/* 개봉일 */}
                    <td style={{ ...td, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {m.startAt ?? '-'}
                    </td>
                    {/* 종영일: 삭제예정이면 "삭제 예정" 문구 병기 */}
                    <td style={{ ...td, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {m.endAt
                        ? (
                          <>
                            {m.endAt}
                            {status === 'DELETE_PENDING' && (
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-warning-text)', marginTop: 2 }}>
                                ※ 익일 삭제 처리 예정
                              </span>
                            )}
                          </>
                        )
                        : <span style={{ color: 'var(--text-muted)' }}>미정</span>
                      }
                    </td>
                    {/* 상태 */}
                    <td style={td}>
                      <StatusBadge status={status} />
                    </td>
                    {/* 관리 버튼 */}
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* 상영종료 영화는 수정 불가 */}
                        {status !== 'ENDED' && (
                          <button
                            onClick={() => navigate('/admin/management/movie/form', { state: { movie: m } })}
                            style={editBtn}
                          >수정</button>
                        )}
                        {/* 삭제예정이면 버튼 텍스트를 "취소"로 바꿔서 되돌릴 수 있게 함 */}
                        {status !== 'ENDED' && (
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

/* ── 스타일 ──────────────────────────────────────── */
const headerRow      = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const pageTitle      = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }
const addBtn         = { padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                         border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const countRow       = { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' as const }
const countChip      = { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                         background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                         border: '1px solid var(--border-subtle)' }
const searchInput    = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8,
                         fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
                         boxSizing: 'border-box' as const, outline: 'none' }
const logBtn         = { padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                         cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }
const tableWrap      = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'auto',
                         boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table          = { width: '100%', borderCollapse: 'collapse' as const, minWidth: 800 }
const thead          = { background: 'var(--bg-base)' }
const th             = { padding: '12px 16px', textAlign: 'left' as const, fontSize: 13,
                         fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
                         whiteSpace: 'nowrap' as const }
const tr             = { borderBottom: '1px solid var(--border-subtle)', transition: 'opacity 0.2s' }
const td             = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }
const noData         = { padding: 24, textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: 14 }
const editBtn        = { padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                         border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }
const deleteBtn      = { padding: '6px 14px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)',
                         border: '1px solid var(--color-error-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }
const cancelDeleteBtn= { padding: '6px 14px', background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)',
                         border: '1px solid var(--color-warning-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }

export default MovieListAdminPage
