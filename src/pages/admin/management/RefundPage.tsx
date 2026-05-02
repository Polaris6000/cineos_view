/**
 * RefundPage.tsx — 환불 처리 (UC-17)
 *
 * 기능:
 *  1. 전체 결제내역 리스트 조회 (GET /api/payment/list) — 백엔드 페이징 추가 예정
 *  2. 리스트에서 항목 클릭 시 하단 예매번호 검색에 자동 입력
 *  3. 예매번호로 상세 조회 (GET /api/payment/read/{uuid})
 *  4. 환불 가능 여부 표시 + 환불 처리 (POST /api/payment/refund)
 */
import {useEffect, useState} from 'react'
import {CheckCircle, RefreshCw, Search} from 'lucide-react'
import apiClient from '../../../api/apiClient'
import {BookingDTO, mapToBooking, PaymentDTO} from '../../../api/typeData'

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

/** 결제내역 리스트에 표시할 간략 정보 */
interface PaymentSummary {
    id: string            // 예매번호 (UUID)
    movieTitle: string    // 영화명
    phone: string         // 고객 전화번호
    cost: number          // 결제금액
    status: string        // PAY | RETURN | FAIL
    createAt: string      // 결제일시 ISO
}

/** 상태에 따른 배지 스타일 */
function StatusBadge({status}: { status: string }) {
    const cfg = {
        PAY: {bg: 'var(--color-info-bg)', color: 'var(--color-info-text)', label: '결제완료'},
        RETURN: {bg: 'var(--color-success-bg)', color: 'var(--color-success-main)', label: '환불완료'},
        FAIL: {bg: 'var(--color-error-bg)', color: 'var(--color-error-text)', label: '결제실패'},
    }[status] ?? {bg: '#eee', color: '#666', label: status}

    return (
        <span className="badge" style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color,
        }}>
      {cfg.label}
    </span>
    )
}

