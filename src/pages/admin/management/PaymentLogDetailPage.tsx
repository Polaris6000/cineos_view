/**
 * PaymentLogDetailPage.tsx — 결제 상세 페이지
 *
 * 경로: /admin/management/payment-log/:id
 *
 * 진입 방식:
 *   PaymentLogPage에서 "상세" 버튼 클릭 → navigate(`/admin/management/payment-log/${id}`)
 *
 * 기능:
 *  1. URL 파라미터 :id(예매번호)로 GET /api/payment/read/{id} 조회
 *  2. 결제 상세 정보 표시 (예매정보 / 결제정보 / 쿠폰/포인트)
 *  3. 뒤로가기 버튼 → PaymentLogPage 목록으로 복귀
 *
 * 네비게이션 없음 — AdminLayout 내부 라우트로 등록, 사이드바 메뉴에는 미노출
 */
import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {ArrowLeft, Loader2} from 'lucide-react'
import apiClient from '../../../api/apiClient'
import {BookingDTO, mapToBooking, PaymentDTO} from '../../../api/typeData'

/** 상태 배지 */
function StatusBadge({status}: { status: string }) {
    const cfg = {
        PAY: {bg: 'var(--color-info-bg)', color: 'var(--color-info-text)', label: '결제완료'},
        RETURN: {bg: 'var(--color-success-bg)', color: 'var(--color-success-main)', label: '환불완료'},
        FAIL: {bg: 'var(--color-error-bg)', color: 'var(--color-error-text)', label: '결제실패'},
    }[status] ?? {bg: '#eee', color: '#666', label: status}

    return (
        <span className="badge" style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: cfg.bg, color: cfg.color,
        }}>
      {cfg.label}
    </span>
    )
}

/** 정보 행 컴포넌트 — label + value 쌍을 일관되게 표시 */
function InfoRow({label, value, highlight}: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <div style={infoRow}>
            <span style={infoLabel}>{label}</span>
            <span style={{
                ...infoValue,
                fontWeight: highlight ? 800 : 500,
                color: highlight ? 'var(--color-brand-default)' : 'var(--text-primary)'
            }}>
        {value}
      </span>
        </div>
    )
}

