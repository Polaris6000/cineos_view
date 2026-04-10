/**
 * PaymentPage.tsx — 결제 처리
 *
 * 흐름:
 *  1. 진입 시 [포인트 적립 모달] 자동 팝업
 *      - "네, 적립할게요" → [회원 인증 모달] 오픈
 *      - "괜찮아요"       → 모달 닫고 바로 결제 수단 선택
 *  2. [회원 인증 모달]
 *      - 전화번호 입력(표시: 010-1111-2222, 저장: 01011112222) → 인증번호 발송
 *      - POST /api/sms { toPhone, content } 로 실제 SMS 발송
 *      - 6자리 코드는 프론트에서 생성 후 상태로 보관 → 사용자 입력값과 비교
 *      - 인증번호 확인 완료 → GET /api/admin/member/{phone} 포인트 조회
 *      - 모달 자동 닫기 + 포인트 사용 섹션 표시
 *      - 건너뛰기 → wantPoints = false
 *  3. 결제 수단: 카드 / 카카오페이 / 토스 — 일렬 배치
 *  4. 전액 포인트 결제 시 결제 수단 선택 생략
 *
 * state 수신: movieId, movieTitle, schedule, persons, totalPersons,
 *             selectedSeats, selectedSeatObjects, totalAmount, theater, seatPolicy
 * TODO: POST /api/bookings/pay 연동
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Phone, CheckCircle, Coins,
  CreditCard, Wallet, Info, Gift, X, Loader
} from 'lucide-react'
import { PERSON_TYPES, PAYMENT_METHODS, SEAT_PRICES, SEAT_TYPE_LABEL } from '../../api/mockData'
import apiClient, { type MemberDTO, type SeatPolicyDTO } from '../../api/apiClient'

/** 포인트 적립률 5% */
const POINT_RATE = 0.05

/**
 * 6자리 랜덤 인증번호 생성 유틸
 * Math.random 대신 crypto.getRandomValues 사용 (더 안전)
 */
function generateVerifyCode(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  // 0~999999 범위로 변환 후 6자리 0패딩
  return String(arr[0] % 1_000_000).padStart(6, '0')
}

