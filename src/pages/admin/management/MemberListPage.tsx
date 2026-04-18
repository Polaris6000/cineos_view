/**
 * MemberListPage.tsx — 회원 정보 조회 및 관리 (SUPER_ADMIN 전용)
 *
 * API 연동:
 *   GET /api/admin/member/list?page={n}       → Page<MemberDTO>
 *   GET /api/admin/member/{phone}/point-list  → List<PointHistoryDTO>
 *   GET /api/admin/member/point-list?page={n} → Page<PointHistoryDTO>
 *
 * 수정 이력:
 *   - 회원 목록 페이지네이션 추가 (Page<MemberDTO> 응답 구조 대응)
 *   - 전체 활동 로그: page 파라미터 추가 + res.data.content 처리
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import apiClient from '../../../api/apiClient.ts'

/* ── 타입 ──────────────────────────────────────────── */
interface Member {
  phone: string
  point: number
  createAt: string
}

interface PointHistory {
  pointId: number
  title: string
  createAt: string
  type: 'EARN' | 'REFUND_EARN' | 'REFUND_USE' | 'USE'
  amountPoint: number
  paymentId: string
  phone: string
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
function MemberListPage() {
  const navigate = useNavigate()

  const [members,     setMembers]     = useState<Member[]>([])
  const [keyword,     setKeyword]     = useState('')
  const [loading,     setLoading]     = useState(false)

  // 페이지네이션 상태
  // currentPage: 현재 페이지 (1-based, 백엔드 파라미터와 동일)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // 개별 회원 포인트 내역 모달 상태
  const [pointMember, setPointMember] = useState<Member | null>(null)

  /**
   * 회원 목록 조회
   * 백엔드 응답: Page<MemberDTO>
   *   { content: MemberDTO[], totalElements, totalPages, number (0-based) }
   *
   * currentPage 변경 시마다 재요청
   */
  useEffect(() => {
    setLoading(true)
    apiClient.get('/admin/member/list', { params: { page: currentPage } })
      .then(res => {
        // Page<MemberDTO> 구조 대응
        const data = res.data
        const list: Member[] = data.content ?? data  // content 없으면 배열 직접 사용
        setMembers(list)
        setTotalPages(data.totalPages ?? 1)
        setTotalElements(data.totalElements ?? list.length)
      })
      .catch(err => console.error('[MemberListPage] 회원 목록 로드 실패', err))
      .finally(() => setLoading(false))
  }, [currentPage]) // currentPage 바뀔 때마다 재조회

  /**
   * 클라이언트 키워드 필터링 (현재 페이지 내 전화번호 검색)
   * 백엔드 검색 API 없으므로 클라이언트 필터링 유지
   */
  const filtered = keyword.trim()
    ? members.filter(m => m.phone.includes(keyword.trim()))
    : members

  return (
    <div style={wrap}>
      {/* 페이지 헤더 */}
      <div style={pageHeader}>
        <div>
          <h2 style={pageTitle}>회원 정보 관리</h2>
          <p style={pageDesc}>
            전체 {totalElements}명 · 현재 페이지 {filtered.length}명 표시
          </p>
        </div>
        {/* 클릭 시 ActivityLogPage로 이동 (모달 → 별도 페이지로 변경) */}
        <button style={logBtn} onClick={() => navigate('/admin/management/members/activity-log')}>
          <Activity size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          전체 활동 로그
        </button>
      </div>

      {/* 검색 인풋 */}
      <div style={searchWrap}>
        <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          style={searchInput}
          type="text"
          placeholder="전화번호로 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 회원 목록 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={tHead}>
              <th style={th}>전화번호</th>
              <th style={{ ...th, textAlign: 'right' }}>포인트</th>
              <th style={{ ...th, textAlign: 'center' }}>가입일</th>
              <th style={{ ...th, textAlign: 'center' }}>포인트 내역</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr key="loading">
                <td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                  불러오는 중...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr key="empty">
                <td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {keyword ? '검색 결과가 없습니다.' : '회원 정보가 없습니다.'}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={`member-${m.phone}`} style={tRow}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 13 }}>{m.phone}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: 'var(--color-brand-default)' }}>
                    {m.point.toLocaleString()} P
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    {m.createAt?.slice(0, 10) ?? '-'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button style={pointBtn} onClick={() => setPointMember(m)}>
                      <Star size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      내역
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div style={pagination}>
          {/* 이전 버튼 */}
          <button
            style={{ ...pageBtn, opacity: currentPage <= 1 ? 0.4 : 1 }}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft size={14} />
          </button>

          {/* 페이지 번호 버튼 (최대 5개) */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - currentPage) <= 2) // 현재 페이지 기준 ±2
            .map(p => (
              <button
                key={p}
                style={{
                  ...pageBtn,
                  background: p === currentPage ? 'var(--color-brand-default)' : 'var(--bg-surface)',
                  color:      p === currentPage ? 'var(--primitive-neutral-900)' : 'var(--text-secondary)',
                  fontWeight: p === currentPage ? 700 : 400,
                }}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))
          }

          {/* 다음 버튼 */}
          <button
            style={{ ...pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* 개별 회원 포인트 내역 모달 */}
      {pointMember && (
        <PointHistoryModal
          member={pointMember}
          onClose={() => setPointMember(null)}
        />
      )}
    </div>
  )
}

