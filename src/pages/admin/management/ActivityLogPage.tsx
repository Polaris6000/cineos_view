/**
 * ActivityLogPage.tsx — 전체 포인트 활동 로그 페이지
 *
 * 경로: /admin/management/members/activity-log
 *
 * 진입 방식:
 *   MemberListPage에서 "전체 활동 로그" 버튼 클릭
 *   → navigate('/admin/management/members/activity-log')
 *
 * 기능:
 *   1. GET /api/admin/member/point-list?page={n} — 전체 포인트 이력 (Page<PointHistoryDTO>)
 *   2. 타입 필터 (전체 / 적립 / 사용 / 취소)
 *   3. 전화번호 검색 (현재 페이지 내 클라이언트 필터링)
 *   4. 페이지네이션
 *   5. "회원 목록으로" 뒤로가기 버튼
 *
 * 네비게이션 없음 — AdminLayout 내 라우트 등록, 사이드바 미노출
 */
import {useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowLeft, ChevronLeft, ChevronRight, Search} from 'lucide-react'
import apiClient from '../../../api/apiClient'

/**
 * buildPageRange — 페이지 번호 배열 생성 (... 포함)
 * 7 이하: 모두 표시 / 초과: 1 · ... · (현재±2) · ... · N 구조
 */
function buildPageRange(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
    const left = Math.max(2, current - 2)
    const right = Math.min(total - 1, current + 2)
    const items: (number | '...')[] = [1]
    if (left > 2) items.push('...')
    for (let i = left; i <= right; i++) items.push(i)
    if (right < total - 1) items.push('...')
    items.push(total)
    return items
}

/* ── 타입 ── */
interface PointHistory {
    pointId: number
    title: string
    createAt: string
    type: 'EARN' | 'REFUND_EARN' | 'REFUND_USE' | 'USE'
    amountPoint: number
    paymentId: string
    phone: string
}

/** 타입별 색상·라벨·부호 설정 */
const TYPE_META: Record<PointHistory['type'], { color: string; label: string; sign: string }> = {
    EARN: {color: 'var(--color-success-main)', label: '적립', sign: '+'},
    USE: {color: 'var(--color-brand-default)', label: '사용', sign: '−'},
    REFUND_EARN: {color: 'var(--color-error-main)', label: '적립 취소', sign: '−'},
    REFUND_USE: {color: 'var(--color-error-main)', label: '사용 취소', sign: '+'},
}

/** 타입 배지 */
function TypeBadge({type}: { type: PointHistory['type'] }) {
    const meta = TYPE_META[type] ?? {color: 'var(--text-muted)', label: type, sign: ''}
    return (
        /* className="badge" → global.css .badge { white-space: nowrap } 적용 */
        <span className="badge" style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
            color: meta.color, background: 'var(--bg-base)',
            border: `1px solid ${meta.color}`,
        }}>
      {meta.label}
    </span>
    )
}

type FilterType = 'ALL' | PointHistory['type']