/**
 * 전화번호 포맷 유틸
 * 입력: '01011112222' → 출력: '010-1111-2222'
 * 입력은 숫자만 허용, 최대 11자리
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state    = location.state ?? {}

  const {
    movieTitle, schedule,
    persons = {},
    selectedSeats = [],
    selectedSeatObjects = [],
    totalAmount = 0,
    seatPolicy,   // SeatPage에서 전달하는 실제 좌석 정책 (cost 포함)
  } = state as {
    movieTitle:          string
    schedule:            { date?: string; startTime?: string; endTime?: string; theaterName?: string }
    persons:             Record<string, number>
    selectedSeats:       string[]
    selectedSeatObjects: Array<{ id: string; seatType: string } | undefined>
    totalAmount:         number
    seatPolicy:          SeatPolicyDTO | undefined
  }

  if (!schedule) {
    navigate('/')
    return null
  }

  // ── 금액 계산 ──
  /**
   * 좌석 단가 결정 우선순위:
   *  1. SeatPage에서 전달한 seatPolicy.cost (실제 API 데이터)
   *  2. mockData SEAT_PRICES (fallback — seatPolicy 없을 때)
   */
  const getSeatUnitPrice = (seatType: string): number => {
    if (seatPolicy?.cost) return seatPolicy.cost
    return SEAT_PRICES[seatType as keyof typeof SEAT_PRICES] ?? SEAT_PRICES.NORMAL
  }

  // 좌석 단가 합산
  const seatPriceTotal = selectedSeatObjects.reduce((acc, seat) => {
    return acc + getSeatUnitPrice(seat?.seatType ?? 'NORMAL')
  }, 0)
  // 인원 유형별 할인 합산
  const discountTotal = PERSON_TYPES.reduce((acc, { type, discount }) => {
    return acc + (persons[type] ?? 0) * discount
  }, 0)
  const normalPrice = seatPriceTotal

  // ──────────────────────────────────────────────────
  // [모달 상태]
  // showPointModal  : 포인트 적립 여부 선택 모달
  // showPhoneModal  : 회원 인증(전화번호) 모달
  // wantPoints      : null=미선택 / true=적립원함 / false=건너뜀
  // ──────────────────────────────────────────────────
  const [showPointModal, setShowPointModal] = useState(true)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [wantPoints,     setWantPoints]     = useState<boolean | null>(null)

  /**
   * 포인트 모달 — "네, 적립할게요" 클릭
   * → 포인트 모달 닫고, 회원 인증 모달 오픈
   */
  const handleModalYes = () => {
    setWantPoints(true)
    setShowPointModal(false)
    setShowPhoneModal(true) // 인증 모달로 이어서
  }

  /**
   * 포인트 모달 — "괜찮아요" 클릭
   * → 포인트 모달 닫고 바로 결제 수단으로
   */
  const handleModalNo = () => {
    setWantPoints(false)
    setShowPointModal(false)
    // 혹시 이전에 포인트를 적용했었다면 초기화
    setPointUsed(0)
    setPointInput('')
  }

  // ── 회원 인증 상태 ──
  // phoneRaw: 숫자만 저장 (01011112222 형식) — API 전송용
  const [phoneRaw,       setPhoneRaw]       = useState('')
  const [verifyCode,     setVerifyCode]      = useState('')   // 사용자 입력 코드
  const [generatedCode,  setGeneratedCode]   = useState('')   // 프론트에서 생성한 실제 코드
  const [isVerified,     setIsVerified]      = useState(false)
  const [verifyError,    setVerifyError]     = useState('')
  const [codeSent,       setCodeSent]        = useState(false)
  const [smsSending,     setSmsSending]      = useState(false) // SMS 발송 중 로딩 상태

  /**
   * 포인트 잔액 — 인증 완료 후 API에서 실제 값 로드
   * null: 아직 조회 안 함 / number: 조회 완료 잔액
   */
  const [userPoints,     setUserPoints]      = useState<number | null>(null)
  const [pointsLoading,  setPointsLoading]   = useState(false)

  /**
   * 전화번호 input onChange
   * 숫자 외 문자 제거 후 최대 11자리로 제한하여 raw 상태에 저장
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhoneRaw(raw)
  }

  /**
   * 인증번호 발송
   * 1. 6자리 코드 생성 (프론트)
   * 2. POST /api/sms { toPhone: phoneRaw, content: "인증번호: XXXXXX" } 호출
   * 3. 서버가 실제 SMS 발송 → 사용자 폰에 수신
   * 4. 코드는 state에 보관 → 사용자 입력값과 비교
   */
  const handleSendCode = async () => {
    if (phoneRaw.length < 10) {
      setVerifyError('올바른 휴대폰 번호를 입력해 주세요.')
      return
    }

    setSmsSending(true)
    setVerifyError('')

    // 6자리 코드 생성
    const code = generateVerifyCode()
    setGeneratedCode(code)

    try {
      // POST /api/sms — Nurigo SMS 서비스를 통해 실제 문자 발송
      // toPhone: 숫자만 (01011112222 형식), content: 발송할 문자 내용
      await apiClient.post('/sms', {
        toPhone:  phoneRaw,
        content:  `[CineOS] 인증번호: ${code}`,
      })
      setCodeSent(true)
      console.log(`[PaymentPage] SMS 발송 완료 → ${phoneRaw}`)
    } catch (e) {
      console.error('[PaymentPage] SMS 발송 실패', e)
      // 발송 실패해도 코드는 state에 있으므로 콘솔 확인 가능 (개발용)
      // 실서비스에서는 더 엄격한 처리 필요
      setVerifyError('SMS 발송에 실패했습니다. 다시 시도해 주세요.')
      setGeneratedCode('')
    } finally {
      setSmsSending(false)
    }
  }

  /**
   * 인증번호 확인
   * 사용자 입력 코드와 state에 저장된 생성 코드 비교
   * 성공 시:
   *   1. isVerified = true
   *   2. GET /api/admin/member/{phone} 로 실제 포인트 잔액 조회
   *   3. 모달 자동 닫기
   */
  const handleVerify = async () => {
    // 생성된 코드가 없으면 먼저 SMS를 보내야 함
    if (!generatedCode) {
      setVerifyError('먼저 인증번호를 발송해 주세요.')
      return
    }

    if (verifyCode !== generatedCode) {
      setVerifyError('인증번호가 올바르지 않습니다. 다시 확인해 주세요.')
      return
    }

    // 인증 성공 — 포인트 조회
    setVerifyError('')
    setPointsLoading(true)

    try {
      /**
       * GET /api/admin/member/{phone}
       * phone 경로 파라미터: 숫자만 (01011112222 형식)
       * 응답: MemberDTO { phone, point, createAt }
       *
       * 신규 회원이면 404 응답 가능 → catch에서 0포인트로 처리
       */
      const res = await apiClient.get<MemberDTO>(`/admin/member/${phoneRaw}`)
      setUserPoints(res.data.point)
      console.log('[PaymentPage] 포인트 조회 완료:', res.data.point)
    } catch (e) {
      console.warn('[PaymentPage] 포인트 조회 실패 (신규 회원이거나 오류)', e)
      // 신규 회원 또는 조회 실패 시 0 처리
      setUserPoints(0)
    } finally {
      setPointsLoading(false)
    }

    setIsVerified(true)
    setShowPhoneModal(false)  // 인증 완료 → 모달 자동 닫기
  }

  /**
   * 인증 모달 — 건너뛰기
   * wantPoints = false 로 되돌리고 모달 닫기
   */
  const handlePhoneModalSkip = () => {
    setWantPoints(false)
    setShowPhoneModal(false)
    setCodeSent(false)
    setVerifyError('')
    setGeneratedCode('')
  }

  // ── 포인트 사용 상태 ──
  const [pointInput, setPointInput] = useState('')
  const [pointUsed,  setPointUsed]  = useState(0)

  /**
   * 표시용 포인트 잔액
   * - 인증 완료 후 API 조회한 실제 값 사용
   * - 조회 전 또는 실패 시 0 표시
   */
  const displayPoints = userPoints ?? 0

  // ── 결제 수단 ──
  const [payMethod, setPayMethod] = useState('CARD')

  // 최종 결제 금액
  const finalAmount = Math.max(totalAmount - pointUsed, 0)
  const pointEarned = Math.floor(finalAmount * POINT_RATE)
  const isFullPoint = finalAmount === 0

  /** 포인트 적용 */
  const handlePointApply = () => {
    const p = Number(pointInput)
    if (!p || p <= 0) return
    setPointUsed(Math.min(p, totalAmount))
  }

  /** 결제 완료 → 결과 페이지로 이동 */
  const handlePay = () => {
    navigate('/payment/result', {
      state: {
        ...state,
        pointUsed,
        pointEarned,
        finalAmount,
        payMethod: isFullPoint ? 'POINT' : payMethod,
        // API 전송 시에는 phoneRaw (01011112222) 사용
        phone: phoneRaw,
        bookingId: `BK${Date.now()}`,
      },
    })
  }

  return (
    <div style={pageWrap}>

      {/* ══════════════════════════════════════════════════
          [모달 1] 포인트 적립 여부 선택
          결제 진입 시 자동 팝업. X 또는 "괜찮아요"로 닫기.
          ══════════════════════════════════════════════════ */}
      {showPointModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            {/* X 닫기 버튼 — "괜찮아요"와 동일한 동작 */}
            <button onClick={handleModalNo} style={modalCloseBtn} aria-label="모달 닫기">
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

      {/* ══════════════════════════════════════════════════
          [모달 2] 회원 인증 (전화번호)
          포인트 모달에서 "네" 선택 시 연이어 표시됨.
          인증 완료 시 자동 닫힘. 건너뛰기 시 wantPoints=false.
          ══════════════════════════════════════════════════ */}
      {showPhoneModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            {/* X 닫기 = 건너뛰기 */}
            <button onClick={handlePhoneModalSkip} style={modalCloseBtn} aria-label="모달 닫기">
              <X size={20} />
            </button>

            {/* 아이콘 + 타이틀 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Phone size={48} color="var(--color-brand-default)" style={{ marginBottom: 12 }} />
              <h3 style={modalTitle}>회원 인증</h3>
              <p style={modalDesc}>
                휴대폰 번호로 인증해 주세요.<br />
                없으면 자동으로 회원 가입됩니다.
              </p>
            </div>

            {/* 전화번호 입력 + 발송 버튼 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                type="tel"
                value={formatPhone(phoneRaw)}   /* 표시: 010-1111-2222 형식 */
                onChange={handlePhoneChange}     /* 저장: 01011112222 형식 */
                placeholder="010-0000-0000"
                style={{ ...inputStyle, flex: 1 }}
                maxLength={13}                   /* 010-1111-2222 = 13자 */
                disabled={codeSent}              /* 발송 후 번호 변경 불가 */
              />
              <button
                onClick={handleSendCode}
                disabled={codeSent || smsSending}
                style={{ ...smallBtn, opacity: (codeSent || smsSending) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {/* 발송 중: 로딩 아이콘 표시 */}
                {smsSending
                  ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> 발송 중...</>
                  : codeSent ? '발송됨' : '인증번호 발송'
                }
              </button>
            </div>

            {/* 인증번호 입력 — 발송 후 표시 */}
            {codeSent && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="인증번호 6자리"
                  style={{ ...inputStyle, flex: 1 }}
                  maxLength={6}
                />
                <button
                  onClick={handleVerify}
                  disabled={pointsLoading}
                  style={{ ...smallBtn, opacity: pointsLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {pointsLoading
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> 조회 중</>
                    : '확인'
                  }
                </button>
              </div>
            )}

            {/* 에러 메시지 */}
            {verifyError && (
              <p style={{ color: '#e03c3c', fontSize: 13, marginBottom: 8 }}>{verifyError}</p>
            )}

            {/* SMS 발송 성공 안내 */}
            {codeSent && !verifyError && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                입력하신 번호로 인증번호를 발송했습니다.
              </p>
            )}

            {/* 건너뛰기 버튼 */}
            <button onClick={handlePhoneModalSkip} style={modalBtnNo}>
              건너뛰기
            </button>
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
            <span>할인</span>
            <span>−{discountTotal.toLocaleString()}원</span>
          </div>
        )}
        {/* 좌석 타입 상세 */}
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          {selectedSeatObjects.length > 0 && (() => {
            const byType: Record<string, number> = {}
            selectedSeatObjects.forEach((s) => {
              const t = s?.seatType ?? 'NORMAL'
              byType[t] = (byType[t] ?? 0) + 1
            })
            return Object.entries(byType).map(([type, cnt]) => (
              <div key={type} style={{ ...priceRow, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{SEAT_TYPE_LABEL[type as keyof typeof SEAT_TYPE_LABEL] ?? '일반'} {cnt}석</span>
                <span>{(getSeatUnitPrice(type) * (cnt as number)).toLocaleString()}원</span>
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
        {/* ── 포인트 영역 구분선 ── */}
        <div style={{ borderTop: '1px dashed var(--border-default)', marginTop: 14, paddingTop: 14 }}>
          {wantPoints === true && isVerified ? (
            /* 인증 완료 + 적립 선택 → 적립 예정 포인트 표시 */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ad74', fontSize: 14 }}>
              <Gift size={15} />
              <span>적립 예정: <strong>{pointEarned.toLocaleString()}P</strong></span>
            </div>
          ) : (
            /* 미선택 or 건너뜀 → 포인트 적립 CTA 버튼 */
            <button onClick={() => setShowPointModal(true)} style={pointCtaBtn}>
              <Gift size={16} style={{ marginRight: 8 }} />
              포인트 적립
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          [포인트 사용 섹션]
          회원 인증 완료(isVerified=true) + 적립 원함(wantPoints=true) 일 때만 표시
          ────────────────────────────────────────────── */}
      {wantPoints === true && isVerified && (
        <div style={card}>
          <h3 style={cardTitle}>
            <Coins size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            포인트 사용
          </h3>
          {/* 인증 완료 안내 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                        color: '#00ad74', fontSize: 14 }}>
            <CheckCircle size={16} />
            <span>
              {formatPhone(phoneRaw)} 인증 완료
            </span>
          </div>
          {/* ── 잔여 포인트 표시 ── */}
          <div style={pointBalanceBox}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>잔여 포인트</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-brand-default)' }}>
              {displayPoints.toLocaleString()}P
            </span>
          </div>

          {pointUsed > 0 ? (
            /* 포인트 적용 완료 상태 */
            <div style={{ color: '#00ad74', fontSize: 15, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 8 }}>
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
            /* 포인트 입력 폼 + 전액 사용 버튼 */
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                value={pointInput}
                onChange={(e) => setPointInput(e.target.value)}
                placeholder="사용할 포인트 입력"
                style={inputStyle}
                min={0}
                max={displayPoints}
              />
              {/* 전액 사용: 잔여 포인트와 결제 금액 중 작은 값으로 자동 입력 */}
              <button
                onClick={() => setPointInput(String(Math.min(displayPoints, totalAmount)))}
                style={{ ...smallBtn, background: 'var(--bg-surface)',
                          border: '1px solid var(--color-brand-default)',
                          color: 'var(--color-brand-default)' }}
              >
                전액
              </button>
              <button onClick={handlePointApply} style={smallBtn}>적용</button>
            </div>
          )}
        </div>
      )}

      {/* ── 결제 수단 (전액 포인트가 아닐 때만 표시) ── */}
      {!isFullPoint && (
        <div style={card}>
          <h3 style={cardTitle}>
            <CreditCard size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            결제 수단
          </h3>
          {/*
            네이버페이 제거 → 3개 수단 (카드 / 카카오페이 / 토스)
            flex row 일렬 배치 (이전 2×N 그리드에서 변경)
          */}
          <div style={methodRow}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                style={{
                  ...methodBtn,
                  ...(payMethod === m.id ? methodBtnActive : {}),
                }}
              >
                <Wallet size={20} style={{ marginBottom: 8 }} />
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

/* 모달 딤 오버레이 */
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
/* 모달 X 닫기 버튼 */
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
/* 모달 N / 건너뛰기 버튼 — 서브 */
const modalBtnNo: React.CSSProperties = {
  display: 'block', width: '100%', padding: '16px 0',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 14, color: 'var(--text-muted)',
  fontSize: 16, fontWeight: 600, cursor: 'pointer',
}
/* 금액 카드 하단 포인트 적립 CTA 버튼 */
const pointCtaBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', padding: '12px 0',
  background: 'rgba(255,184,0,0.07)',
  border: '1px solid rgba(255,184,0,0.3)',
  borderRadius: 10, color: 'var(--color-brand-default)',
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit',
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
  fontSize: 16, outline: 'none', boxSizing: 'border-box' as const,
}
const smallBtn  = {
  padding: '14px 20px',
  background: 'var(--color-brand-default)', color: 'var(--primitive-neutral-900)',
  border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
}
const cancelBtn = {
  padding: '8px 16px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 8, color: 'var(--text-secondary)',
  fontSize: 14, cursor: 'pointer',
}
/* 잔여 포인트 표시 박스 */
const pointBalanceBox = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', marginBottom: 14,
  background: 'rgba(255,184,0,0.07)',
  border: '1px solid rgba(255,184,0,0.25)',
  borderRadius: 10,
}
/* 결제 수단 — flex 일렬 배치 (네이버페이 제거로 3개) */
const methodRow = {
  display: 'flex', gap: 12,
}
const methodBtn  = {
  display: 'flex', flexDirection: 'column' as const,
  alignItems: 'center', justifyContent: 'center',
  flex: 1, padding: '22px 0',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, color: 'var(--text-secondary)',
  fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
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
