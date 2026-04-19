/**
 * PaymentResultPage.tsx — 결제 완료 화면
 *
 * 진입 방식:
 *  - 카드 결제: Toss가 /payment/result?paymentKey=...&orderId=...&amount=... 로 리다이렉트
 *  - 포인트 전액: PaymentPage에서 직접 navigate('/payment/result?...')
 *
 * 처리 흐름:
 *  1. localStorage에서 pending_booking_data 복원
 *  2. paymentKey, orderId, amount를 querystring에서 읽어 POST /api/payment/confirm 호출
 *     (포인트 전액은 paymentKey='point' → 별도 처리)
 *  3. 확인 성공 → 완료 상태 표시, 영수증 출력 / 모바일 발송 가능
 *  4. 영수증 출력 또는 모바일 발송 버튼을 누르면 완료 모달 표시 + 5초 카운트다운
 *     (이전: 결제 확인 즉시 모달 → 자동 이동. 변경: 사용자가 버튼을 눌러야 모달 표시)
 *
 * 백엔드 POST /api/payment/confirm 요청 형태:
 *  {
 *    payType, paymentKey, orderId, amount,
 *    phone,   scheduleId ({ scheduleId: id } 중첩 구조),
 *    seats,   usePoint,  couponNum,
 *  }
 *  ※ bonusPolicyId 불필요 — 백엔드 PaymentConfirmServiceImpl이 getActiveBonusPolicy()로 내부 자동 조회
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle, Gift, Ticket, Printer,
  Smartphone, X, Info, Loader2
} from 'lucide-react'
import apiClient from '../../api/apiClient'

/* ── 인원 타입 라벨 (mockData 대체 인라인) ── */
const PERSON_TYPES: { type: string; label: string }[] = [
  { type: 'adult',  label: '성인'   },
  { type: 'teen',   label: '청소년' },
  { type: 'child',  label: '유아'   },
  { type: 'senior', label: '경로'   },
]

