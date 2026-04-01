/**
 * PaymentPage.tsx — 결제 처리
 *
 * 동작:
 *  - 결제 진입 시 포인트 적립 모달 팝업 (Y/N 선택)
 *    - Y: 회원 인증(전화번호 입력 → 인증번호 확인) 진행 → 인증 완료 시 포인트 사용 가능
 *    - N: 모달 닫고 바로 결제 수단 선택으로 이동
 *  - 포인트 사용: 결제 화면에서 사용할 포인트 직접 입력 → 적용
 *  - 결제 수단: 카드 / 간편결제 (현금 제거)
 *  - 전액 포인트 결제 시 결제 수단 선택 생략
 *  - 모달 닫힌 후 다시 열 수 있는 버튼 제공
 *  - 전역 1분 타이머 (CustomerLayout 에서 관리)
 *
 * state 수신: movieId, movieTitle, schedule, persons, totalPersons,
 *             selectedSeats, selectedSeatObjects, totalAmount, theater
 * TODO: POST /api/bookings/pay 연동
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Phone, CheckCircle, Coins,
  CreditCard, Wallet, Info, Gift, X
} from 'lucide-react'
import { PERSON_TYPES, PAYMENT_METHODS, SEAT_PRICES, SEAT_TYPE_LABEL } from '../../api/mockData'
import { useKeyboard } from '../../context/KeyboardContext'

/** 포인트 적립률 5% */
const POINT_RATE = 0.05