function RefundPage() {
    /* ── 결제내역 리스트 + 페이지네이션 ── */
    const [paymentList, setPaymentList] = useState<PaymentSummary[]>([])
    const [listLoading, setListLoading] = useState(false)
    const [listError, setListError] = useState('')
    // 백엔드 서버사이드 페이징 상태 (1-based)
    const [listPage, setListPage] = useState(1)
    const [listTotalPages, setListTotalPages] = useState(1)
    const [listTotalItems, setListTotalItems] = useState(0)

    /* ── 예매번호 검색 ── */
    const [query, setQuery] = useState('')                     // 예매번호 검색어
    const [result, setResult] = useState<BookingDTO>()           // 조회된 예매
    const [error, setError] = useState('')
    const [refunded, setRefunded] = useState(false)                  // 방금 환불 처리됐으면 true
    const [loading, setLoading] = useState(false)

    /**
     * 전체 결제내역 조회 (서버사이드 페이징)
     * GET /api/admin/payment/list?page={page}
     *
     * 백엔드 readAllPayment(int page) → Spring Page<PaymentDetailsDTO> 반환
     * JSON 직렬화 구조: { content: [...], totalPages, totalElements, ... }
     * 백엔드 offset = (page - 1) * 10 이므로 page는 1-based로 전송
     */
    const loadPaymentList = async (page: number) => {
        setListLoading(true)
        setListError('')
        try {
            const {data} = await apiClient.get<{
                content: PaymentDTO[]
                totalPages: number
                totalElements: number
            }>('/admin/payment/list', {params: {page}})

            // Spring Page 응답에서 실제 데이터는 .content 배열에 있음
            const summaries: PaymentSummary[] = data.content
                .map((p) => ({
                    id: p.id,
                    movieTitle: p.reservation?.schedule?.movie?.title ?? '(영화명 없음)',
                    phone: p.reservation?.phone?.phone ?? '-',
                    cost: p.cost,
                    status: p.status,
                    createAt: p.createAt,
                }))
                // 결제일시 내림차순 정렬 (가장 최근 결제가 맨 위)
                // 서버사이드 페이지네이션이므로 현재 페이지 내에서만 정렬됨
                .sort((a, b) => (b.createAt ?? '').localeCompare(a.createAt ?? ''))
            setPaymentList(summaries)
            setListTotalPages(data.totalPages)
            setListTotalItems(data.totalElements)
        } catch (e: any) {
            setListError('결제내역을 불러오지 못했습니다.')
            console.error('결제내역 리스트 로드 실패:', e)
        }
        setListLoading(false)
    }

    // listPage 변경 시 재조회 (마운트 시 page=1 로 최초 조회 포함)
    useEffect(() => {
        loadPaymentList(listPage)
    }, [listPage])

    /**
     * 예매번호로 상세 조회
     * GET /api/payment/read/{uuid}
     */
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setResult(undefined)
        setRefunded(false)
        if (!query.trim()) {
            setError('예매번호를 입력해 주세요.')
            return
        }

        setLoading(true)
        try {
            // apiClient 사용: baseURL = /api/, 401 인터셉터(admin/login 리다이렉트) 적용
            const {data} = await apiClient.get<PaymentDTO>(`/admin/payment/read/${query.trim()}`)
            const formattedBooking = mapToBooking(data)
            console.log('예매 조회 결과:', formattedBooking)
            setResult(formattedBooking)
        } catch {
            setError('해당 예매 정보를 찾을 수 없습니다.')
        }
        setLoading(false)
    }

    /** 환불 처리 — POST /api/payment/refund */
    const handleRefund = async () => {
        if (!result) return
        const ok = window.confirm(
            `예매번호 ${result.bookingId} 를 환불 처리하시겠습니까?\n` +
            `환불 금액: ${result.totalAmount.toLocaleString()}원\n\n계속 진행하시겠습니까?`
        )
        if (!ok) return

        setLoading(true)
        try {
            // apiClient 사용: 401 인터셉터 적용 + baseURL = /api/
            await apiClient.post('/admin/payment/refund', {
                paymentKey: result.paymentKey,
                paymentId: result.bookingId,
            })
            await new Promise((r) => setTimeout(r, 700))
            setRefunded(true)
            // detail 카드의 status도 즉시 RETURN으로 반영 — 환불 버튼 재노출 방지
            setResult(prev => prev ? {...prev, status: 'RETURN'} : undefined)
            // 리스트 새로고침 — 현재 페이지 그대로 재조회 (RETURN 상태 반영)
            loadPaymentList(listPage)
        } catch {
            alert('환불 처리 중 오류가 발생했습니다.')
        }
        setLoading(false)
    }

    // 파생 상태 — 백엔드 환불 완료 상태값은 'RETURN'
    const isRefunded = result ? (result.status === 'RETURN' || refunded) : false
    const canRefund = true  // TODO: 상영 시작 시각 기준 환불가능 여부

    return (
        <div style={{maxWidth: 800}}>
            <h2 style={pageTitle}>환불 처리</h2>

            {/* ── 전체 결제내역 리스트 ── */}
            <section style={sectionCard}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
                    <h3 style={sectionTitle}>
                        전체 결제내역
                        {/* 전체 건수 표시 */}
                        {listTotalItems > 0 && (
                            <span style={{fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8}}>
                {listTotalItems}건
              </span>
                        )}
                    </h3>
                    {/* 새로고침 — 현재 페이지 재조회 */}
                    <button onClick={() => loadPaymentList(listPage)} disabled={listLoading} style={refreshBtn}
                            title="새로고침">
                        <RefreshCw size={14} style={{marginRight: 4}}/>
                        {listLoading ? '로딩 중...' : '새로고침'}
                    </button>
                </div>

                {/* 에러 표시 */}
                {listError && (
                    <div style={listErrorBox}>⚠️ {listError}</div>
                )}

                {/* 로딩 중 */}
                {listLoading && (
                    <p style={{color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0'}}>
                        불러오는 중...
                    </p>
                )}

                {/* 결제내역 테이블 */}
                {!listLoading && !listError && paymentList.length === 0 && (
                    <p style={{color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0'}}>
                        결제내역이 없습니다.
                    </p>
                )}

                {!listLoading && paymentList.length > 0 && (
                    <>
                        <div style={tableWrapper}>
                            <table style={table}>
                                <thead>
                                <tr>
                                    {['예매번호', '영화명', '고객전화', '결제금액', '상태', '결제일시', ''].map((h) => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {paymentList.map((p) => (
                                    <tr
                                        key={p.id}
                                        style={{
                                            ...tr,
                                            // 현재 선택된 항목 강조
                                            background: query === p.id ? 'var(--color-brand-alpha-08, rgba(255,184,0,0.08))' : undefined,
                                        }}
                                    >
                                        <td style={td}>
                                            {/* 예매번호 — 길어서 앞 12자만 표시 */}
                                            <span style={{fontFamily: 'monospace', fontSize: 12}} title={p.id}>
                          {p.id.length > 12 ? p.id.slice(0, 12) + '…' : p.id}
                        </span>
                                        </td>
                                        <td style={td}>{p.movieTitle}</td>
                                        <td style={td}>{p.phone}</td>
                                        <td style={{...td, fontWeight: 700}}>{p.cost.toLocaleString()}원</td>
                                        <td style={td}><StatusBadge status={p.status}/></td>
                                        <td style={{...td, color: 'var(--text-muted)', fontSize: 12}}>
                                            {p.createAt ? p.createAt.replace('T', ' ').slice(0, 16) : '-'}
                                        </td>
                                        <td style={td}>
                                            {/* 이 항목으로 검색 자동입력 버튼 */}
                                            <button
                                                onClick={() => {
                                                    setQuery(p.id)
                                                    setResult(undefined)
                                                    setError('')
                                                    setRefunded(false)
                                                    // 자동으로 스크롤 내려서 검색 폼 보이도록
                                                    setTimeout(() => {
                                                        document.getElementById('refund-search-input')?.scrollIntoView({
                                                            behavior: 'smooth',
                                                            block: 'center'
                                                        })
                                                    }, 100)
                                                }}
                                                style={selectBtn}
                                            >
                                                <Search size={12} style={{marginRight: 3}}/>
                                                조회
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── 페이지네이션 — totalPages >= 1이면 항상 표시 ── */}
                        {listTotalPages >= 1 && (
                            <div style={paginationWrap}>
                                <button
                                    disabled={listPage === 1}
                                    onClick={() => setListPage(p => Math.max(1, p - 1))}
                                    style={{...pageBtn, opacity: listPage === 1 ? 0.4 : 1}}
                                >
                                    이전
                                </button>

                                {/* buildPageRange: 1·...·(현재±2)·...·N 구조로 페이지 번호 생성 */}
                                {buildPageRange(listPage, listTotalPages).map((n, idx) =>
                                    n === '...'
                                        ? <span key={`ellipsis-${idx}`} style={ellipsis}>…</span>
                                        : (
                                            <button
                                                key={n}
                                                onClick={() => setListPage(n)}
                                                style={{
                                                    ...pageNumBtn,
                                                    background: listPage === n ? 'var(--color-brand-default)' : 'transparent',
                                                    color: listPage === n ? '#fff' : 'var(--text-secondary)',
                                                    border: listPage === n ? 'none' : '1px solid var(--border-subtle)',
                                                }}
                                            >
                                                {n}
                                            </button>
                                        )
                                )}

                                <button
                                    disabled={listPage === listTotalPages}
                                    onClick={() => setListPage(p => Math.min(listTotalPages, p + 1))}
                                    style={{...pageBtn, opacity: listPage === listTotalPages ? 0.4 : 1}}
                                >
                                    다음
                                </button>

                                <span style={{fontSize: 12, color: 'var(--text-muted)', marginLeft: 4}}>
                                    {listPage} / {listTotalPages} 페이지
                                </span>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ── 예매번호 검색 폼 ── */}
            <section style={sectionCard}>
                <h3 style={sectionTitle}>예매번호로 상세 조회</h3>
                <form onSubmit={handleSearch} style={{marginTop: 8}}>
                    <p style={sLabel}>예매번호 입력 또는 위 목록에서 선택</p>
                    <div style={searchRow}>
                        <input
                            id="refund-search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="예: toss-orderId-uuid"
                            style={searchInput}
                        />
                        <button type="submit" disabled={loading} style={searchBtn}>
                            {loading ? '조회 중...' : '조회'}
                        </button>
                    </div>
                    {error && <p style={errorMsg}>{error}</p>}
                </form>

                {/* ── 조회 결과 ── */}
                {result && (
                    <div style={{marginTop: 20}}>
                        {/* 예매 헤더 + 상태 배지 */}
                        <div style={statusRow}>
                            <h4 style={{fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0}}>
                                예매 정보
                            </h4>
                            <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: isRefunded ? 'var(--color-success-bg)' :
                                    canRefund ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                                color: isRefunded ? 'var(--color-success-main)' :
                                    canRefund ? 'var(--color-warning-text)' : 'var(--color-error-text)',
                            }}>
                {isRefunded ? '환불 완료' :
                    canRefund ? '환불 가능' : '환불 불가 (상영 후)'}
              </span>
                        </div>

                        <dl style={dl}>
                            <dt style={dtStyle}>예매번호</dt>
                            <dd style={ddStyle}>{result.bookingId}</dd>
                            <dt style={dtStyle}>휴대폰</dt>
                            <dd style={ddStyle}>{result.phone}</dd>
                            <dt style={dtStyle}>영화</dt>
                            <dd style={ddStyle}>{result.movieTitle}</dd>
                            <dt style={dtStyle}>상영관</dt>
                            <dd style={ddStyle}>{result.theaterName}</dd>
                            <dt style={dtStyle}>일시</dt>
                            <dd style={ddStyle}>{result.date} {result.startTime}</dd>
                            <dt style={dtStyle}>좌석</dt>
                            <dd style={ddStyle}>{result.seats.join(', ')}</dd>
                            <dt style={dtStyle}>결제금액</dt>
                            <dd style={{...ddStyle, fontWeight: 700}}>
                                {result.totalAmount.toLocaleString()}원
                            </dd>
                            <dt style={dtStyle}>결제수단</dt>
                            <dd style={ddStyle}>{result.paymentMethod}</dd>
                            <dt style={dtStyle}>결제일시</dt>
                            <dd style={ddStyle}>{result.paidAt.replace('T', ' ')}</dd>
                            {result.pointUsed > 0 && (
                                <>
                                    <dt style={dtStyle}>포인트사용</dt>
                                    <dd style={ddStyle}>{result.pointUsed.toLocaleString()}P</dd>
                                </>
                            )}
                        </dl>

                        {/* 이미 환불됨 */}
                        {result.status === 'REFUNDED' && !refunded && (
                            <div style={alreadyRefundedBox}>
                                <CheckCircle size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
                                이미 환불처리된 내역입니다.
                            </div>
                        )}

                        {/* 방금 환불 처리 완료 */}
                        {refunded && (
                            <div style={successBox}>
                                <CheckCircle size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
                                환불 처리가 완료되었습니다.
                            </div>
                        )}

                        {/* 환불 버튼 */}
                        {!isRefunded && canRefund && (
                            <button onClick={handleRefund} disabled={loading} style={refundBtn}>
                                {loading ? '처리 중...' : `${result.totalAmount.toLocaleString()}원 환불하기`}
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}

/* ── 스타일 ── */
const pageTitle: React.CSSProperties = {
    fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20,
}
const sectionCard: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20,
}
const sectionTitle: React.CSSProperties = {
    fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
}
const refreshBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', padding: '6px 12px',
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    cursor: 'pointer',
}
const listErrorBox: React.CSSProperties = {
    padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
    borderRadius: 8, color: 'var(--color-error-text)', fontSize: 13,
}
const tableWrapper: React.CSSProperties = {
    overflowX: 'auto' as const, maxHeight: 320, overflowY: 'auto' as const,
}
const table: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
}
const th: React.CSSProperties = {
    padding: '8px 10px', background: 'var(--bg-base)', color: 'var(--text-secondary)',
    fontWeight: 700, fontSize: 12, textAlign: 'left' as const,
    borderBottom: '2px solid var(--border-default)', position: 'sticky' as const, top: 0,
}
const tr: React.CSSProperties = {
    borderBottom: '1px solid var(--border-default)',
}
const td: React.CSSProperties = {
    padding: '8px 10px', color: 'var(--text-primary)', verticalAlign: 'middle' as const,
}
const paginationWrap: React.CSSProperties = {
    display: 'flex', gap: 4, alignItems: 'center', marginTop: 12, flexWrap: 'wrap',
}
const pageBtn: React.CSSProperties = {
    padding: '5px 11px', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', background: 'var(--bg-base)', cursor: 'pointer',
}
const pageNumBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const ellipsis: React.CSSProperties = {
    width: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', lineHeight: '30px',
}
const selectBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 10px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
}
const sLabel: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8,
}
const searchRow: React.CSSProperties = {display: 'flex', gap: 8}
const searchInput: React.CSSProperties = {
    flex: 1, padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', outline: 'none',
}
const searchBtn: React.CSSProperties = {
    padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
}
const errorMsg: React.CSSProperties = {
    fontSize: 13, color: 'var(--color-error-main)', marginTop: 8,
}
const statusRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
}
const dl: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px 12px', marginBottom: 16,
}
const dtStyle: React.CSSProperties = {fontSize: 13, color: 'var(--text-muted)', fontWeight: 600}
const ddStyle: React.CSSProperties = {fontSize: 14, color: 'var(--text-primary)', margin: 0}
const alreadyRefundedBox: React.CSSProperties = {
    padding: '12px 16px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 4,
}
const successBox: React.CSSProperties = {
    padding: '12px 16px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-text)',
    borderRadius: 8, color: 'var(--color-success-text)', fontSize: 13, fontWeight: 600, marginBottom: 4,
}
const refundBtn: React.CSSProperties = {
    width: '100%', padding: '14px 0',
    background: '#e03c3c', border: 'none',
    borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
}

export default RefundPage