/** 전화번호 포맷 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function PaymentResultPage() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()

  /* ── localStorage에서 결제 진행 데이터 복원 ── */
  const [bookingData, setBookingData] = useState<any>(() => {
    const saved = localStorage.getItem('pending_booking_data')
    return saved ? JSON.parse(saved) : null
  })

  // 결제 확인 진행 상태
  const [confirming,    setConfirming]    = useState(false)
  const [confirmError,  setConfirmError]  = useState('')
  const [confirmed,     setConfirmed]     = useState(false) // 결제 확인 완료 여부 (true이면 결과 화면 표시)

  // 카운트다운 모달
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [countdown,     setCountdown]     = useState(5)

  // 모바일 영수증 모달
  const [showMobileModal, setShowMobileModal] = useState(false)
  const [mobilePhoneRaw,  setMobilePhoneRaw]  = useState('')
  const [mobileSending,   setMobileSending]   = useState(false)

  const hasConfirmed = useRef(false)

  /* ── 결제 확인 로직 ── */
  useEffect(() => {
    if (hasConfirmed.current || !bookingData) return

    const paymentKey = searchParams.get('paymentKey')
    const orderId    = searchParams.get('orderId')
    const amount     = searchParams.get('amount')

    if (!orderId) return  // querystring 없으면 대기

    hasConfirmed.current = true
    setConfirming(true)

    const confirmPayment = async () => {
      try {
        /**
         * POST /api/payment/confirm
         *
         * bonusPolicyId는 전송하지 않음.
         * 백엔드 PaymentConfirmServiceImpl이 getActiveBonusPolicy()로 내부 자동 조회.
         * (기존엔 프론트에서 /admin/bonus-policy/list → 401, /bonus-policy/active → 404 문제)
         */
        await apiClient.post('/payment/confirm', {
          payType:    bookingData.payMethod,   // 'CARD' | 'POINT'
          orderId,
          paymentKey: paymentKey ?? 'point',
          amount:     Number(amount ?? 0),
          phone:      bookingData.phone,
          // 백엔드 파싱: requestData.path("scheduleId").path("scheduleId").asLong()
          // → 중첩 객체로 감싸서 전송해야 정확히 파싱됨
          scheduleId: { scheduleId: bookingData.schedule?.id ?? bookingData.schedule?.scheduleId ?? 0 },
          seats:      bookingData.selectedSeats,
          usePoint:   bookingData.pointUsed ?? 0,
          couponNum:  bookingData.couponNum ?? '',  // 쿠폰 없으면 빈 문자열
        })

        // 성공 → 최종 데이터 업데이트
        setBookingData((prev: any) => ({
          ...prev,
          bookingId:  orderId,
          paymentKey: paymentKey ?? 'point',
        }))
        setConfirmed(true)
        // ⚠️ 여기서 setShowDoneModal(true) 호출하지 않음!
        // 결제 확인이 완료되면 결과 화면을 보여주되, 자동으로 홈으로 이동하지 않는다.
        // 사용자가 "영수증 출력" 또는 "모바일 영수증" 버튼을 눌렀을 때만 완료 모달이 뜸.
        // 바로 홈으로 가고 싶은 사용자는 "홈으로 돌아가기" 버튼을 누르면 됨.
        localStorage.removeItem('pending_booking_data')
        localStorage.removeItem('ws_user_id')
      } catch (err: any) {
        console.error('[PaymentResultPage] 결제 확인 실패', err)
        setConfirmError('결제 확인 중 오류가 발생했습니다. 고객센터에 문의해 주세요.')
      } finally {
        setConfirming(false)
      }
    }

    void confirmPayment()
  }, [searchParams, bookingData])

  /* ── 카운트다운 (완료 모달 표시 시) ── */
  useEffect(() => {
    if (!showDoneModal) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showDoneModal, navigate])

  /* ── 예약 데이터 없음 ── */
  if (!bookingData) {
    return (
      <div style={{ ...pageWrap, paddingTop: 100, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>결제 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  /* ── 결제 확인 중 (로딩) ── */
  if (confirming) {
    return (
      <div style={{ ...pageWrap, paddingTop: 100, textAlign: 'center' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-brand-default)' }} />
        <p style={{ marginTop: 20, color: 'var(--text-secondary)', fontSize: 18 }}>
          결제를 확인하는 중입니다...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── 오류 ── */
  if (confirmError) {
    return (
      <div style={{ ...pageWrap, paddingTop: 60, textAlign: 'center' }}>
        <p style={{ color: '#e03c3c', fontSize: 18, marginBottom: 24 }}>{confirmError}</p>
        <button onClick={() => navigate('/')} style={goHomeBtn}>홈으로 돌아가기</button>
      </div>
    )
  }

  /* ── 데이터 추출 ── */
  const {
    bookingId            = '',
    movieTitle           = '',
    schedule             = {},
    selectedSeats        = [],
    persons              = {},
    finalAmount          = 0,
    pointUsed            = 0,
    pointEarned          = 0,
    payMethod            = 'CARD',
    totalAmount          = 0,
    phone: authPhone     = '',
    couponNum            = '',
    couponDiscountAmount = 0,   // 실제 할인 금액 (CouponDTO 반환 시 계산됨, 없으면 0)
  } = bookingData

  const methodLabel = payMethod === 'POINT' ? '포인트 전액' : '카드 결제'

  /* ── 영수증 출력 ── */
  const handlePrint = () => {
    const personStr = PERSON_TYPES
      .filter(({ type }) => (persons[type] ?? 0) > 0)
      .map(({ type, label }) => `${label} ${persons[type]}명`)
      .join(', ') || '–'

    const issuedAt = new Date().toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/><title>영수증 — CineOS</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Courier New',monospace; font-size:13px; color:#111; background:#fff;
       max-width:320px; margin:0 auto; padding:28px 20px; }
.logo { font-size:26px; font-weight:900; letter-spacing:6px; text-align:center; }
.logo-sub { font-size:10px; letter-spacing:2px; text-align:center; color:#555; margin-top:3px; margin-bottom:18px; }
.booking-id { border:1px solid #111; text-align:center; padding:8px 0; font-size:15px; font-weight:bold; letter-spacing:3px; margin-bottom:16px; }
.divider { border-top:1px dashed #888; margin:12px 0; }
.divider-solid { border-top:2px solid #111; margin:12px 0; }
.row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; gap:8px; }
.label { color:#555; white-space:nowrap; flex-shrink:0; }
.value { text-align:right; font-weight:600; word-break:keep-all; }
.row-total { display:flex; justify-content:space-between; font-size:15px; font-weight:900; margin-bottom:5px; }
.footer { text-align:center; margin-top:20px; font-size:11px; color:#555; line-height:1.8; }
@media print { body { max-width:100%; padding:0 4mm; } @page { size:80mm auto; margin:4mm 0; } }
</style></head><body>
<div class="logo">CineOS</div>
<div class="logo-sub">CINEMA TICKET RECEIPT</div>
<div class="booking-id">${bookingId}</div>
<div class="row"><span class="label">영화</span><span class="value">${movieTitle}</span></div>
<div class="row"><span class="label">날짜</span><span class="value">${schedule?.date ?? '–'}</span></div>
<div class="row"><span class="label">시간</span><span class="value">${schedule?.startTime ?? '–'} ~ ${schedule?.endTime ?? '–'}</span></div>
<div class="row"><span class="label">상영관</span><span class="value">${schedule?.theaterName ?? '–'}</span></div>
<div class="row"><span class="label">좌석</span><span class="value">${selectedSeats.join(', ')}</span></div>
<div class="row"><span class="label">인원</span><span class="value">${personStr}</span></div>
<div class="divider"></div>
<div class="row"><span class="label">좌석 요금</span><span class="value">${totalAmount.toLocaleString()}원</span></div>
${pointUsed > 0 ? `<div class="row"><span class="label">포인트 사용</span><span class="value">−${pointUsed.toLocaleString()}원</span></div>` : ''}
${couponNum
  ? `<div class="row"><span class="label">쿠폰</span><span class="value">${couponNum}${couponDiscountAmount > 0 ? ` (−${Number(couponDiscountAmount).toLocaleString()}원)` : ''}</span></div>`
  : ''}
<div class="divider-solid"></div>
<div class="row-total"><span>결제 금액</span><span>${finalAmount.toLocaleString()}원</span></div>
<div class="row"><span class="label">결제 수단</span><span class="value">${methodLabel}</span></div>
${pointEarned > 0 ? `<div class="divider"></div><div class="row"><span class="label">적립 포인트</span><span class="value">+${pointEarned.toLocaleString()}P (즉시 적립)</span></div>` : ''}
<div class="divider"></div>
<div class="footer"><div>발행일시: ${issuedAt}</div><div style="margin-top:10px;font-size:13px;font-weight:bold;color:#111;">즐거운 관람 되세요!</div></div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body></html>`

    const win = window.open('', '_blank', 'width=420,height=700,scrollbars=yes')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
    setCountdown(5)
    setShowDoneModal(true)
  }

  /* ── 모바일 영수증 ── */
  const handleMobileClick = () => {
    if (authPhone) {
      setMobileSending(true)
      setTimeout(() => {
        setMobileSending(false)
        setCountdown(5)
        setShowDoneModal(true)
      }, 800)
    } else {
      setMobilePhoneRaw('')
      setShowMobileModal(true)
    }
  }

  const handleMobileSend = () => {
    if (mobilePhoneRaw.length < 10) return
    setMobileSending(true)
    setTimeout(() => {
      setMobileSending(false)
      setShowMobileModal(false)
      setCountdown(5)
      setShowDoneModal(true)
    }, 800)
  }

  /* ── 메인 렌더 ── */
  return (
    <div style={pageWrap}>

      {/* 완료 모달 */}
      {showDoneModal && (
        <div style={modalOverlay}>
          <div style={doneModalBox}>
            <CheckCircle size={64} color="#00ad74" strokeWidth={1.5} style={{ marginBottom: 20 }} />
            <h3 style={doneTitle}>감사합니다!</h3>
            <p style={doneDesc}>
              즐거운 관람 되세요. 🎬<br />
              언제든 CineOS를 찾아 주세요.
            </p>
            {authPhone && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                {formatPhone(authPhone)} 으로 영수증이 발송되었습니다.
              </p>
            )}
            <div style={countdownBox}>
              <span style={countdownNum}>{countdown}</span>
              <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>초 후 홈으로 이동합니다</span>
            </div>
            <button onClick={() => navigate('/')} style={goHomeBtn}>지금 홈으로</button>
          </div>
        </div>
      )}

      {/* 모바일 영수증 모달 */}
      {showMobileModal && (
        <div style={modalOverlay}>
          <div style={mobileModalBox}>
            <button onClick={() => setShowMobileModal(false)} style={modalCloseBtn} aria-label="닫기">
              <X size={20} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Smartphone size={44} color="var(--color-brand-default)" style={{ marginBottom: 12 }} />
              <h3 style={mobileModalTitle}>모바일 영수증</h3>
              <p style={mobileModalDesc}>영수증을 받을 번호를 확인해 주세요.</p>
            </div>
            <input
              type="tel"
              value={formatPhone(mobilePhoneRaw)}
              onChange={(e) => { const r = e.target.value.replace(/\D/g,'').slice(0,11); setMobilePhoneRaw(r) }}
              placeholder="010-0000-0000"
              style={mobileInput}
              maxLength={13}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, marginTop: 8 }}>
              <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              입력한 번호로 예매 확인 문자가 발송됩니다.
            </p>
            <button
              onClick={handleMobileSend}
              disabled={mobileSending || mobilePhoneRaw.length < 10}
              style={{ ...sendBtn, opacity: (mobileSending || mobilePhoneRaw.length < 10) ? 0.6 : 1 }}
            >
              {mobileSending ? '발송 중...' : '발송하기'}
            </button>
          </div>
        </div>
      )}

      {/* 성공 아이콘 */}
      <div style={{ marginBottom: 20 }}>
        <CheckCircle size={72} color="#00ad74" strokeWidth={1.5} />
      </div>
      <h2 style={mainTitle}>예매가 완료되었습니다!</h2>
      <p style={subTitle}>소중한 이용에 감사드립니다.</p>

      {/* 예매 번호 */}
      <div style={bookingIdBox}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          <Ticket size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          예매 번호
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-default)', margin: 0, letterSpacing: 2 }}>
          {bookingId || '확인 중...'}
        </p>
      </div>

      {/* 예매 상세 */}
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
          <dd style={dd}>{selectedSeats.join(', ')}</dd>
          <dt style={dt}>인원</dt>
          <dd style={dd}>
            {PERSON_TYPES.filter(({ type }) => (persons[type] ?? 0) > 0)
              .map(({ type, label }) => `${label} ${persons[type]}명`)
              .join(', ') || '–'}
          </dd>
        </dl>
      </div>

      {/* 결제 정보 */}
      <div style={card}>
        <h3 style={cardTitle}>결제 정보</h3>
        <div style={priceRow}>
          <span>좌석 요금</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
        {pointUsed > 0 && (
          <div style={{ ...priceRow, color: '#00ad74' }}>
            <span>포인트 사용</span>
            <span>−{pointUsed.toLocaleString()}원</span>
          </div>
        )}
        {/* 쿠폰 할인 표시
            couponDiscountAmount > 0 이면 실제 차감 금액 표시
            0이면 백엔드가 할인 처리 (현재 boolean만 반환하는 경우) */}
        {couponNum && (
          <div style={{ ...priceRow, color: '#00ad74' }}>
            <span>쿠폰 ({couponNum})</span>
            <span>
              {couponDiscountAmount > 0
                ? `−${Number(couponDiscountAmount).toLocaleString()}원`
                : '할인 적용됨'}
            </span>
          </div>
        )}
        <div style={{ ...priceRow, borderTop: '1px solid var(--border-default)', paddingTop: 12, marginTop: 8, fontWeight: 700, fontSize: 17 }}>
          <span>결제 금액</span>
          <span>{finalAmount.toLocaleString()}원</span>
        </div>
        <div style={{ ...priceRow, marginTop: 6 }}>
          <span>결제 수단</span>
          <span>{methodLabel}</span>
        </div>
      </div>

      {/* 포인트 적립 안내 */}
      {pointEarned > 0 && (
        <div style={{ ...card, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Gift size={32} color="var(--color-success-light)" strokeWidth={1.5} />
            <div>
              <p style={{ fontSize: 14, color: 'var(--color-success-light)', marginBottom: 4 }}>
                포인트 즉시 적립 완료
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success-light)', margin: 0 }}>
                +{pointEarned.toLocaleString()}P
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                결제 금액의 5% 적립 · 즉시 사용 가능
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 영수증 버튼 — 누르면 완료 모달(+5초 카운트다운) 표시 */}
      <div style={btnRow}>
        <button
          onClick={handlePrint}
          disabled={!confirmed}
          style={{ ...receiptBtn, opacity: confirmed ? 1 : 0.5 }}
        >
          <Printer size={22} style={{ marginBottom: 8 }} />
          영수증 출력
        </button>
        <button
          onClick={handleMobileClick}
          disabled={mobileSending || !confirmed}
          style={{ ...mobileBtn, opacity: (mobileSending || !confirmed) ? 0.6 : 1 }}
        >
          <Smartphone size={22} style={{ marginBottom: 8 }} />
          {mobileSending ? '발송 중...' : '모바일 영수증'}
        </button>
      </div>

      {/* 영수증 없이 바로 홈으로 이동하고 싶은 사용자를 위한 버튼
          영수증 버튼들 아래에 위치 — 결제 확인 완료 후에만 활성화 */}
      <button
        onClick={() => navigate('/')}
        disabled={!confirmed}
        style={{
          ...goHomeBtn,
          marginTop: 12,
          width: '100%',
          opacity: confirmed ? 1 : 0.4,
          cursor: confirmed ? 'pointer' : 'not-allowed',
        }}
      >
        홈으로 돌아가기
      </button>

    </div>
  )
}

/* ── 스타일 ─────────────────────────────────────────────────── */
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px',
}
const doneModalBox: React.CSSProperties = {
  width: '100%', maxWidth: 460, background: 'var(--bg-surface)',
  borderRadius: 24, padding: '52px 40px 44px',
  textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}
const doneTitle: React.CSSProperties = { fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }
const doneDesc: React.CSSProperties  = { fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }
const countdownBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px',
  background: 'var(--bg-base)', border: '1px solid var(--border-default)',
  borderRadius: 14, marginBottom: 20,
}
const countdownNum: React.CSSProperties = {
  fontSize: 36, fontWeight: 900, color: 'var(--color-brand-default)',
  lineHeight: 1, minWidth: 28, textAlign: 'center',
}
const goHomeBtn: React.CSSProperties = {
  padding: '14px 40px', background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 12, color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer',
}
const mobileModalBox: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 480,
  background: 'var(--bg-surface)', borderRadius: 20, padding: '40px 36px 32px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
}
const modalCloseBtn: React.CSSProperties = {
  position: 'absolute', top: 16, right: 16,
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer', padding: 6, lineHeight: 0,
}
const mobileModalTitle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }
const mobileModalDesc: React.CSSProperties  = { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }
const mobileInput: React.CSSProperties      = {
  width: '100%', padding: '16px 18px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 12,
  color: 'var(--text-primary)', fontSize: 18, outline: 'none',
  boxSizing: 'border-box', textAlign: 'center', letterSpacing: 2,
}
const sendBtn: React.CSSProperties = {
  display: 'block', width: '100%', padding: '18px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: 'pointer',
}
const pageWrap: React.CSSProperties  = { maxWidth: 560, margin: '0 auto', padding: '40px 40px 80px', textAlign: 'center' }
const mainTitle: React.CSSProperties = { fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }
const subTitle: React.CSSProperties  = { fontSize: 16, color: 'var(--text-secondary)', marginBottom: 28 }
const bookingIdBox: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 14, padding: '18px 28px',
  marginBottom: 24, display: 'inline-block', minWidth: 280,
}
const card: React.CSSProperties      = { background: 'var(--bg-surface)', borderRadius: 16, padding: '20px 24px', marginBottom: 16, textAlign: 'left' }
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }
const dl: React.CSSProperties        = { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '10px 14px' }
const dt: React.CSSProperties        = { color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }
const dd: React.CSSProperties        = { color: 'var(--text-secondary)', fontSize: 14, margin: 0 }
const priceRow: React.CSSProperties  = { display: 'flex', justifyContent: 'space-between', fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }
const btnRow: React.CSSProperties    = { display: 'flex', gap: 14, marginTop: 8 }
const receiptBtn: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '22px 0', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 16, color: 'var(--text-secondary)', fontSize: 15, cursor: 'pointer',
  gap: 0, transition: 'background 0.15s',
}
const mobileBtn: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '22px 0', background: 'var(--color-brand-default)',
  border: 'none',
  borderRadius: 16, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  gap: 0, transition: 'opacity 0.15s',
}

export default PaymentResultPage