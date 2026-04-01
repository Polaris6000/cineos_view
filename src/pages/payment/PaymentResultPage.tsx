/**
 * PaymentResultPage.jsx — 결제 완료 / 포인트 적립
 *
 * 동작:
 *  - 예매 번호, 영화 정보, 좌석, 결제 금액, 포인트 적립 내역 표시
 *  - QR코드 영역 (플레이스홀더)
 *  - 홈으로 돌아가기 버튼
 *
 * 변경사항:
 *  - 이모지 제거 → Lucide 아이콘 사용
 *  - 반말 → 존댓말
 *
 * state 수신: PaymentPage 에서 넘겨받은 전체 예매 정보
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, QrCode, Gift, Home, Ticket } from 'lucide-react'
import { PERSON_TYPES, PAYMENT_METHODS } from '../../api/mockData'

function PaymentResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state    = location.state ?? {}

  const {
    bookingId, movieTitle, schedule, selectedSeats, persons = {},
    totalPersons, finalAmount, pointUsed, pointEarned,
    payMethod, totalAmount,
  } = state

  if (!bookingId) {
    navigate('/')
    return null
  }

  // 결제 수단 레이블 (포인트 전액 결제 포함)
  const methodLabel = payMethod === 'POINT'
    ? '포인트 전액'
    : PAYMENT_METHODS.find((m) => m.id === payMethod)?.label ?? payMethod

  return (
    <div style={pageWrap}>

      {/* ── 성공 아이콘 ── */}
      <div style={successIconWrap}>
        <CheckCircle size={72} color="#00ad74" strokeWidth={1.5} />
      </div>
      <h2 style={mainTitle}>예매가 완료되었습니다!</h2>
      <p style={subTitle}>소중한 이용에 감사드립니다.</p>

      {/* ── 예매 번호 ── */}
      <div style={bookingIdBox}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          <Ticket size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          예매 번호
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-default)', margin: 0, letterSpacing: 2 }}>
          {bookingId}
        </p>
      </div>

      {/* ── QR 코드 플레이스홀더 ── */}
      <div style={qrBox}>
        <div style={qrPlaceholder}>
          <QrCode size={64} color="var(--text-muted)" strokeWidth={1} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>QR 코드 준비 중</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, textAlign: 'center' }}>
          입장 시 QR 코드를 스캔해 주세요.
        </p>
      </div>

      {/* ── 예매 상세 ── */}
      <div style={card}>
        <h3 style={cardTitle}>예매 상세</h3>
        <dl style={dl}>
          <dt style={dt}>영화</dt>
          <dd style={dd}>{movieTitle}</dd>

          <dt style={dt}>일시</dt>
          <dd style={dd}>{schedule?.date} {schedule?.startTime} ~ {schedule?.endTime}</dd>

          <dt style={dt}>상영관</dt>
          <dd style={dd}>{schedule?.theaterName}</dd>

          <dt style={dt}>좌석</dt>
          <dd style={dd}>{(selectedSeats ?? []).join(', ')}</dd>

          <dt style={dt}>인원</dt>
          <dd style={dd}>
            {PERSON_TYPES.filter(({ type }) => (persons[type] ?? 0) > 0)
              .map(({ type, label }) => `${label} ${persons[type]}명`)
              .join(', ')}
          </dd>
        </dl>
      </div>

      {/* ── 결제 정보 ── */}
      <div style={card}>
        <h3 style={cardTitle}>결제 정보</h3>
        <div style={priceRow}>
          <span>좌석 요금</span>
          <span>{(totalAmount ?? 0).toLocaleString()}원</span>
        </div>
        {(pointUsed ?? 0) > 0 && (
          <div style={{ ...priceRow, color: '#00ad74' }}>
            <span>포인트 사용</span>
            <span>−{pointUsed.toLocaleString()}원</span>
          </div>
        )}
        <div style={{ ...priceRow, borderTop: '1px solid var(--border-default)', paddingTop: 12, marginTop: 8, fontWeight: 700, fontSize: 17 }}>
          <span>결제 금액</span>
          <span>{(finalAmount ?? 0).toLocaleString()}원</span>
        </div>
        <div style={{ ...priceRow, marginTop: 6 }}>
          <span>결제 수단</span>
          <span>{methodLabel}</span>
        </div>
      </div>

      {/* ── 포인트 적립 안내 ── */}
      <div style={{ ...card, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Gift size={32} color="var(--color-success-light)" strokeWidth={1.5} />
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-success-light)', marginBottom: 4 }}>
              포인트 적립 완료
            </p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success-light)', margin: 0 }}>
              +{(pointEarned ?? 0).toLocaleString()}P
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              결제 금액의 5% 적립 · 익일부터 사용 가능
            </p>
          </div>
        </div>
      </div>

      {/* ── 홈으로 버튼 ── */}
      <button onClick={() => navigate('/')} style={homeBtn}>
        <Home size={20} />
        홈으로 돌아가기
      </button>
    </div>
  )
}

/* ── 스타일 ── */
const pageWrap      = { maxWidth: 560, margin: '0 auto', padding: '40px 40px 80px', textAlign: 'center' }
const successIconWrap = { marginBottom: 20 }
const mainTitle     = { fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }
const subTitle      = { fontSize: 16, color: 'var(--text-secondary)', marginBottom: 28 }
const bookingIdBox  = {
  background: 'var(--bg-surface)', borderRadius: 14, padding: '18px 28px',
  marginBottom: 24, display: 'inline-block', minWidth: 280,
}
const qrBox         = { marginBottom: 28 }
const qrPlaceholder = {
  width: 180, height: 180, margin: '0 auto',
  background: 'var(--bg-surface)', borderRadius: 16,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  border: '2px dashed var(--border-default)',
}
const card          = {
  background: 'var(--bg-surface)', borderRadius: 16, padding: '20px 24px',
  marginBottom: 16, textAlign: 'left',
}
const cardTitle     = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }
const dl            = { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '10px 14px' }
const dt            = { color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }
const dd            = { color: 'var(--text-secondary)', fontSize: 14, margin: 0 }
const priceRow      = {
  display: 'flex', justifyContent: 'space-between',
  fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8,
}
const homeBtn       = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', padding: '22px 0', marginTop: 8,
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 16, fontSize: 20, fontWeight: 800, cursor: 'pointer',
}

export default PaymentResultPage
