/**
 * PaymentLogPage.tsx — 전체 결제 로그 조회 (목록)
 *
 * 기능:
 *  1. GET /api/payment/list — 전체 결제내역 조회
 *  2. 상태별 필터링 (PAY / RETURN / FAIL)
 *  3. 영화명·전화번호·예매번호 클라이언트 검색
 *  4. 상세 버튼 클릭 → /admin/management/payment-log/:id 상세 페이지로 이동
 *     (이전: 모달 → 변경: 별도 페이지)
 */
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

import {useEffect, useMemo, useState} from 'react'
import {RefreshCw} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import apiClient from '../../../api/apiClient'
import {PaymentDTO} from '../../../api/typeData'

/** 상태 배지 */
function StatusBadge({status}: { status: string }) {
    const cfg = {
        PAY: {bg: 'var(--color-info-bg)', color: 'var(--color-info-text)', label: '결제완료'},
        RETURN: {bg: 'var(--color-success-bg)', color: 'var(--color-success-main)', label: '환불완료'},
        FAIL: {bg: 'var(--color-error-bg)', color: 'var(--color-error-text)', label: '결제실패'},
    }[status] ?? {bg: '#eee', color: '#666', label: status}

    return (
        /* className="badge" → global.css .badge { white-space: nowrap } 적용 */
        <span className="badge" style={{
            padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color,
        }}>
      {cfg.label}
    </span>
    )
}

type FilterStatus = 'ALL' | 'PAY' | 'RETURN' | 'FAIL'