/* ── 포인트 내역 모달 ────────────────────────────────── */
function PointHistoryModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [pointLog, setPointLog] = useState<PointHistory[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    setLoading(true)
    // GET /api/admin/member/{phone}/point-list → List<PointHistoryDTO> (페이징 없음)
    apiClient.get(`/admin/member/${member.phone}/point-list`)
      .then(res => setPointLog(res.data))
      .catch(err => console.error('[PointHistoryModal] 포인트 내역 로드 실패', err))
      .finally(() => setLoading(false))
  }, [member.phone])

  const typeStyle: Record<PointHistory['type'], { color: string; label: string; sign: string }> = {
    EARN:        { color: 'var(--color-success-main)',  label: '적립',      sign: '+' },
    USE:         { color: 'var(--color-brand-default)', label: '사용',      sign: '-' },
    REFUND_EARN: { color: 'var(--color-error-main)',    label: '적립 취소', sign: '-' },
    REFUND_USE:  { color: 'var(--color-error-main)',    label: '사용 취소', sign: '+' },
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={modalTitle}>{member.phone} 포인트 내역</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              전체 {pointLog.length}건 · 잔여 {member.point.toLocaleString()}P
            </p>
          </div>
          <button style={closeIconBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>불러오는 중...</p>
        ) : pointLog.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            포인트 내역이 없습니다.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pointLog.map(log => {
              const ts = typeStyle[log.type]
              return (
                <div key={log.pointId} style={logRow}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {log.title || log.paymentId}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      {log.createAt?.slice(0, 16) ?? '-'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ts.color, margin: '0 0 2px' }}>
                      <span className="badge" style={{
                        fontSize: 10, marginRight: 4, padding: '1px 5px', borderRadius: 4,
                        background: 'var(--bg-base)', color: ts.color, border: `1px solid ${ts.color}`,
                      }}>
                        {ts.label}
                      </span>
                      {ts.sign}{Math.abs(log.amountPoint).toLocaleString()}P
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button style={closeModalBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

/* ── 스타일 ──────────────────────────────────────── */
const wrap: React.CSSProperties        = { padding: 32, maxWidth: 1100 }
const pageHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }
const pageTitle: React.CSSProperties  = { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }
const pageDesc: React.CSSProperties   = { fontSize: 13, color: 'var(--text-muted)', margin: 0 }
const logBtn: React.CSSProperties     = {
  padding: '8px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
}
const searchWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', marginBottom: 16,
  background: 'var(--input-bg)', border: '1px solid var(--border-default)',
  borderRadius: 8, maxWidth: 480,
}
const searchInput: React.CSSProperties = {
  flex: 1, border: 'none', background: 'transparent',
  fontSize: 14, color: 'var(--text-primary)', outline: 'none',
}
const tableWrap: React.CSSProperties   = { overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }
const table: React.CSSProperties       = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const tHead: React.CSSProperties       = { background: 'var(--bg-surface)' }
const th: React.CSSProperties          = {
  padding: '12px 14px', textAlign: 'left',
  fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-subtle)',
}
const td: React.CSSProperties          = { padding: '12px 14px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }
const tRow: React.CSSProperties        = { transition: 'background 0.1s' }
const pointBtn: React.CSSProperties    = {
  padding: '4px 12px', background: 'var(--primitive-brand-50)',
  border: '1px solid var(--color-brand-default)', borderRadius: 6,
  color: 'var(--primitive-brand-700)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}
const pagination: React.CSSProperties  = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 20 }
const pageBtn: React.CSSProperties     = {
  padding: '6px 10px', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 6,
  fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
}
// ── PointHistoryModal 전용 스타일 ──
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalBox: React.CSSProperties    = {
  background: 'var(--bg-modal)', border: '1px solid var(--border-default)',
  borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 480,
  display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '85vh', overflowY: 'auto',
}
const modalTitle: React.CSSProperties  = { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const closeIconBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }
const logRow: React.CSSProperties      = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', gap: 10,
}
const closeModalBtn: React.CSSProperties = {
  marginTop: 16, padding: '10px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

export default MemberListPage
