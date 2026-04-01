/**
 * MovieListAdminPage.jsx — 관리자 영화 목록
 *
 * 영화 전체 목록 표시, 등록/수정/삭제 이동 버튼
 * UC-18(등록), UC-19(수정), UC-20(삭제) 진입점
 * TODO: GET /api/admin/movies 연동
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_MOVIES } from '../../../api/mockData'

const RATING_COLOR = {
  ALL: 'var(--badge-all)',
  '12': 'var(--color-info-main)',
  '15': 'var(--color-brand-default)',
  '19': 'var(--color-error-main)',
}

function MovieListAdminPage() {
  const navigate = useNavigate()
  // 로컬 삭제 시뮬레이션 (실제는 DELETE /api/admin/movies/:id)
  const [movies, setMovies] = useState([...MOCK_MOVIES])
  const [search, setSearch] = useState('')

  const filtered = movies.filter((m) =>
    m.title.includes(search) || m.genre.includes(search)
  )

  /** UC-20: 삭제 — 익일 00시 반영 + 잔여 예매 자동 환불 확인 */
  const handleDelete = (movie) => {
    const ok = window.confirm(
      `"${movie.title}" 을 삭제하시겠습니까?\n\n` +
      `⚠️ 삭제는 익일 00:00 부터 반영됩니다.\n` +
      `잔여 예매는 자동으로 환불 처리됩니다.\n\n계속 진행하시겠습니까?`
    )
    if (ok) {
      setMovies((prev) => prev.filter((m) => m.id !== movie.id))
      // TODO: DELETE /api/admin/movies/:id
    }
  }

  return (
    <div>
      <div style={headerRow}>
        <h2 style={pageTitle}>영화 목록</h2>
        {/* UC-18: 영화 등록 */}
        <button onClick={() => navigate('/admin/management/movie/form')} style={addBtn}>
          + 영화 등록
        </button>
      </div>

      {/* 검색 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="제목 또는 장르 검색"
        style={searchInput}
      />

      {/* 영화 목록 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>ID</th>
              <th style={th}>제목</th>
              <th style={th}>장르</th>
              <th style={th}>등급</th>
              <th style={th}>상태</th>
              <th style={th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={noData}>검색 결과 없음</td></tr>
            ) : (
              filtered.map((m) => {
                const isNowPlaying = m.endAt !== null
                return (
                  <tr key={m.id} style={tr}>
                    <td style={td}>{m.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{m.title}</td>
                    <td style={td}>{m.genre}</td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                                     fontWeight: 700, color: 'var(--bg-surface)',
                                     background: RATING_COLOR[m.rating] ?? 'var(--text-secondary)' }}>
                        {m.rating === 'ALL' ? '전체' : `${m.rating}세`}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: isNowPlaying ? 'var(--color-success-bg)' : 'var(--primitive-brand-50)',
                        color: isNowPlaying ? 'var(--color-success-main)' : 'var(--primitive-brand-700)',
                      }}>
                        {isNowPlaying ? '상영 중' : '상영 예정'}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* UC-19: 수정 */}
                        <button
                          onClick={() => navigate('/admin/management/movie/form', { state: { movie: m } })}
                          style={editBtn}
                        >수정</button>
                        {/* UC-20: 삭제 */}
                        <button
                          onClick={() => handleDelete(m)}
                          style={deleteBtn}
                        >삭제</button>
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

const headerRow   = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const pageTitle   = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }
const addBtn      = { padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const searchInput = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8,
                      fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', marginBottom: 16,
                      boxSizing: 'border-box', outline: 'none' }
const tableWrap   = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table       = { width: '100%', borderCollapse: 'collapse', minWidth: 700 }
const thead       = { background: 'var(--bg-base)' }
const th          = { padding: '12px 16px', textAlign: 'left', fontSize: 13,
                      fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
                      whiteSpace: 'nowrap' }
const tr          = { borderBottom: '1px solid var(--border-subtle)' }
const td          = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }
const noData      = { padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }
const editBtn     = { padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                      border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }
const deleteBtn   = { padding: '6px 14px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)',
                      border: '1px solid var(--color-error-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }

export default MovieListAdminPage