function PaymentLogPage() {
    const navigate = useNavigate()

    /* ── 페이지네이션 상태 ── */
    const [currentPage, setCurrentPage] = useState(1)   // 현재 페이지 (1-based)
    const [totalPages, setTotalPages] = useState(1)   // 전체 페이지 수
    const [totalItems, setTotalItems] = useState(0)   // 전체 건수

    /* ── 현재 페이지 데이터 ── */
    const [paymentList, setPaymentList] = useState<PaymentDTO[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    /* ── 필터 / 검색 (현재 페이지 내 클라이언트 필터) ── */
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
    const [keyword, setKeyword] = useState('')

    /**
     * 결제내역 페이지 조회 — GET /api/admin/payment/list?page={page}
     *
     * 백엔드 PaymentDetailsServiceImpl.readAll(page)가 Spring Page<PaymentDetailsDTO> 반환.
     * Jackson 직렬화 시 { content, totalPages, totalElements, ... } 구조로 내려옴.
     *
     * ⚠️ 이전 버그:
     *   1) apiClient.get<PaymentDTO[]> 로 받아서 .content 접근 안 함 → 항상 빈 배열
     *   2) page 파라미터를 API에 전달 안 함 → 항상 1페이지만 조회
     *   3) totalPages / totalElements 업데이트 안 함 → 페이지네이션 UI 미동작
     */
    const loadList = async (page: number) => {
        setLoading(true)
        setError('')
        try {
            // Page<PaymentDetailsDTO> 응답 타입 명시
            const {data} = await apiClient.get<{
                content: PaymentDTO[]
                totalPages: number
                totalElements: number
            }>('/admin/payment/list', {params: {page}})

            // Spring Page 응답: content 배열에 실제 데이터가 들어있음
            setPaymentList(data.content)
            setTotalPages(data.totalPages)
            setTotalItems(data.totalElements)
        } catch (e: any) {
            if (e?.response?.status === 404) {
                setError('백엔드에 GET /api/admin/payment/list 엔드포인트가 없습니다.')
            } else {
                setError('결제내역을 불러오지 못했습니다.')
            }
            console.error('결제 로그 로드 실패:', e)
        }
        setLoading(false)
    }

    // 페이지 변경 시 재조회
    useEffect(() => {
        loadList(currentPage)
    }, [currentPage])

    /** 필터 + 검색 + 날짜 정렬 적용
     *
     * ⚠️ 주의: 서버사이드 페이지네이션이므로 이 정렬은 현재 페이지 내에서만 동작함.
     * 전체 데이터 기준 최신순 정렬은 백엔드에서 ORDER BY create_at DESC 처리 필요.
     */
    const filtered = useMemo(() => {
        return paymentList
            .filter((p) => {
                // 상태 필터
                if (filterStatus !== 'ALL' && p.status !== filterStatus) return false
                // 키워드 검색 (영화명·전화번호·예매번호)
                if (keyword) {
                    const kw = keyword.toLowerCase()
                    const movieTitle = (p.reservation?.schedule?.movie?.title ?? '').toLowerCase()
                    const phone = (p.reservation?.phone?.phone ?? '').toLowerCase()
                    if (!movieTitle.includes(kw) && !phone.includes(kw) && !p.id.toLowerCase().includes(kw)) return false
                }
                return true
            })
            // 결제일시 내림차순 정렬 (가장 최근 결제가 맨 위)
            // ISO 문자열 ("2026-04-21T13:00:00")은 문자열 비교만으로 날짜 순서가 올바르게 정렬됨
            .sort((a, b) => (b.createAt ?? '').localeCompare(a.createAt ?? ''))
    }, [paymentList, filterStatus, keyword])

    /* ── 집계 통계 (현재 페이지 기준) ── */
    const payCount = paymentList.filter((p) => p.status === 'PAY').length
    const returnCount = paymentList.filter((p) => p.status === 'RETURN').length
    const totalSales = paymentList
        .filter((p) => p.status === 'PAY')
        .reduce((s, p) => s + (p.cost ?? 0), 0)

    return (
        <div style={{maxWidth: 1000}}>
            <h2 style={pageTitle}>전체 결제 로그</h2>

            {/* ── 집계 카드 ── */}
            <div style={statsRow}>
                {[
                    {label: '전체 결제 (누적)', value: totalItems + '건', color: 'var(--text-primary)'},
                    {label: '결제완료 (현재 페이지)', value: payCount + '건', color: 'var(--color-info-text)'},
                    {label: '환불완료 (현재 페이지)', value: returnCount + '건', color: 'var(--color-success-main)'},
                    {
                        label: '결제금액 합계 (현재 페이지)',
                        value: totalSales.toLocaleString() + '원',
                        color: 'var(--color-brand-default)'
                    },
                ].map((s) => (
                    <div key={s.label} style={statCard}>
                        <p style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            marginBottom: 4
                        }}>{s.label}</p>
                        <p style={{fontSize: 20, fontWeight: 800, color: s.color, margin: 0}}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── 필터 + 검색 + 새로고침 ── */}
            <div style={toolbar}>
                {/* 상태 필터 탭 */}
                <div style={{display: 'flex', gap: 6}}>
                    {(['ALL', 'PAY', 'RETURN', 'FAIL'] as FilterStatus[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            style={{
                                ...filterTab,
                                background: filterStatus === s ? 'var(--color-brand-default)' : 'var(--bg-base)',
                                color: filterStatus === s ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                            }}
                        >
                            {{ALL: '전체', PAY: '결제완료', RETURN: '환불', FAIL: '실패'}[s]}
                        </button>
                    ))}
                </div>

                {/* 키워드 검색 */}
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="영화명 · 전화번호 · 예매번호 검색"
                    style={searchInput}
                />

                {/* 새로고침 — 현재 페이지 재조회 */}
                <button onClick={() => loadList(currentPage)} disabled={loading} style={refreshBtn}>
                    <RefreshCw size={14} style={{marginRight: 4}}/>
                    {loading ? '로딩 중...' : '새로고침'}
                </button>
            </div>

            {/* ── 에러 ── */}
            {error && <div style={errorBox}>{error}</div>}

            {/* ── 페이지네이션 (상단) — totalPages >= 1이면 항상 표시 ── */}
            {!loading && totalPages >= 1 && (
                <div style={paginationWrap}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        style={{...pageBtn, opacity: currentPage === 1 ? 0.4 : 1}}
                    >
                        이전
                    </button>
                    {/* buildPageRange: 1 · ... · (현재±2) · ... · N 구조 */}
                    {buildPageRange(currentPage, totalPages).map((n, idx) =>
                        n === '...'
                            ? <span key={`ellipsis-${idx}`} style={ellipsisStyle}>…</span>
                            : (
                                <button
                                    key={n}
                                    onClick={() => setCurrentPage(n)}
                                    style={{
                                        ...pageNumBtn,
                                        background: currentPage === n ? 'var(--color-brand-default)' : 'transparent',
                                        color: currentPage === n ? '#fff' : 'var(--text-secondary)',
                                        border: currentPage === n ? 'none' : '1px solid var(--border-subtle)',
                                    }}
                                >
                                    {n}
                                </button>
                            )
                    )}
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        style={{...pageBtn, opacity: currentPage === totalPages ? 0.4 : 1}}
                    >
                        다음
                    </button>
                </div>
            )}

            {/* ── 로딩 ── */}
            {loading && !error && (
                <p style={{color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0'}}>
                    불러오는 중...
                </p>
            )}

            {/* ── 테이블 ── */}
            {!loading && !error && (
                <>
                    <p style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 8}}>
                        {filtered.length}건 표시 / 현재 페이지 {paymentList.length}건 · 전체 {totalItems}건
                        ({currentPage}/{totalPages} 페이지)
                    </p>
                    <div style={tableWrapper}>
                        <table style={table}>
                            <thead>
                            <tr>
                                {['예매번호', '영화명', '고객전화', '결제금액', '포인트사용', '상태', '결제일시', '상세'].map((h) => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{
                                        padding: '24px',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: 13
                                    }}>
                                        조건에 맞는 결제내역이 없습니다.
                                    </td>
                                </tr>
                            ) : filtered.map((p) => (
                                <tr key={p.id} style={trStyle}>
                                    <td style={tdStyle}>
                      <span style={{fontFamily: 'monospace', fontSize: 11}} title={p.id}>
                        {p.id.length > 14 ? p.id.slice(0, 14) + '…' : p.id}
                      </span>
                                    </td>
                                    <td style={tdStyle}>{p.reservation?.schedule?.movie?.title ?? '-'}</td>
                                    <td style={tdStyle}>{p.reservation?.phone?.phone ?? '-'}</td>
                                    <td style={{...tdStyle, fontWeight: 700}}>
                                        {(p.cost ?? 0).toLocaleString()}원
                                    </td>
                                    <td style={{...tdStyle, color: 'var(--text-muted)'}}>
                                        {p.usePoint ? p.usePoint.toLocaleString() + 'P' : '-'}
                                    </td>
                                    <td style={tdStyle}><StatusBadge status={p.status}/></td>
                                    <td style={{...tdStyle, color: 'var(--text-muted)', fontSize: 12}}>
                                        {p.createAt ? p.createAt.replace('T', ' ').slice(0, 16) : '-'}
                                    </td>
                                    <td style={tdStyle}>
                                        {/*
                        상세 버튼: 클릭 시 /admin/management/payment-log/:id 로 이동
                        이전에는 모달 openDetail(p.id) 호출이었으나 별도 페이지로 분리
                      */}
                                        <button
                                            onClick={() => navigate(`/admin/management/payment-log/${p.id}`)}
                                            style={detailBtn}
                                        >
                                            상세
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

/* ── 스타일 ── */
const pageTitle: React.CSSProperties = {
    fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20,
}
const statsRow: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
}
const statCard: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 10, padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const toolbar: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const,
}
const filterTab: React.CSSProperties = {
    padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12,
    fontWeight: 700, cursor: 'pointer',
}
const searchInput: React.CSSProperties = {
    flex: 1, minWidth: 200, padding: '7px 12px',
    border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)', outline: 'none',
}
const refreshBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', padding: '7px 13px',
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', cursor: 'pointer',
}
const errorBox: React.CSSProperties = {
    padding: '12px 16px', background: 'var(--color-error-bg)',
    border: '1px solid var(--color-error-text)',
    borderRadius: 8, color: 'var(--color-error-text)', fontSize: 13, marginBottom: 12,
}
const paginationWrap: React.CSSProperties = {
    display: 'flex', gap: 4, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap',
}
const pageBtn: React.CSSProperties = {
    padding: '6px 12px', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', background: 'var(--bg-base)', cursor: 'pointer',
}
const pageNumBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const ellipsisStyle: React.CSSProperties = {
    width: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', lineHeight: '32px',
}
const tableWrapper: React.CSSProperties = {overflowX: 'auto' as const}
const table: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
}
const thStyle: React.CSSProperties = {
    padding: '10px 12px', background: 'var(--bg-base)', color: 'var(--text-secondary)',
    fontWeight: 700, fontSize: 12, textAlign: 'left' as const,
    borderBottom: '2px solid var(--border-default)',
}
const trStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--border-default)',
}
const tdStyle: React.CSSProperties = {
    padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle' as const,
}
const detailBtn: React.CSSProperties = {
    padding: '4px 12px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}

export default PaymentLogPage
