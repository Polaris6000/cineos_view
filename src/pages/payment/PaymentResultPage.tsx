/**
 * PaymentResultPage.tsx — 결제 완료 화면
 *
 * 변경 사항:
 *  - QR 코드 섹션 제거
 *  - 포인트 즉시 적립 (익일 → 즉시 사용 가능으로 변경)
 *  - "홈으로 돌아가기" 버튼 → [영수증 출력] + [모바일로 받기] 두 버튼으로 교체
 *  - [영수증 출력]: 새 팝업 창에 영수증 전용 HTML 렌더링 → 자동 print() → 완료 모달
 *  - [모바일 영수증]: 전화번호 확인 모달 → 발송 시뮬레이션 → 완료 모달
 *    - 결제 시 인증한 번호가 있으면 자동으로 pre-fill
 *    - 없으면 입력창만 표시
 *  - 완료 모달: 인사 메시지 + 5초 카운트다운 → 자동 홈 이동
 *
 * state 수신: PaymentPage 에서 넘겨받은 전체 예매 정보
 *   + phone (인증한 전화번호 raw 숫자, 없으면 '')
 */
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Gift, Ticket, Printer,
  Smartphone, X, Info
} from 'lucide-react'
import { PERSON_TYPES, PAYMENT_METHODS } from '../../api/mockData'