function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state    = location.state ?? {}
  const { openKeyboard } = useKeyboard()

  const {
    movieTitle, schedule,
    persons = {}, totalPersons = 0,
    selectedSeats = [],
    selectedSeatObjects = [],
    totalAmount = 0,
    theater,
  } = state

  if (!schedule) {
    navigate('/')
    return null
  }

  // ── 금액 계산 (SeatPage에서 좌석 단가 + 인원 할인 적용된 값 수신) ──
  const seatPriceTotal = selectedSeatObjects.reduce((acc, seat) => {
    return acc + (SEAT_PRICES[seat?.seatType] ?? SEAT_PRICES.NORMAL)
  }, 0)
  const discountTotal = PERSON_TYPES.reduce((acc, { type, discount }) => {
    return acc + (persons[type] ?? 0) * discount
  }, 0)
  const normalPrice = seatPriceTotal

  // ──────────────────────────────────────────────────
  // [포인트 적립 모달 상태]
  // showPointModal: 결제 진입 시 true → 팝업 표시
  // wantPoints: true=적립 원함(인증 진행) / false=적립 안함 / null=미선택
  // ──────────────────────────────────────────────────
  const [showPointModal, setShowPointModal] = useState(true)      // 진입 시 자동 오픈
  const [wantPoints,     setWantPoints]     = useState<boolean | null>(null)

  /**
   * 모달에서 "네, 적립할게요" 클릭
   * → wantPoints = true, 모달 닫고 인증 섹션 표시
   */
  const handleModalYes = () => {
    setWantPoints(true)
    setShowPointModal(false)
  }

  /**
   * 모달에서 "괜찮아요 (건너뛰기)" 클릭
   * → wantPoints = false, 모달 닫고 바로 결제 수단으로
   */
  const handleModalNo = () => {
    setWantPoints(false)
    setShowPointModal(false)
  }

  // ── 회원 인증 상태 ──
  const [phone,       setPhone]       = useState('')
  const [verifyCode,  setVerifyCode]  = useState('')
  const [isVerified,  setIsVerified]  = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [codeSent,    setCodeSent]    = useState(false)

  // ── 포인트 사용 상태 ──
  const [pointInput, setPointInput] = useState('')
  const [pointUsed,  setPointUsed]  = useState(0)

  // ── 결제 수단 ──
  const [payMethod, setPayMethod] = useState('CARD')

  // 최종 결제 금액
  const finalAmount = Math.max(totalAmount - pointUsed, 0)
  const pointEarned = Math.floor(finalAmount * POINT_RATE)
  const isFullPoint = finalAmount === 0

  /** 인증번호 발송 (더미) — TODO: POST /api/auth/send-code 연동 */
  const handleSendCode = () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setVerifyError('올바른 휴대폰 번호를 입력해 주세요.')
      return
    }
    setCodeSent(true)
    setVerifyError('')
  }

  /** 인증번호 확인 (더미 처리) — TODO: POST /api/auth/verify-code 연동 */
  const handleVerify = () => {
    if (verifyCode === '123456') {
      setIsVerified(true)
      setVerifyError('')
    } else {
      setVerifyError('인증번호가 올바르지 않습니다. (테스트: 123456)')
    }
  }

  /** 포인트 적용 */
  const handlePointApply = () => {
    const p = Number(pointInput)
    if (!p || p <= 0) return
    setPointUsed(Math.min(p, totalAmount))
  }

  /** 결제 완료 */
  const handlePay = () => {
    navigate('/payment/result', {
      state: {
        ...state,
        pointUsed,
        pointEarned,
        finalAmount,
        payMethod: isFullPoint ? 'POINT' : payMethod,
        bookingId: `BK${Date.now()}`,
      },
    })
  }

  return (
    <div style={pageWrap}>

      {/* ══════════════════════════════════════════════════
          [포인트 적립 모달]
          결제 진입 시 자동으로 표시.
          닫힌 후 하단 "포인트 적립 선택" 버튼으로 재오픈 가능.
          ══════════════════════════════════════════════════ */}
      {showPointModal && (
        /* 딤 오버레이 + 모달 중앙 배치 */
        <div style={modalOverlay}>
          <div style={modalBox}>
            {/* 닫기 버튼 (상단 우측) */}
            <button
              onClick={handleModalNo}
              style={modalCloseBtn}
              aria-label="모달 닫기"
            >
              <X size={20} />
            </button>

            {/* 아이콘 + 타이틀 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Gift size={48} color="var(--color-brand-default)" style={{ marginBottom: 12 }} />
              <h3 style={modalTitle}>포인트 적립하시겠어요?</h3>
              <p style={modalDesc}>
                결제 금액의 5%가 포인트로 적립됩니다.<br />
                회원 인증 후 포인트를 사용하실 수도 있습니다.
              </p>
            </div>

            {/* 선택 버튼 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={handleModalYes} style={modalBtnYes}>
                네, 적립할게요
              </button>
              <button onClick={handleModalNo} style={modalBtnNo}>
                괜찮아요 (건너뛰기)
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 style={pageTitle}>결제</h2>

      {/* ── 예매 요약 ── */}
      <div style={card}>
        <h3 style={cardTitle}>예매 정보</h3>
        <dl style={dl}>
          <dt style={dt}>영화</dt>    <dd style={dd}>{movieTitle}</dd>
          <dt style={dt}>일시</dt>    <dd style={dd}>{schedule.date} {schedule.startTime} ~ {schedule.endTime}</dd>
          <dt style={dt}>상영관</dt>  <dd style={dd}>{schedule.theaterName}</dd>
          <dt style={dt}>좌석</dt>    <dd style={dd}>{selectedSeats.join(', ')}</dd>
          <dt style={dt}>인원</dt>
          <dd style={dd}>
            {PERSON_TYPES.filter(({ type }) => (persons[type] ?? 0) > 0)
              .map(({ type, label }) => `${label} ${persons[type]}명`)
              .join(', ')}
          </dd>
        </dl>
      </div>

      {/* ── 금액 계산 ── */}
      <div style={card}>
        <h3 style={cardTitle}>금액</h3>
        <div style={priceRow}>
          <span>좌석 요금</span>
          <span>{normalPrice.toLocaleString()}원</span>
        </div>
        {discountTotal > 0 && (
          <div style={{ ...priceRow, color: '#00ad74' }}>
            <span>인원 할인</span>
            <span>−{discountTotal.toLocaleString()}원</span>
          </div>
        )}
        {/* 좌석 타입 상세 (할인 전 분류별) */}
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          {selectedSeatObjects.length > 0 && (() => {
            const byType: Record<string, number> = {}
            selectedSeatObjects.forEach((s) => {
              const t = s?.seatType ?? 'NORMAL'
              byType[t] = (byType[t] ?? 0) + 1
            })
            return Object.entries(byType).map(([type, cnt]) => (
              <div key={type} style={{ ...priceRow, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{SEAT_TYPE_LABEL[type] ?? '일반'} {cnt}석</span>
                <span>{((SEAT_PRICES[type] ?? SEAT_PRICES.NORMAL) * cnt).toLocaleString()}원</span>
              </div>
            ))
          })()}
        </div>
        {pointUsed > 0 && (
          <div style={{ ...priceRow, color: '#00ad74' }}>
            <span>포인트 사용</span>
            <span>−{pointUsed.toLocaleString()}원</span>
          </div>
        )}
        <div style={{ ...priceRow, borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>최종 결제 금액</span>
          <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--color-brand-default)' }}>
            {finalAmount.toLocaleString()}원
          </span>
        </div>
        {/* 포인트 적립 선택 시 적립 예정 표시 */}
        {wantPoints && (
          <p style={{ fontSize: 13, color: '#00ad74', marginTop: 8 }}>
            적립 예정 포인트: {pointEarned.toLocaleString()}P
          </p>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          [포인트 적립/사용 섹션]
          wantPoints = true 일 때만 표시 (모달에서 Y 선택)
          wantPoints = false 이면 숨김
          ────────────────────────────────────────────── */}
      {wantPoints === true && (
        <>
          {/* ── 회원 인증 ── */}
          <div style={card}>
            <h3 style={cardTitle}>
              <Phone size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              회원 인증
            </h3>

            {isVerified ? (
              /* 인증 완료 */
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#00ad74', fontSize: 15, fontWeight: 600 }}>
                <CheckCircle size={20} />
                인증 완료! 포인트를 사용하실 수 있습니다.
              </div>
            ) : (
              /* 인증 진행 폼 */
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 14 }}>
                  휴대폰 번호로 인증해 주세요. (없으면 자동 가입)
                </p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={(e) => openKeyboard(e.target, phone, setPhone, 'numeric')}
                    placeholder="010-0000-0000"
                    style={inputStyle}
                    maxLength={13}
                  />
                  <button onClick={handleSendCode} style={smallBtn}>
                    인증번호 발송
                  </button>
                </div>
                {codeSent && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      onFocus={(e) => openKeyboard(e.target, verifyCode, setVerifyCode, 'numeric')}
                      placeholder="인증번호 6자리"
                      style={inputStyle}
                      maxLength={6}
                    />
                    <button onClick={handleVerify} style={smallBtn}>확인</button>
                  </div>
                )}
                {verifyError && (
                  <p style={{ color: '#e03c3c', fontSize: 13 }}>{verifyError}</p>
                )}
                {!codeSent && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    테스트 인증번호: 123456
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── 포인트 사용 (인증 완료 시에만 표시) ── */}
          {isVerified && (
            <div style={card}>
              <h3 style={cardTitle}>
                <Coins size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                포인트 사용
              </h3>
              {pointUsed > 0 ? (
                <div style={{ color: '#00ad74', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} />
                  {pointUsed.toLocaleString()}P 적용 완료
                  <button
                    onClick={() => { setPointUsed(0); setPointInput('') }}
                    style={{ ...cancelBtn, marginLeft: 'auto' }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    value={pointInput}
                    onChange={(e) => setPointInput(e.target.value)}
                    onFocus={(e) => openKeyboard(e.target, pointInput, setPointInput, 'numeric')}
                    placeholder="사용할 포인트 입력"
                    style={inputStyle}
                    min={0}
                  />
                  <button onClick={handlePointApply} style={smallBtn}>적용</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────
          [포인트 적립 다시 선택 버튼]
          모달이 닫힌 후(wantPoints !== null) 하단에 작게 표시
          클릭 시 모달 재오픈
          ────────────────────────────────────────────── */}
      {!showPointModal && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowPointModal(true)}
            style={reopenBtn}
          >
            <Gift size={15} style={{ marginRight: 6 }} />
            포인트 적립 선택 다시 하기
          </button>
        </div>
      )}

      {/* ── 결제 수단 (전액 포인트가 아닐 때만 표시) ── */}
      {!isFullPoint && (
        <div style={card}>
          <h3 style={cardTitle}>
            <CreditCard size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            결제 수단
          </h3>
          <div style={methodGrid}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                style={{
                  ...methodBtn,
                  ...(payMethod === m.id ? methodBtnActive : {}),
                }}
              >
                <Wallet size={18} style={{ marginBottom: 6 }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 결제 버튼 ── */}
      <div style={{ marginTop: 16 }}>
        <button onClick={handlePay} style={payBtn}>
          {isFullPoint
            ? '포인트로 결제하기'
            : `${finalAmount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  )
}

/* ── 스타일 ── */

/* 모달 딤 오버레이 — fixed로 전체 화면 덮음 */
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0, 0, 0, 0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 40px',
}
/* 모달 박스 */
const modalBox: React.CSSProperties = {
  position: 'relative',
  width: '100%', maxWidth: 520,
  background: 'var(--bg-surface)',
  borderRadius: 20, padding: '40px 36px 32px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
}
const modalCloseBtn: React.CSSProperties = {
  position: 'absolute', top: 16, right: 16,
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer', padding: 6, lineHeight: 0,
}
const modalTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800,
  color: 'var(--text-primary)', marginBottom: 12,
}
const modalDesc: React.CSSProperties = {
  fontSize: 15, color: 'var(--text-secondary)',
  lineHeight: 1.7, margin: 0,
}
/* 모달 Y 버튼 — 강조 */
const modalBtnYes: React.CSSProperties = {
  display: 'block', width: '100%', padding: '20px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 14,
  fontSize: 18, fontWeight: 800, cursor: 'pointer',
}
/* 모달 N 버튼 — 서브 */
const modalBtnNo: React.CSSProperties = {
  display: 'block', width: '100%', padding: '16px 0',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 14, color: 'var(--text-muted)',
  fontSize: 16, fontWeight: 600, cursor: 'pointer',
}

/* 포인트 모달 재오픈 버튼 — 작고 서브텍스트 스타일 */
const reopenBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '10px 18px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 10, color: 'var(--text-secondary)',
  fontSize: 14, cursor: 'pointer',
}

const pageWrap  = { maxWidth: 680, margin: '0 auto', padding: '32px 40px 80px' }
const pageTitle = { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const card      = { background: 'var(--bg-surface)', borderRadius: 16, padding: '22px 24px', marginBottom: 18 }
const cardTitle = { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }
const dl        = { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '10px 14px' }
const dt        = { color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }
const dd        = { color: 'var(--text-secondary)', fontSize: 14, margin: 0 }
const priceRow  = {
  display: 'flex', justifyContent: 'space-between',
  fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8,
}
const inputStyle = {
  flex: 1, width: '100%', padding: '14px 16px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 10, color: 'var(--text-primary)',
  fontSize: 16, outline: 'none', boxSizing: 'border-box',
}
const smallBtn  = {
  padding: '14px 20px',
  background: 'var(--color-brand-default)', color: 'var(--primitive-neutral-900)',
  border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
}
const cancelBtn = {
  padding: '8px 16px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 8, color: 'var(--text-secondary)',
  fontSize: 14, cursor: 'pointer',
}
const methodGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
}
const methodBtn  = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '20px 0',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, color: 'var(--text-secondary)',
  fontSize: 15, cursor: 'pointer',
}
const methodBtnActive = {
  borderColor: 'var(--color-brand-default)',
  color: 'var(--color-brand-default)',
  background: 'rgba(255,184,0,0.08)',
  fontWeight: 700,
}
const payBtn    = {
  display: 'block', width: '100%', padding: '24px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 16,
  fontSize: 22, fontWeight: 800, cursor: 'pointer',
}

export default PaymentPage
