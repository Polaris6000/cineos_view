/**
 * RefundPage.jsx — 환불 처리 (UC-17)
 *
 * 동작:
 *  1. 예매번호 또는 휴대폰 번호로 예매 조회
 *  2. 예매 정보 표시
 *  3. 결제 후 10분 이내이면 환불 버튼 활성화
 *  4. 10분 초과 → 환불 불가 안내
 *  5. 이미 환불된 건 → 환불 완료 표시
 *
 * TODO: GET /api/admin/bookings?bookingId= or ?phone= 연동
 *        POST /api/admin/refund 연동
 */
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { MOCK_BOOKINGS } from '../../../api/mockData'

function RefundPage() {
  const [query,   setQuery]   = useState('')   // 검색어 (예매번호 or 전화번호)
  const [result,  setResult]  = useState(null) // 조회된 예매
  const [error,   setError]   = useState('')
  const [refunded,setRefunded]= useState(false)
  const [loading, setLoading] = useState(false)

  /** 예매 조회 (예매번호 or 휴대폰) */
  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setRefunded(false)
    if (!query.trim()) { setError('예매번호 또는 휴대폰 번호를 입력해 주세요.'); return }

    setLoading(true)
    // TODO: GET /api/admin/bookings?q=query
    await new Promise((r) => setTimeout(r, 500))

    const found = MOCK_BOOKINGS.find(
      (b) => b.bookingId === query.trim() || b.phone === query.trim()
    )
    setLoading(false)

    if (!found) {
      setError('해당 예매 정보를 찾을 수 없습니다.')
    } else {
      setResult(found)
    }
  }

  /** 환불 처리 */
  const handleRefund = async () => {
    if (!result) return
    const ok = window.confirm(
      `예매번호 ${result.bookingId} 를 환불 처리하시겠습니까?\n` +
      `환불 금액: ${result.totalAmount.toLocaleString()}원\n\n계속 진행하시겠습니까?`
    )
    if (!ok) return

    setLoading(true)
    // TODO: POST /api/admin/refund { bookingId: result.bookingId }
    await new Promise((r) => setTimeout(r, 700))
    setLoading(false)
    setRefunded(true)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={pageTitle}>환불 처리</h2>

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} style={searchCard}>
        <p style={sLabel}>예매번호 또는 휴대폰 번호로 조회</p>
        <div style={searchRow}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: BK20260329001 또는 010-1234-5678"
            style={searchInput}
          />
          <button type="submit" disabled={loading} style={searchBtn}>
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
        {error && <p style={errorMsg}>{error}</p>}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          테스트: BK20260329001 (환불가능) / BK20260329002 (불가) / BK20260328010 (이미환불)
        </p>
      </form>

      {/* 조회 결과 */}
      {result && (
        <div style={resultCard}>
          {/* 예매 상태 배지 */}
          <div style={statusRow}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              예매 정보
            </h3>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: result.status === 'REFUNDED' ? 'var(--color-success-bg)' :
                          result.canRefund ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
              color: result.status === 'REFUNDED' ? 'var(--color-success-main)' :
                     result.canRefund ? 'var(--color-warning-text)' : 'var(--color-error-text)',
            }}>
              {result.status === 'REFUNDED' ? '환불 완료' :
               result.canRefund ? '환불 가능' : '환불 불가 (10분 초과)'}
            </span>
          </div>

          {/* 예매 상세 */}
          <dl style={dl}>
            <dt style={dt}>예매번호</dt>  <dd style={dd}>{result.bookingId}</dd>
            <dt style={dt}>휴대폰</dt>    <dd style={dd}>{result.phone}</dd>
            <dt style={dt}>영화</dt>      <dd style={dd}>{result.movieTitle}</dd>
            <dt style={dt}>상영관</dt>    <dd style={dd}>{result.theaterName}</dd>
            <dt style={dt}>일시</dt>      <dd style={dd}>{result.date} {result.startTime}</dd>
            <dt style={dt}>좌석</dt>      <dd style={dd}>{result.seats.join(', ')}</dd>
            <dt style={dt}>결제금액</dt>  <dd style={{ ...dd, fontWeight: 700 }}>
                                            {result.totalAmount.toLocaleString()}원
                                          </dd>
            <dt style={dt}>결제수단</dt>  <dd style={dd}>{result.paymentMethod}</dd>
            <dt style={dt}>결제일시</dt>  <dd style={dd}>{result.paidAt.replace('T', ' ')}</dd>
            {result.pointUsed > 0 && (
              <><dt style={dt}>포인트사용</dt><dd style={dd}>{result.pointUsed.toLocaleString()}P</dd></>
            )}
          </dl>

          {/* 환불 불가 안내 */}
          {!result.canRefund && result.status !== 'REFUNDED' && (
            <div style={warnBox}>
              ⚠️ 결제 후 10분이 경과하여 환불이 불가능합니다.
            </div>
          )}

          {/* 이미 환불됨 */}
          {(result.status === 'REFUNDED' || refunded) && (
            <div style={successBox}>
              <CheckCircle size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              환불 처리가 완료되었습니다.
            </div>
          )}

          {/* 환불 버튼 */}
          {result.status !== 'REFUNDED' && !refunded && result.canRefund && (
            <button onClick={handleRefund} disabled={loading} style={refundBtn}>
              {loading ? '처리 중...' : `${result.totalAmount.toLocaleString()}원 환불하기`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle   = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const searchCard  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }
const sLabel      = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }
const searchRow   = { display: 'flex', gap: 8 }
const searchInput = { flex: 1, padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8,
                      fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', outline: 'none' }
const searchBtn   = { padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap' }
const errorMsg    = { fontSize: 13, color: 'var(--color-error-main)', marginTop: 8 }
const resultCard  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const statusRow   = { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 16 }
const dl          = { display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px 12px',
                      marginBottom: 16 }
const dt          = { fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }
const dd          = { fontSize: 14, color: 'var(--text-primary)', margin: 0 }
const warnBox     = { padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
                      borderRadius: 8, color: 'var(--color-error-text)', fontSize: 13, marginBottom: 12 }
const successBox  = { padding: '12px 16px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-main)',
                      borderRadius: 8, color: 'var(--color-success-main)', fontSize: 13, fontWeight: 600 }
const refundBtn   = { display: 'block', width: '100%', padding: '14px 0',
                      background: 'var(--color-error-main)', color: '#fff', border: 'none',
                      borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer',
                      marginTop: 4 }

export default RefundPage