function ActivityLogPage() {
    const navigate = useNavigate()

    /* ── 데이터 상태 ── */
    const [logs, setLogs] = useState<PointHistory[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalElements, setTotalElements] = useState(0)

    /* ── 필터 / 검색 ── */
    const [filterType, setFilterType] = useState<FilterType>('ALL')
    const [keyword, setKeyword] = useState('')

    /**
     * 전체 포인트 활동 로그 조회
     * GET /api/admin/member/point-list?page={n}
     * 응답: Page<PointHistoryDTO> → content 배열 추출
     */
    useEffect(() => {
        setLoading(true)
        apiClient
            .get('/admin/member/point-list', {params: {page: currentPage}})
            .then(res => {
                const data = res.data
                // Page<PointHistoryDTO> 구조 대응
                const list: PointHistory[] = data.content ?? data
                setLogs(list)
                setTotalPages(data.totalPages ?? 1)
                setTotalElements(data.totalElements ?? list.length)
            })
            .catch(err => console.error('[ActivityLogPage] 로드 실패:', err))
            .finally(() => setLoading(false))
    }, [currentPage]) // 페이지 변경 시 재조회

    /**
     * 현재 페이지 내 클라이언트 필터링
     * - 타입 필터: filterType !== 'ALL' 이면 해당 타입만 표시
     * - 전화번호 검색: keyword가 있으면 phone 포함 여부 확인
     */
    const filtered = useMemo(() => {
        return logs.filter(log => {
            if (filterType !== 'ALL' && log.type !== filterType) return false
            if (keyword.trim() && !log.phone.includes(keyword.trim())) return false
            return true
        })
    }, [logs, filterType, keyword])

    return (
        <div style={{maxWidth: 860}}>

            {/* ── 헤더 ── */}
            <div style={header}>
                <button onClick={() => navigate(-1)} style={backBtn}>
                    <ArrowLeft size={15} style={{marginRight: 5}}/>
                    회원 목록으로
                </button>
                <div>
                    <h2 style={pageTitle}>전체 활동 로그</h2>
                    <p style={pageDesc}>전체 {totalElements.toLocaleString()}건</p>
                </div>
            </div>

            {/* ── 필터 + 검색 ── */}
            <div style={toolbar}>
                {/* 타입 필터 탭 */}
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap' as const}}>
                    {(['ALL', 'EARN', 'USE', 'REFUND_EARN', 'REFUND_USE'] as FilterType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{
                                ...filterTab,
                                background: filterType === t ? 'var(--color-brand-default)' : 'var(--bg-base)',
                                color: filterType === t ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                            }}
                        >
                            {{ALL: '전체', EARN: '적립', USE: '사용', REFUND_EARN: '적립 취소', REFUND_USE: '사용 취소'}[t]}
                        </button>
                    ))}
                </div>

                {/* 전화번호 검색 */}
                <div style={searchWrap}>
                    <Search size={14} color="var(--text-muted)"/>
                    <input
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="전화번호 검색"
                        style={searchInput}
                    />
                </div>
            </div>

            {/* ── 테이블 ── */}
            <div style={tableWrapper}>
                <table style={table}>
                    <thead>
                    <tr>
                        {['전화번호', '구분', '포인트', '내용', '일시'].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={5} style={emptyCell}>불러오는 중...</td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={emptyCell}>내역이 없습니다.</td>
                        </tr>
                    ) : filtered.map(log => {
                        const meta = TYPE_META[log.type]
                        return (
                            <tr key={log.pointId} style={trStyle}>
                                {/* 전화번호 */}
                                <td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>
                                    {log.phone}
                                </td>
                                {/* 타입 배지 */}
                                <td style={tdStyle}>
                                    <TypeBadge type={log.type}/>
                                </td>
                                {/* 포인트 변동량 */}
                                <td style={{
                                    ...tdStyle,
                                    fontWeight: 700,
                                    color: meta?.color,
                                    textAlign: 'right' as const
                                }}>
                                    {meta?.sign}{Math.abs(log.amountPoint).toLocaleString()}P
                                </td>
                                {/* 내용 (title or paymentId) */}
                                <td style={{...tdStyle, color: 'var(--text-secondary)', fontSize: 12}}>
                                    {log.title || log.paymentId || '-'}
                                </td>
                                {/* 일시 */}
                                <td style={{
                                    ...tdStyle,
                                    color: 'var(--text-muted)',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap' as const
                                }}>
                                    {log.createAt?.slice(0, 16) ?? '-'}
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>

            {/* ── 페이지네이션 ── */}
            {totalPages >= 1 && (
                <div style={pagination}>
                    <button
                        style={{...pageBtn, opacity: currentPage <= 1 ? 0.4 : 1}}
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        <ChevronLeft size={14}/>
                    </button>

                    {/* buildPageRange: 1 · ... · (현재±2) · ... · N 구조 */}
                    {buildPageRange(currentPage, totalPages).map((p, idx) =>
                        p === '...'
                            ? <span key={`ellipsis-${idx}`} style={ellipsis}>…</span>
                            : (
                                <button
                                    key={p}
                                    style={{
                                        ...pageBtn,
                                        minWidth: 34,
                                        background: p === currentPage ? 'var(--color-brand-default)' : 'var(--bg-surface)',
                                        color: p === currentPage ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                                        fontWeight: p === currentPage ? 700 : 400,
                                    }}
                                    onClick={() => setCurrentPage(p)}
                                >
                                    {p}
                                </button>
                            )
                    )}

                    <button
                        style={{...pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1}}
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        <ChevronRight size={14}/>
                    </button>
                </div>
            )}
        </div>
    )
}

/* ── 스타일 ── */
const header: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20,
}
const pageTitle: React.CSSProperties = {
    fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px',
}
const pageDesc: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-muted)', margin: 0,
}
const backBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', marginTop: 4,
    padding: '8px 14px', background: 'var(--bg-base)',
    border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
    cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
}
const toolbar: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 14, flexWrap: 'wrap' as const,
}
const filterTab: React.CSSProperties = {
    padding: '6px 12px', border: '1px solid var(--border-default)',
    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const searchWrap: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 12px', background: 'var(--input-bg)',
    border: '1px solid var(--border-default)', borderRadius: 8, flex: 1, minWidth: 160,
}
const searchInput: React.CSSProperties = {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
}
const tableWrapper: React.CSSProperties = {
    overflowX: 'auto' as const, background: 'var(--bg-surface)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const table: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
}
const thStyle: React.CSSProperties = {
    padding: '10px 14px', background: 'var(--bg-base)', color: 'var(--text-secondary)',
    fontWeight: 700, fontSize: 12, textAlign: 'left' as const,
    borderBottom: '2px solid var(--border-default)', position: 'sticky' as const, top: 0,
}
const trStyle: React.CSSProperties = {borderBottom: '1px solid var(--border-default)'}
const tdStyle: React.CSSProperties = {
    padding: '10px 14px', color: 'var(--text-primary)', verticalAlign: 'middle' as const,
}
const emptyCell: React.CSSProperties = {
    padding: '28px', textAlign: 'center' as const,
    color: 'var(--text-muted)', fontSize: 13,
}
const pagination: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 4, marginTop: 20, flexWrap: 'wrap',
}
const pageBtn: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-default)',
    background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)',
}
const ellipsis: React.CSSProperties = {
    width: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', lineHeight: '32px',
}
export default ActivityLogPage