/**
 * 전화번호 포맷 유틸 (PaymentPage 와 동일)
 * '01011112222' → '010-1111-2222'
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function PaymentResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state    = location.state ?? {}

  const {
    bookingId, movieTitle, schedule, selectedSeats, persons = {},
    finalAmount, pointUsed, pointEarned,
    payMethod, totalAmount,
    phone: authPhone = '', // PaymentPage 에서 인증한 전화번호 (raw 숫자)
  } = state

  if (!bookingId) {
    navigate('/')
    return null
  }

  // 결제 수단 레이블
  const methodLabel = payMethod === 'POINT'
    ? '포인트 전액'
    : PAYMENT_METHODS.find((m) => m.id === payMethod)?.label ?? payMethod

  // ──────────────────────────────────────────────────
  // [완료 모달] 상태
  // showDoneModal: 영수증 출력 or 모바일 발송 완료 후 표시
  // countdown    : 5..4..3..2..1 → 0 되면 홈 이동
  // ──────────────────────────────────────────────────
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [countdown,     setCountdown]     = useState(5)

  /** 완료 모달이 열리면 5초 카운트다운 시작 → 0 되면 홈으로 자동 이동 */
  useEffect(() => {
    if (!showDoneModal) return
    // 매 1초마다 countdown 감소
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
    return () => clearInterval(timer) // 언마운트 시 클리어
  }, [showDoneModal, navigate])

  // ──────────────────────────────────────────────────
  // [모바일 영수증 발송 모달] 상태
  // 인증된 전화번호가 없거나 변경하고 싶을 때 표시
  // ──────────────────────────────────────────────────
  const [showMobileModal, setShowMobileModal] = useState(false)
  // 모바일 모달에서 입력하는 전화번호 (raw 숫자)
  const [mobilePhoneRaw,  setMobilePhoneRaw]  = useState(authPhone)
  const [mobileSending,   setMobileSending]   = useState(false)

  /**
   * [영수증 출력] 버튼 클릭
   *
   * window.print() 대신 새 창을 열어 영수증 전용 HTML을 렌더링한 뒤
   * 그 창에서 자동으로 window.print() 호출 → 메인 페이지는 그대로 유지.
   * 인쇄 다이얼로그 종료 시 팝업 창 자동 닫힘.
   */
  const handlePrint = () => {
    // 인원 문자열 생성 (예: "성인 2명, 청소년 1명")
    const personStr = PERSON_TYPES
      .filter(({ type }) => (persons[type] ?? 0) > 0)
      .map(({ type, label }) => `${label} ${persons[type]}명`)
      .join(', ') || '–'

    // 현재 시각 (영수증 발행 일시)
    const issuedAt = new Date().toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

    // 영수증 전용 HTML 생성 (스탠드얼론, 외부 의존성 없음)
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>영수증 — CineOS</title>
  <style>
    /* ── 리셋 & 기본 ── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #111;
      background: #fff;
      /* 화면 미리보기: 영수증 너비로 중앙 정렬 */
      max-width: 320px;
      margin: 0 auto;
      padding: 28px 20px;
    }
    /* ── 헤더 ── */
    .logo {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 6px;
      text-align: center;
    }
    .logo-sub {
      font-size: 10px;
      letter-spacing: 2px;
      text-align: center;
      color: #555;
      margin-top: 3px;
      margin-bottom: 18px;
    }
    /* ── 예매 번호 박스 ── */
    .booking-id {
      border: 1px solid #111;
      text-align: center;
      padding: 8px 0;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 3px;
      margin-bottom: 16px;
    }
    /* ── 구분선 ── */
    .divider       { border-top: 1px dashed #888; margin: 12px 0; }
    .divider-solid { border-top: 2px solid #111;  margin: 12px 0; }
    /* ── 행 ── */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 5px;
      gap: 8px;
    }
    .label { color: #555; white-space: nowrap; flex-shrink: 0; }
    .value { text-align: right; font-weight: 600; word-break: keep-all; }
    /* ── 합계 행 ── */
    .row-total {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 900;
      margin-bottom: 5px;
    }
    /* ── 포인트 행 ── */
    .row-point .value { color: #111; }
    /* ── 푸터 ── */
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #555;
      line-height: 1.8;
    }
    /* ── 인쇄 설정: 80mm 열감지 프린터 기준 ── */
    @media print {
      body { max-width: 100%; padding: 0 4mm; }
      @page { size: 80mm auto; margin: 4mm 0; }
    }
  </style>
</head>
<body>
  <div class="logo">CineOS</div>
  <div class="logo-sub">CINEMA TICKET RECEIPT</div>

  <div class="booking-id">${bookingId}</div>

  <div class="row"><span class="label">영화</span><span class="value">${movieTitle}</span></div>
  <div class="row"><span class="label">날짜</span><span class="value">${schedule?.date ?? '–'}</span></div>
  <div class="row"><span class="label">시간</span><span class="value">${schedule?.startTime ?? '–'} ~ ${schedule?.endTime ?? '–'}</span></div>
  <div class="row"><span class="label">상영관</span><span class="value">${schedule?.theaterName ?? '–'}</span></div>
  <div class="row"><span class="label">좌석</span><span class="value">${(selectedSeats ?? []).join(', ')}</span></div>
  <div class="row"><span class="label">인원</span><span class="value">${personStr}</span></div>

  <div class="divider"></div>

  <div class="row"><span class="label">좌석 요금</span><span class="value">${(totalAmount ?? 0).toLocaleString()}원</span></div>
  ${(pointUsed ?? 0) > 0
    ? `<div class="row"><span class="label">포인트 사용</span><span class="value">−${pointUsed.toLocaleString()}원</span></div>`
    : ''}

  <div class="divider-solid"></div>

  <div class="row-total"><span>결제 금액</span><span>${(finalAmount ?? 0).toLocaleString()}원</span></div>
  <div class="row"><span class="label">결제 수단</span><span class="value">${methodLabel}</span></div>

  ${(pointEarned ?? 0) > 0
    ? `<div class="divider"></div>
       <div class="row row-point"><span class="label">적립 포인트</span><span class="value">+${(pointEarned ?? 0).toLocaleString()}P (즉시 적립)</span></div>`
    : ''}

  <div class="divider"></div>

  <div class="footer">
    <div>발행일시: ${issuedAt}</div>
    <div style="margin-top:10px;font-size:13px;font-weight:bold;color:#111;">
      즐거운 관람 되세요!
    </div>
  </div>

  <script>
    // 창이 로드되면 자동 인쇄 → 다이얼로그 닫히면 창 닫힘
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`

    // 새 팝업 창 열기 (영수증 너비에 맞게)
    const win = window.open('', '_blank', 'width=420,height=700,scrollbars=yes')
    if (win) {
      win.document.write(html)
      win.document.close()
    }

    // 완료 모달 오픈 (팝업 창 열림과 동시에)
    setCountdown(5)
    setShowDoneModal(true)
  }

  /**
   * [모바일 영수증] 버튼 클릭
   *
   * - authPhone(인증된 전화번호)이 있으면 모달 없이 바로 발송 시뮬레이션
   * - authPhone이 없으면 전화번호 입력 모달 표시
   */
  const handleMobileClick = () => {
    if (authPhone) {
      // 인증된 번호로 즉시 발송
      setMobileSending(true)
      setTimeout(() => {
        setMobileSending(false)
        setCountdown(5)
        setShowDoneModal(true)
      }, 800)
    } else {
      // 번호 없으면 입력 모달 표시
      setMobilePhoneRaw('')
      setShowMobileModal(true)
    }
  }

  /**
   * 모바일 영수증 발송 확인
   * 더미 딜레이 후 성공 처리 → 완료 모달 오픈
   * TODO: POST /api/receipts/mobile 연동
   */
  const handleMobileSend = () => {
    if (mobilePhoneRaw.length < 10) return
    setMobileSending(true)
    // 발송 시뮬레이션 (800ms 딜레이)
    setTimeout(() => {
      setMobileSending(false)
      setShowMobileModal(false)
      setCountdown(5)
      setShowDoneModal(true)
    }, 800)
  }

  return (
    <div style={pageWrap}>

      {/* ══════════════════════════════════════════════════
          [완료 모달] 영수증 출력 or 모바일 발송 완료 후 표시
          5초 카운트다운 후 홈으로 자동 이동
          ══════════════════════════════════════════════════ */}
      {showDoneModal && (
        <div style={modalOverlay}>
          <div style={doneModalBox}>
            {/* 체크 아이콘 */}
            <CheckCircle size={64} color="#00ad74" strokeWidth={1.5}
                         style={{ marginBottom: 20 }} />
            <h3 style={doneTitle}>감사합니다!</h3>
            <p style={doneDesc}>
              즐거운 관람 되세요. 🎬<br />
              언제든 CineOS를 찾아 주세요.
            </p>
            {/* 모바일 발송 시 어느 번호로 보냈는지 표시 */}
            {authPhone && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                {formatPhone(authPhone)} 으로 영수증이 발송되었습니다.
              </p>
            )}
            {/* 카운트다운 표시 */}
            <div style={countdownBox}>
              <span style={countdownNum}>{countdown}</span>
              <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>초 후 홈으로 이동합니다</span>
            </div>
            {/* 즉시 홈으로 이동 버튼 */}
            <button onClick={() => navigate('/')} style={goHomeBtn}>
              지금 홈으로
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          [모바일 영수증 발송 모달]
          전화번호 확인 후 발송
          ══════════════════════════════════════════════════ */}
      {showMobileModal && (
        <div style={modalOverlay}>
          <div style={mobileModalBox}>
            {/* X 닫기 */}
            <button
              onClick={() => setShowMobileModal(false)}
              style={modalCloseBtn}
              aria-label="닫기"
            >
              <X size={20} />
            </button>

            {/* 아이콘 + 타이틀 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Smartphone size={44} color="var(--color-brand-default)"
                          style={{ marginBottom: 12 }} />
              <h3 style={mobileModalTitle}>모바일 영수증</h3>
              <p style={mobileModalDesc}>
                영수증을 받을 번호를 확인해 주세요.
              </p>
            </div>

            {/* 전화번호 입력 */}
            <input
              type="tel"
              value={formatPhone(mobilePhoneRaw)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
                setMobilePhoneRaw(raw)
              }}
              placeholder="010-0000-0000"
              style={mobileInput}
              maxLength={13}
            />

            {/* 안내 */}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, marginTop: 8 }}>
              <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              입력한 번호로 예매 확인 문자가 발송됩니다.
            </p>

            {/* 발송 버튼 */}
            <button
              onClick={handleMobileSend}
              disabled={mobileSending || mobilePhoneRaw.length < 10}
              style={{
                ...sendBtn,
                opacity: (mobileSending || mobilePhoneRaw.length < 10) ? 0.6 : 1,
              }}
            >
              {mobileSending ? '발송 중...' : '발송하기'}
            </button>
          </div>
        </div>
      )}

      {/* ── 성공 아이콘 ── */}
      <div style={{ marginBottom: 20 }}>
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
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-default)',
                    margin: 0, letterSpacing: 2 }}>
          {bookingId}
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
        <div style={{ ...priceRow, borderTop: '1px solid var(--border-default)',
                      paddingTop: 12, marginTop: 8, fontWeight: 700, fontSize: 17 }}>
          <span>결제 금액</span>
          <span>{(finalAmount ?? 0).toLocaleString()}원</span>
        </div>
        <div style={{ ...priceRow, marginTop: 6 }}>
          <span>결제 수단</span>
          <span>{methodLabel}</span>
        </div>
      </div>

      {/* ── 포인트 즉시 적립 안내 ── */}
      {(pointEarned ?? 0) > 0 && (
        <div style={{ ...card, background: 'var(--color-success-bg)',
                      border: '1px solid var(--color-success-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Gift size={32} color="var(--color-success-light)" strokeWidth={1.5} />
            <div>
              <p style={{ fontSize: 14, color: 'var(--color-success-light)', marginBottom: 4 }}>
                포인트 즉시 적립 완료
              </p>
              <p style={{ fontSize: 24, fontWeight: 800,
                          color: 'var(--color-success-light)', margin: 0 }}>
                +{(pointEarned ?? 0).toLocaleString()}P
              </p>
              {/* 즉시 사용 가능으로 변경 */}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                결제 금액의 5% 적립 · 즉시 사용 가능
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────
          [영수증 버튼 영역]
          영수증 출력 / 모바일로 받기 — 두 버튼 일렬 배치
          ────────────────────────────────────────────────────── */}
      <div style={btnRow}>

        {/* 영수증 출력 버튼 */}
        <button onClick={handlePrint} style={receiptBtn}>
          <Printer size={22} style={{ marginBottom: 8 }} />
          영수증 출력
        </button>

        {/* 모바일 영수증 버튼 — 발송 중일 때 로딩 상태 표시 */}
        <button
          onClick={handleMobileClick}
          disabled={mobileSending}
          style={{ ...mobileBtn, opacity: mobileSending ? 0.6 : 1 }}
        >
          <Smartphone size={22} style={{ marginBottom: 8 }} />
          {mobileSending ? '발송 중...' : '모바일 영수증'}
        </button>

      </div>

    </div>
  )
}

/* ── 스타일 ── */

/* 모달 딤 오버레이 */
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 40px',
}
/* 완료 모달 박스 */
const doneModalBox: React.CSSProperties = {
  width: '100%', maxWidth: 460,
  background: 'var(--bg-surface)',
  borderRadius: 24, padding: '52px 40px 44px',
  textAlign: 'center',
  boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}
const doneTitle: React.CSSProperties = {
  fontSize: 28, fontWeight: 800,
  color: 'var(--text-primary)', marginBottom: 14,
}
const doneDesc: React.CSSProperties = {
  fontSize: 16, color: 'var(--text-secondary)',
  lineHeight: 1.8, marginBottom: 28,
}
/* 카운트다운 표시 영역 */
const countdownBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '14px 28px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 14, marginBottom: 20,
}
const countdownNum: React.CSSProperties = {
  fontSize: 36, fontWeight: 900,
  color: 'var(--color-brand-default)', lineHeight: 1,
  minWidth: 28, textAlign: 'center',
}
const goHomeBtn: React.CSSProperties = {
  padding: '14px 40px',
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 12, color: 'var(--text-muted)',
  fontSize: 15, cursor: 'pointer',
}

/* 모바일 영수증 발송 모달 박스 */
const mobileModalBox: React.CSSProperties = {
  position: 'relative',
  width: '100%', maxWidth: 480,
  background: 'var(--bg-surface)',
  borderRadius: 20, padding: '40px 36px 32px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
}
const modalCloseBtn: React.CSSProperties = {
  position: 'absolute', top: 16, right: 16,
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer', padding: 6, lineHeight: 0,
}
const mobileModalTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800,
  color: 'var(--text-primary)', marginBottom: 10,
}
const mobileModalDesc: React.CSSProperties = {
  fontSize: 15, color: 'var(--text-secondary)',
  lineHeight: 1.6, margin: 0,
}
const mobileInput: React.CSSProperties = {
  width: '100%', padding: '16px 18px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 12, color: 'var(--text-primary)',
  fontSize: 18, outline: 'none', boxSizing: 'border-box',
  textAlign: 'center', letterSpacing: 2,
}
const sendBtn: React.CSSProperties = {
  display: 'block', width: '100%', padding: '18px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 14,
  fontSize: 18, fontWeight: 800, cursor: 'pointer',
}

/* 페이지 레이아웃 */
const pageWrap = {
  maxWidth: 560, margin: '0 auto', padding: '40px 40px 80px',
  textAlign: 'center' as const,
}
const mainTitle = { fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }
const subTitle  = { fontSize: 16, color: 'var(--text-secondary)', marginBottom: 28 }
const bookingIdBox = {
  background: 'var(--bg-surface)', borderRadius: 14, padding: '18px 28px',
  marginBottom: 24, display: 'inline-block', minWidth: 280,
}
const card = {
  background: 'var(--bg-surface)', borderRadius: 16, padding: '20px 24px',
  marginBottom: 16, textAlign: 'left' as const,
}
const cardTitle = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }
const dl = { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '10px 14px' }
const dt = { color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }
const dd = { color: 'var(--text-secondary)', fontSize: 14, margin: 0 }
const priceRow = {
  display: 'flex', justifyContent: 'space-between',
  fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8,
}

/* 영수증 버튼 행 — 두 버튼 나란히 */
const btnRow = {
  display: 'flex', gap: 14, marginTop: 8,
}
/* 영수증 출력 버튼 — 강조 (primary) */
const receiptBtn = {
  flex: 1, display: 'flex', flexDirection: 'column' as const,
  alignItems: 'center', justifyContent: 'center',
  padding: '28px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 18,
  fontSize: 18, fontWeight: 800, cursor: 'pointer',
}
/* 모바일로 받기 버튼 — 서브 */
const mobileBtn = {
  flex: 1, display: 'flex', flexDirection: 'column' as const,
  alignItems: 'center', justifyContent: 'center',
  padding: '28px 0',
  background: 'var(--bg-surface)',
  border: '2px solid var(--color-brand-default)',
  borderRadius: 18,
  fontSize: 18, fontWeight: 800, cursor: 'pointer',
  color: 'var(--color-brand-default)',
}

export default PaymentResultPage