function PaymentLogDetailPage() {
    // URL 파라미터에서 예매번호(id) 추출
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()

    /* ── 상태 ── */
    const [detail, setDetail] = useState<BookingDTO | null>(null)
    const [raw, setRaw] = useState<PaymentDTO | null>(null)   // 원본 DTO (쿠폰 정보 등 추가 필드용)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    /**
     * 결제 상세 조회
     * GET /api/payment/read/{id}
     */
    useEffect(() => {
        if (!id) return

        const fetchDetail = async () => {
            setLoading(true)
            setError('')
            try {
                //    SecurityConfig: /api/admin/** 은 JWT 필수. apiClient.ts baseURL='/api' 기준
                const {data} = await apiClient.get<PaymentDTO>(`/admin/payment/read/${id}`)
                setRaw(data)
                setDetail(mapToBooking(data))
            } catch (e: any) {
                const status = e?.response?.status
                setError(
                    status === 404
                        ? '해당 결제 내역을 찾을 수 없습니다.'
                        : '결제 상세 정보를 불러오지 못했습니다.'
                )
                console.error('[PaymentLogDetailPage] 조회 실패:', e)
            }
            setLoading(false)
        }

        void fetchDetail()
    }, [id])

    /* ── 로딩 ── */
    if (loading) {
        return (
            <div style={centered}>
                <Loader2 size={36} style={{animation: 'spin 1s linear infinite', color: 'var(--color-brand-default)'}}/>
                <p style={{marginTop: 16, color: 'var(--text-muted)', fontSize: 14}}>불러오는 중...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    /* ── 에러 ── */
    if (error || !detail) {
        return (
            <div style={centered}>
                <p style={{color: 'var(--color-error-main)', marginBottom: 20, fontSize: 15}}>
                    {error || '데이터를 불러올 수 없습니다.'}
                </p>
                <button onClick={() => navigate(-1)} style={backBtn}>
                    <ArrowLeft size={16} style={{marginRight: 6}}/>
                    목록으로
                </button>
            </div>
        )
    }

    /* ── 쿠폰 정보 ── */
    const coupon = raw?.couponNum
    // 쿠폰 할인 금액: WON이면 고정값, RATIO이면 결제금액 × 할인율
    const couponAmt = coupon?.discountPolicy
        ? coupon.discountPolicy.discountType === 'WON'
            ? coupon.discountPolicy.discountValue
            : Math.floor(detail.totalAmount * coupon.discountPolicy.discountValue / 100)
        : 0

    return (
        <div style={{maxWidth: 640}}>

            {/* ── 헤더 ── */}
            <div style={header}>
                <button onClick={() => navigate(-1)} style={backBtn}>
                    <ArrowLeft size={16} style={{marginRight: 6}}/>
                    목록으로
                </button>
                <h2 style={pageTitle}>결제 상세</h2>
                <StatusBadge status={detail.status}/>
            </div>

            {/* ── 예매 번호 ── */}
            <div style={idBox}>
                <p style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>예매번호</p>
                <p style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    wordBreak: 'break-all'
                }}>
                    {detail.bookingId}
                </p>
            </div>

            {/* ── 예매 정보 카드 ── */}
            <div style={card}>
                <h3 style={cardTitle}>예매 정보</h3>
                <InfoRow label="영화" value={detail.movieTitle}/>
                <InfoRow label="상영관" value={detail.theaterName}/>
                <InfoRow label="일시" value={`${detail.date} ${detail.startTime}`}/>
                <InfoRow label="좌석" value={detail.seats.join(', ')}/>
                <InfoRow label="인원" value={`${detail.ticketCount}명`}/>
                <InfoRow label="고객" value={detail.phone}/>
            </div>

            {/* ── 결제 정보 카드 ── */}
            <div style={card}>
                <h3 style={cardTitle}>결제 정보</h3>
                <InfoRow label="결제수단" value={detail.paymentMethod === 'POINT' ? '포인트 전액' : '카드 결제'}/>
                <InfoRow label="결제일시" value={detail.paidAt.replace('T', ' ').slice(0, 16)}/>
                <InfoRow label="좌석 요금" value={`${detail.totalAmount.toLocaleString()}원`}/>

                {/* 쿠폰 할인 */}
                {coupon && (
                    <InfoRow
                        label="쿠폰 할인"
                        value={
                            <>
                                <span style={{marginRight: 8}}>{coupon.couponNum}</span>
                                {couponAmt > 0 && (
                                    <span style={{color: 'var(--color-success-main)'}}>
                    −{couponAmt.toLocaleString()}원
                                        {coupon.discountPolicy?.discountType === 'RATIO' && ` (${coupon.discountPolicy.discountValue}%)`}
                  </span>
                                )}
                            </>
                        }
                    />
                )}

                {/* 포인트 사용 */}
                {detail.pointUsed > 0 && (
                    <InfoRow
                        label="포인트 사용"
                        value={<span
                            style={{color: 'var(--color-success-main)'}}>−{detail.pointUsed.toLocaleString()}P</span>}
                    />
                )}

                {/* 구분선 */}
                <div style={{borderTop: '1px solid var(--border-default)', margin: '12px 0'}}/>

                {/* 최종 결제 금액 */}
                <InfoRow
                    label="최종 결제"
                    value={`${(detail.totalAmount - detail.pointUsed - couponAmt).toLocaleString()}원`}
                    highlight
                />
            </div>

            {/* ── 포인트 적립 카드 ── */}
            {detail.pointEarned > 0 && (
                <div style={{
                    ...card,
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-text)'
                }}>
                    <h3 style={{...cardTitle, color: 'var(--color-success-main)'}}>포인트 적립</h3>
                    <InfoRow label="적립 포인트" value={`+${detail.pointEarned.toLocaleString()}P`}/>
                </div>
            )}

        </div>
    )
}

/* ── 스타일 ── */
const centered: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 300,
}
const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
}
const pageTitle: React.CSSProperties = {
    fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, flex: 1,
}
const backBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: '8px 14px', background: 'var(--bg-base)',
    border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
}
const idBox: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 10,
    padding: '14px 18px', marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const card: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12,
    padding: '18px 20px', marginBottom: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const cardTitle: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)',
    marginBottom: 14, textTransform: 'uppercase' as const, letterSpacing: 0.5,
}
const infoRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid var(--border-subtle)',
}
const infoLabel: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0, minWidth: 90,
}
const infoValue: React.CSSProperties = {
    fontSize: 14, color: 'var(--text-primary)', textAlign: 'right' as const,
}

export default PaymentLogDetailPage
