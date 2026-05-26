/**
 * PaymentPage.tsx — 결제 처리
 *
 * 흐름:
 *  1. 진입 즉시 [적립 여부 확인 모달] 팝업
 *      - "포인트 적립하기" 선택 → [회원 인증 모달] 오픈 (전화번호 입력/인증)
 *      - "비회원으로 진행" 선택 → 모달 닫고 바로 결제 진행 가능 (전화 인증 스킵)
 *  2. [회원 인증 모달] (선택 사항)
 *      - 인증 완료 시 포인트 잔액 표시 + 포인트 사용 섹션 활성화
 *      - 모달 닫기(X) → 비회원으로 진행 (인증 없이 결제 가능)
 *  3. [쿠폰 입력] — POST /api/coupon/auth 로 유효성 검증 (회원/비회원 모두 사용 가능)
 *      - 백엔드가 CouponDTO를 반환하면 할인 금액을 계산해 finalAmount에 반영
 *      - discountType: 'WON' = 고정금액 / 'RATIO' = 할인율(%)
 *  4. [포인트 사용] — 회원 인증 완료 시에만 활성화
 *  5. 결제 버튼 클릭 → Toss CARD 결제 or 포인트 전액 결제 (비회원도 가능)
 *
 * state 수신:
 *   movieTitle, schedule(Schedule type), persons, totalPersons,
 *   selectedSeats, selectedSeatObjects, totalAmount, theater, seatPolicy
 *
 * 주의: 결제 수단 선택 없음 — 백엔드 결제 루트는 CARD(토스) 하나뿐
 *
 * 임시 좌석: 결제·창 닫기 시 WS 종료만 → 서버 5분 지연 해제. 로고·타이머 홈은 즉시 해제.
 *
 * [백엔드 요청사항]
 *   POST /api/coupon/auth 응답을 Boolean → CouponDTO로 변경하면
 *   아래 CouponDiscount 로직이 자동으로 활성화됨.
 *   CouponDTO 구조:
 *     { couponNum: string, status: boolean,
 *       discountPolicy: { discountType: 'RATIO'|'WON', discountValue: number, ... } }
 */
import {useEffect, useMemo, useState} from 'react'
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom'
import {CheckCircle, Coins, CreditCard, Gift, Info, Phone, Tag, X} from 'lucide-react'
import {loadTossPayments} from '@tosspayments/tosspayments-sdk'
import apiClient from '../../api/apiClient'
// 인원 타입 / 할인 금액 / 포인트 적립률은 상수 파일에서 관리 — 변경 시 discount.ts 한 곳만 수정
import {PERSON_TYPES, POINT_RATE} from '../../constants/discount'


/* ── 좌석 타입 라벨 ── */
const SEAT_TYPE_LABEL: Record<string, string> = {
    NORMAL: '일반',
    RECLINER: '리클라이너',
}

/**
 * 쿠폰 할인 정보 타입
 * POST /api/coupon/auth 가 CouponDTO를 반환할 때 사용
 *
 *  type   : 'WON'   → discountValue 원 고정 할인
 *           'RATIO' → totalAmount의 discountValue% 할인
 *  value  : DB discount_policy.discount_value 원본값
 *  amount : 실제 차감될 금액 (WON이면 value 그대로, RATIO면 계산된 원 단위 값)
 */
interface CouponDiscount {
    type: 'WON' | 'RATIO'
    value: number
    amount: number
}

/** 전화번호 포맷 유틸: '01011112222' → '010-1111-2222' */
function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function PaymentPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()

    /**
     * Toss failUrl 리디렉션 대응:
     * - PC:     결제창 팝업 닫기 → requestPayment() promise reject (code: PAY_PROCESS_CANCELED)
     * - Mobile: 결제창 닫기 → failUrl=/payment?code=PAY_PROCESS_CANCELED 로 리디렉션
     *           이 경우 location.state가 없음 → localStorage에서 pending_booking_data 복원
     */
    const tossErrorCode = searchParams.get('code')  // 'PAY_PROCESS_CANCELED' 등

    // location.state가 없을 때(failUrl 리디렉션) localStorage에서 복원
    const rawState = location.state ?? {}
    const state = useMemo(() => {
        if (rawState.schedule) return rawState   // 정상 진입: state 그대로 사용
        // failUrl 리디렉션: pending_booking_data 복원
        try {
            const saved = localStorage.getItem('pending_booking_data')
            if (saved) return JSON.parse(saved)
        } catch { /* ignore */
        }
        return rawState
    }, [])  // 마운트 시 1회만 계산 (의존성 배열 빈 배열로 고정)

    // ── location.state 구조분해 ──
    const {
        movieTitle,
        schedule,
        persons = {},
        totalPersons = 0,
        selectedSeats = [],
        selectedSeatObjects = [],
        totalAmount = 0,   // SeatPage에서 좌석비 - 인원할인 - 조조할인 계산 완료된 금액
        theater,
        seatPolicy,
        earlyBirdAmount = 0, // 조조 할인 1인당 금액 (표시 전용 — 이미 totalAmount에 반영됨)
    } = state

    /**
     * ※ React Rules of Hooks 준수:
     *    useState/useEffect/useMemo는 조건부 return 이전에 모두 선언해야 함.
     *    if (!schedule) guard는 아래 모든 훅 선언 이후, JSX return 직전에서 처리.
     */

    /* ── 결제 진행 중 상태 (Toss 팝업 열려있는 동안) ── */
    const [isPaying, setIsPaying] = useState(false)
    /* failUrl 리디렉션으로 돌아온 경우 취소 안내 메시지 표시 */
    const [cancelMsg, setCancelMsg] = useState(
        tossErrorCode === 'PAY_PROCESS_CANCELED' ? '결제가 취소되었습니다. 다시 시도해 주세요.' : ''
    )

    /* ── 모달 상태 ── */
    // 적립 여부 모달: 진입 시 첫 번째로 표시. failUrl 복귀(tossErrorCode 있음) 시에는 이미 선택했던 상황이므로 스킵
    const [showPointModal, setShowPointModal] = useState(!tossErrorCode)
    // 전화 인증 모달: 적립 여부 모달에서 "포인트 적립하기" 선택 시 열림 (선택 사항)
    const [showPhoneModal, setShowPhoneModal] = useState(false)

    /* ── 회원 인증 상태 ── */
    const [phoneRaw, setPhoneRaw] = useState('')    // 숫자만 저장 (01011112222)
    const [verifyCode, setVerifyCode] = useState('')
    const [isVerified, setIsVerified] = useState(false)
    const [verifyError, setVerifyError] = useState('')
    const [codeSent, setCodeSent] = useState(false)
    const [codeTimeLeft, setCodeTimeLeft] = useState(0)  // 인증번호 남은 유효시간 (초), 0이면 만료
    const [memberPoint, setMemberPoint] = useState(0)   // 조회된 잔여 포인트

    /* ── 개인정보 수집 동의 상태 ──
       전화번호 인증 모달에서 인증번호를 발송하기 전에 반드시 동의해야 함.
       privacyConsent=false 이면 "인증번호 발송" 버튼 비활성화. */
    const [privacyConsent, setPrivacyConsent] = useState(false)  // 동의 체크박스 상태
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)  // 개인정보 전문 모달

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
        setPhoneRaw(raw)
    }

    // 인증번호 발송 중 로딩 상태
    const [sendingCode, setSendingCode] = useState(false)

    // 인증번호 유효시간 카운트다운 (발송 성공 시 180초 시작, 매초 감소)
    // codeTimeLeft === 0 이면 만료 상태 (재발송 필요)
    useEffect(() => {
        if (!codeSent || codeTimeLeft <= 0) return
        const timer = setInterval(() => {
            setCodeTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [codeSent, codeTimeLeft > 0])  // codeTimeLeft > 0 → 재발송 시 새 타이머 시작

    // MM:SS 포맷 변환 유틸
    const formatTimeLeft = (seconds: number): string => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // POST /api/sms/random/{toPhone} — 6자리 인증번호 SMS 발송 + 서버 Map 저장 (유효 3분)
    const handleSendCode = async () => {
        if (!privacyConsent) {
            setVerifyError('개인정보 수집 및 이용에 동의해 주세요.')
            return
        }
        if (phoneRaw.length < 10) {
            setVerifyError('올바른 휴대폰 번호를 입력해 주세요.')
            return
        }
        setSendingCode(true)
        setVerifyError('')
        try {
            await apiClient.post(`/sms/random/${phoneRaw}`)
            setCodeSent(true)
            setCodeTimeLeft(180)  // 백엔드와 동일한 3분(180초) 타이머 시작
        } catch {
            setVerifyError('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
            setCodeSent(true)     // 실패해도 입력창은 열어둠 (개발 환경 대응)
            setCodeTimeLeft(180)
        } finally {
            setSendingCode(false)
        }
    }

    // POST /api/sms/comparison/{toPhone}/{inputCode} — 백엔드에서 실제 검증
    // 200 OK  → SUCCESS: 회원 조회/등록 후 인증 완료 처리
    // 400 Bad Request → MISMATCH | EXPIRED | INVALID_FORMAT: 백엔드 메시지 그대로 표시
    const handleVerify = async () => {
        if (verifyCode.length !== 6) {
            setVerifyError('인증번호 6자리를 입력해 주세요.')
            return
        }
        try {
            await apiClient.post(`/sms/comparison/${phoneRaw}/${verifyCode}`)
        } catch (err: any) {
            const msg = err?.response?.data
            setVerifyError(typeof msg === 'string' ? msg : '인증에 실패했습니다. 다시 시도해 주세요.')
            return
        }

        // 인증 성공 — 기존 회원 조회, 없으면 신규 등록
        // 주의: 회원 생성까지 성공한 경우에만 isVerified=true로 설정.
        //       실패 시 isVerified를 true로 두면 DB에 회원이 없는 채로 결제가 진행되어
        //       백엔드 savePaymentInfo에서 NoSuchElementException(→ 404)이 발생함.
        try {
            const {data} = await apiClient.get<{ phone: string; point: number; createAt: string }>(
                `/member/${phoneRaw}`
            )
            setMemberPoint(data.point)
            setIsVerified(true)
            setVerifyError('')
            setCancelMsg('')  // 이전에 표시된 "인증 필요" 안내 메시지 제거
            setShowPhoneModal(false)
        } catch {
            // 404: 미가입 회원 → 신규 등록 시도
            try {
                const {data} = await apiClient.post<{ phone: string; point: number; createAt: string }>(
                    `/member/${phoneRaw}`
                )
                setMemberPoint(data.point ?? 0)
                setIsVerified(true)
                setVerifyError('')
                setCancelMsg('')  // 이전에 표시된 "인증 필요" 안내 메시지 제거
                setShowPhoneModal(false)
            } catch (createErr) {
                // 회원 생성 실패 시 인증 완료 처리하지 않음
                // → isVerified가 false인 채로 유지되어 결제 진행 불가
                console.error('[PaymentPage] 회원 생성 실패', createErr)
                setVerifyError('회원 정보 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
            }
        }
    }

    // 전화 인증 모달 닫기 — 비회원으로 진행 (인증 없이도 결제 가능)
    const handlePhoneModalSkip = () => {
        setShowPhoneModal(false)
    }

    /* ── 쿠폰 상태 ── */
    const [couponInput, setCouponInput] = useState('')           // 입력 중인 쿠폰 번호
    const [appliedCoupon, setAppliedCoupon] = useState('')           // 검증 완료된 쿠폰 번호
    const [couponDiscount, setCouponDiscount] = useState<CouponDiscount | null>(null) // 할인 정보
    const [couponMsg, setCouponMsg] = useState('')           // 쿠폰 안내 메시지
    const [couponError, setCouponError] = useState('')           // 쿠폰 오류 메시지
    const [couponLoading, setCouponLoading] = useState(false)

    /**
     * 쿠폰 유효성 검증 + 할인 금액 계산
     * POST /api/coupon/auth?couponNum=xxx
     *
     * ─── 백엔드 응답 분기 ────────────────────────────────────────────────
     *  [현재] Boolean 반환:
     *    200 + true                   → 유효 (할인 금액 불명)
     *    202 + string 메시지          → IllegalStateException (만료·비활성화)
     *    400                          → IllegalArgumentException (쿠폰번호·정책 불일치)
     *    404                          → NoSuchElementException (쿠폰/정책 미존재)
     *
     *  [백엔드 수정 후] CouponDTO 반환:
     *    200 + CouponDTO              → 유효 + discountPolicy 포함 → 할인 금액 계산 가능
     *    나머지 에러 케이스는 동일
     *
     * ─── 할인 금액 계산 로직 (CouponDTO 반환 시) ──────────────────────
     *  discountType === 'WON'   → 고정금액: discountValue원 차감
     *  discountType === 'RATIO' → 할인율:  totalAmount × (discountValue / 100) 원 차감
     */
    const handleCouponApply = async () => {
        if (!couponInput.trim()) return
        setCouponLoading(true)
        setCouponError('')
        setCouponMsg('')
        try {
            const {data} = await apiClient.post(
                `/coupon/auth?couponNum=${encodeURIComponent(couponInput.trim())}`
            )

            // ── [백엔드 수정 후] CouponDTO 반환 케이스 ──────────────────────
            // data가 객체이고 discountPolicy가 있으면 CouponDTO 구조로 간주
            const isCouponDTO = data && typeof data === 'object' && data.discountPolicy

            if (isCouponDTO) {
                const policy = data.discountPolicy as {
                    discountType: 'WON' | 'RATIO'
                    discountValue: number
                }

                // 실제 차감 금액 계산
                //   WON:   discountValue원 고정 차감
                //   RATIO: totalAmount * (discountValue / 100) → 소수점 버림
                const discountAmount = policy.discountType === 'WON'
                    ? policy.discountValue
                    : Math.floor(Number(totalAmount) * policy.discountValue / 100)

                const discountLabel = policy.discountType === 'WON'
                    ? `${policy.discountValue.toLocaleString()}원 할인`
                    : `${policy.discountValue}% 할인 (−${discountAmount.toLocaleString()}원)`

                setAppliedCoupon(couponInput.trim())
                setCouponDiscount({type: policy.discountType, value: policy.discountValue, amount: discountAmount})
                setCouponMsg(`✓ 쿠폰 적용: ${discountLabel}`)
                setCouponInput('')
                return
            }

            // ── [현재] Boolean 반환 케이스 ──────────────────────────────────
            // GlobalExceptionHandler가 IllegalStateException → 202 Accepted + 메시지 문자열로 매핑
            // axios는 2xx를 성공으로 처리하므로 catch가 아닌 이쪽 분기로 옴
            const isValid = data === true || data === 'true'
            if (isValid) {
                // 유효 쿠폰이지만 할인 금액을 알 수 없음 → discountPolicy 없이 저장
                setAppliedCoupon(couponInput.trim())
                setCouponDiscount(null)
                setCouponMsg('✓ 유효한 쿠폰입니다. 결제 시 할인이 적용됩니다.')
                setCouponInput('')
            } else {
                // 202 + string: 만료 또는 비활성화된 쿠폰
                setCouponError('사용할 수 없는 쿠폰입니다. (만료되었거나 비활성화된 쿠폰)')
            }
        } catch (e: any) {
            // GlobalExceptionHandler HTTP 상태별 에러 메시지:
            //   400 → IllegalArgumentException: 쿠폰번호·정책 불일치 (이미 사용된 쿠폰 포함)
            //   404 → NoSuchElementException:   쿠폰 번호가 DB에 없음
            //   기타 → 서버 장애 또는 네트워크 오류
            const status = e?.response?.status
            if (status === 400) {
                setCouponError('유효하지 않은 쿠폰 번호입니다. (이미 사용되었을 수 있습니다.)')
            } else if (status === 404) {
                setCouponError('존재하지 않는 쿠폰 번호입니다.')
            } else {
                console.error('[PaymentPage] 쿠폰 검증 실패', e)
                setCouponError('쿠폰 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
            }
        } finally {
            setCouponLoading(false)
        }
    }

    /** 쿠폰 제거 — 할인 정보도 함께 초기화 */
    const handleCouponRemove = () => {
        setAppliedCoupon('')
        setCouponDiscount(null)
        setCouponMsg('')
        setCouponError('')
    }

    /* ── 포인트 사용 상태 ── */
    const [pointInput, setPointInput] = useState('')
    const [pointUsed, setPointUsed] = useState(0)

    /**
     * 포인트 적용 — 잔여 포인트 / 쿠폰 할인 후 남은 금액 중 작은 값으로 제한
     * 쿠폰 할인이 적용됐다면 그 이후의 금액을 기준으로 포인트 상한을 설정
     */
    const handlePointApply = () => {
        const p = Number(pointInput)
        if (!p || p <= 0) return
        // 포인트 최대 사용 가능액: 쿠폰 할인 후 금액 (totalAmount - couponDiscountAmount)
        const maxUsable = Math.max(Number(totalAmount) - couponDiscountAmount, 0)
        setPointUsed(Math.min(p, memberPoint, maxUsable))
    }

    /* ── 금액 계산 ── */
    /**
     * 쿠폰 할인 금액:
     *   - CouponDTO 반환 시: couponDiscount.amount (계산된 차감액)
     *   - Boolean 반환 시:   0 (프론트에서 금액 불명 → 백엔드가 처리)
     *
     * 계산 순서: totalAmount → 쿠폰 차감 → 포인트 차감 = finalAmount
     * totalAmount는 state 경유 시 string으로 올 수 있어 Number()로 방어
     */
    const couponDiscountAmount = couponDiscount?.amount ?? 0
    const finalAmount = useMemo(
        () => Math.max(Number(totalAmount) - couponDiscountAmount - Number(pointUsed), 0),
        [totalAmount, couponDiscountAmount, pointUsed],
    )
    const pointEarned = Math.floor(finalAmount * POINT_RATE)
    // 0원 결제 조건: 쿠폰·포인트로 전액 차감됐을 때 OR 원래 금액이 0
    const isZeroPayment = finalAmount === 0

    /* ── Toss SDK 초기화 ── */
    const clientKey = 'test_ck_eqRGgYO1r5MyEOZWJX4nrQnN2Eya'
    const customerKey = 'fbAUhfT1MpEwaLbEuEzvc'
    // TossPaymentsSDK 타입: loadTossPayments()의 resolve 값 (null 초기값이라 any 허용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tossInstance, setTossInstance] = useState<any>(null)

    useEffect(() => {
        const initSDK = async () => {
            try {
                const tp = await loadTossPayments(clientKey)
                setTossInstance(tp as any)
            } catch (err) {
                console.error('[PaymentPage] Toss SDK 초기화 실패', err)
            }
        }
        void initSDK()
    }, [])

    /* ── 결제 실행 ── */
    const handlePay = async () => {
        // 결제 진행 중 메시지 초기화
        setCancelMsg('')

        // localStorage에 결제 진행 중 데이터 저장 (결과 페이지 / failUrl 복원용)
        const pendingBooking = {
            movieTitle,
            schedule,                              // Schedule 타입 (scheduleId, date, startTime, etc.)
            selectedSeats,
            selectedSeatObjects,
            persons,
            totalPersons,
            totalAmount,
            pointUsed,
            pointEarned,
            finalAmount,
            phone: phoneRaw,          // 인증한 전화번호 (숫자만)
            theater,
            seatPolicy,
            payMethod: isZeroPayment ? 'POINT' : 'CARD',
            couponNum: appliedCoupon,     // 검증 완료된 쿠폰 번호 (없으면 '')
            couponDiscount,                        // 쿠폰 할인 정보 (CouponDTO 반환 시 채워짐, 없으면 null)
            couponDiscountAmount,                  // 실제 할인된 금액 (0이면 할인 없음)
            timestamp: Date.now(),
        }
        localStorage.setItem('pending_booking_data', JSON.stringify(pendingBooking))

        // 포인트 전액 결제: Toss 결제창 없이 바로 결과 페이지로
        if (isZeroPayment) {
            navigate(`/payment/result?orderId=${crypto.randomUUID()}&amount=0&paymentKey=point`)
            return
        }

        if (!tossInstance) {
            alert('결제 모듈을 초기화하는 중입니다. 잠시 후 다시 시도해 주세요.')
            return
        }

        setIsPaying(true)  // 결제창 열기 시작 → 버튼 비활성화

        try {
            // Toss CARD 결제 요청 (백엔드 결제 루트: CARD 단일)
            // - PC:     팝업 창 열림. 사용자가 닫으면 promise reject (PAY_PROCESS_CANCELED)
            // - Mobile: 현재 페이지 리디렉션. 취소 시 failUrl로 돌아옴
            const payment = (tossInstance as any).payment({customerKey})
            await payment.requestPayment({
                method: 'CARD',
                amount: {currency: 'KRW', value: finalAmount},
                orderId: crypto.randomUUID(),
                orderName: `${movieTitle} 예매 (${totalPersons}명)`,
                successUrl: `${window.location.origin}/payment/result`,
                failUrl: `${window.location.origin}/payment`,
                customerMobilePhone: phoneRaw || undefined,
            })
            // successUrl 리디렉션이 일어나면 여기는 실행되지 않음
        } catch (err: any) {
            // PAY_PROCESS_CANCELED: 사용자가 결제창을 직접 닫은 경우 (PC 팝업 모드)
            // 에러로 처리하지 않고 조용히 취소 안내만 표시
            if (err?.code === 'PAY_PROCESS_CANCELED' || err?.message?.includes('cancel')) {
                setCancelMsg('결제가 취소되었습니다. 다시 시도하려면 버튼을 눌러주세요.')
                // localStorage는 유지 (사용자가 재시도할 수 있도록)
            } else {
                // 그 외 실제 오류
                console.error('[PaymentPage] 결제 요청 에러', err)
                setCancelMsg('결제 중 오류가 발생했습니다. 다시 시도해 주세요.')
            }
        } finally {
            // 어떤 경우든 결제창이 닫히면 버튼 다시 활성화
            setIsPaying(false)
        }
    }

    /* ── 스케줄 없으면 홈으로 (모든 훅 선언 완료 후 guard) ── */
    // failUrl 리디렉션 + localStorage 복원 실패 시에만 도달
    if (!schedule) {
        navigate('/')
        return null
    }

    /* ── 렌더링 ── */
    return (
        <div style={pageWrap}>

            {/* ══════════════════════════════════════════════════
          [모달 1] 적립 여부 확인 — 진입 시 가장 먼저 표시
          "포인트 적립하기" → 전화 인증 모달 오픈
          "비회원으로 진행" → 모달 닫고 바로 결제 페이지 사용
          ══════════════════════════════════════════════════ */}
            {showPointModal && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <div style={{textAlign: 'center', marginBottom: 28}}>
                            <Gift size={48} color="var(--color-brand-default)" style={{marginBottom: 12}}/>
                            <h3 style={modalTitle}>포인트 적립</h3>
                            <p style={modalDesc}>
                                포인트 적립을 원하시나요?<br/>
                                휴대폰 인증 후 이번 결제 금액의 일부가 적립됩니다.
                            </p>
                        </div>

                        {/* 적립하기 버튼 — 전화 인증 모달로 이동 */}
                        <button
                            onClick={() => {
                                setShowPointModal(false)
                                setShowPhoneModal(true)
                            }}
                            style={{...modalBtnYes, marginBottom: 10}}
                        >
                            포인트 적립하기
                        </button>

                        {/* 비회원 진행 버튼 — 인증 없이 결제 */}
                        <button
                            onClick={() => setShowPointModal(false)}
                            style={modalBtnNo}
                        >
                            비회원으로 진행
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
          [모달 2] 회원 인증 (전화번호 — 선택 사항)
          적립 여부 모달에서 "포인트 적립하기" 선택 시 표시.
          닫기(X) 버튼 클릭 시 비회원으로 결제 진행.
          ══════════════════════════════════════════════════ */}
            {showPhoneModal && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <button onClick={handlePhoneModalSkip} style={modalCloseBtn} aria-label="모달 닫기">
                            <X size={20}/>
                        </button>
                        <div style={{textAlign: 'center', marginBottom: 24}}>
                            <Phone size={48} color="var(--color-brand-default)" style={{marginBottom: 12}}/>
                            <h3 style={modalTitle}>휴대폰 인증</h3>
                            <p style={modalDesc}>
                                포인트 적립을 위해 휴대폰을 인증해 주세요.<br/>
                                미가입 시 자동으로 회원 가입됩니다.
                            </p>
                        </div>

                        {/* ── 개인정보 수집 동의 ──
                인증번호 발송 전에 반드시 동의 체크가 필요.
                동의 미체크 시 발송 버튼 비활성화.
                "자세히 보기" 클릭 시 개인정보 전문 모달 팝업. */}
                        <div style={privacyRow}>
                            <label style={privacyLabel}>
                                <input
                                    type="checkbox"
                                    checked={privacyConsent}
                                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                                    style={{
                                        width: 16,
                                        height: 16,
                                        accentColor: 'var(--color-brand-default)',
                                        cursor: 'pointer'
                                    }}
                                />
                                <span>개인정보 수집 및 이용에 동의합니다. <span
                                    style={{color: 'var(--color-brand-default)', fontSize: 12}}>(필수)</span></span>
                            </label>
                            {/* 자세히 보기 버튼 — 클릭 시 개인정보 전문 모달 오픈 */}
                            <button
                                type="button"
                                onClick={() => setShowPrivacyModal(true)}
                                style={privacyDetailBtn}
                            >
                                자세히 보기
                            </button>
                        </div>

                        {/* 전화번호 입력 */}
                        <div style={{display: 'flex', gap: 10, marginBottom: 12}}>
                            <input
                                type="tel"
                                value={formatPhone(phoneRaw)}
                                onChange={handlePhoneChange}
                                placeholder="010-0000-0000"
                                style={{...inputStyle, flex: 1}}
                                maxLength={13}
                            />
                            {/* 발송 중(sendingCode)이면 버튼 비활성화 + 텍스트 변경
                                한 번 발송 후에도 재발송 가능하도록 codeSent는 disabled 조건에서 제외 */}
                            <button
                                onClick={handleSendCode}
                                disabled={!privacyConsent || sendingCode}
                                style={{
                                    ...smallBtn,
                                    opacity: (!privacyConsent || sendingCode) ? 0.6 : 1
                                }}
                                title={!privacyConsent ? '개인정보 수집 및 이용에 동의해 주세요.' : undefined}
                            >
                                {sendingCode ? '발송 중...' : codeSent ? '재발송' : '인증번호 발송'}
                            </button>
                        </div>

                        {/* 인증번호 입력 — 발송 후 표시 */}
                        {codeSent && (
                            <>
                                {/* 유효시간 표시 바 */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    marginBottom: 6, padding: '6px 4px',
                                }}>
                                    <span style={{fontSize: 12, color: 'var(--text-muted)'}}>
                                        인증번호 유효시간
                                    </span>
                                    <span style={{
                                        fontSize: 14, fontWeight: 700,
                                        // 30초 이하면 빨간색으로 강조
                                        color: codeTimeLeft <= 30
                                            ? '#e03c3c'
                                            : codeTimeLeft === 0
                                                ? '#e03c3c'
                                                : 'var(--color-brand-default)',
                                    }}>
                                        {codeTimeLeft > 0 ? formatTimeLeft(codeTimeLeft) : '만료됨 — 재발송해 주세요'}
                                    </span>
                                </div>

                                <div style={{display: 'flex', gap: 10, marginBottom: 8}}>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value)}
                                        placeholder="인증번호 6자리"
                                        // 만료 시 입력창 비활성화
                                        disabled={codeTimeLeft === 0}
                                        style={{
                                            ...inputStyle, flex: 1,
                                            opacity: codeTimeLeft === 0 ? 0.5 : 1,
                                        }}
                                        maxLength={6}
                                    />
                                    <button
                                        onClick={handleVerify}
                                        disabled={codeTimeLeft === 0}
                                        style={{
                                            ...smallBtn,
                                            opacity: codeTimeLeft === 0 ? 0.5 : 1,
                                            cursor: codeTimeLeft === 0 ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        확인
                                    </button>
                                </div>
                            </>
                        )}

                        {verifyError && (
                            <p style={{color: '#e03c3c', fontSize: 13, marginBottom: 8}}>{verifyError}</p>
                        )}

                        <p style={{fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20}}>
                            <Info size={12} style={{marginRight: 4, verticalAlign: 'middle'}}/>
                            인증 후 서비스를 정상적으로 이용하실 수 있습니다.
                        </p>

                        <button onClick={handlePhoneModalSkip} style={modalBtnNo}>
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
          [모달 3] 개인정보 수집·이용 전문 모달
          "자세히 보기" 클릭 시 표시. 닫기 버튼으로만 종료.
          ══════════════════════════════════════════════════ */}
            {showPrivacyModal && (
                <div style={modalOverlay}>
                    <div style={{...modalBox, maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
                        {/* 헤더 */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16
                        }}>
                            <h3 style={{...modalTitle, margin: 0}}>개인정보 수집 및 이용 동의</h3>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                style={modalCloseBtn}
                                aria-label="닫기"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        {/* 전문 스크롤 영역 */}
                        <div style={privacyScrollBox}>
                            <p style={privacySection}><strong>1. 수집하는 개인정보 항목</strong></p>
                            <p style={privacyText}>휴대폰 번호</p>

                            <p style={privacySection}><strong>2. 개인정보 수집·이용 목적</strong></p>
                            <p style={privacyText}>
                                영화 예매 서비스 제공, 예매 확인 및 티켓 발송,<br/>
                                포인트 적립 및 사용 관리, 쿠폰 서비스 제공
                            </p>

                            <p style={privacySection}><strong>3. 보유 및 이용 기간</strong></p>
                            <p style={privacyText}>
                                회원 탈퇴 또는 서비스 이용 계약 종료 시까지.<br/>
                                단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
                            </p>

                            <p style={privacySection}><strong>4. 개인정보 수집·이용 거부 권리</strong></p>
                            <p style={privacyText}>
                                귀하는 개인정보 수집·이용에 대한 동의를 거부할 수 있습니다.<br/>
                                단, 동의 거부 시 포인트 적립 및 쿠폰 서비스 이용이 제한됩니다.
                            </p>

                            <p style={privacySection}><strong>5. 제3자 제공</strong></p>
                            <p style={privacyText}>
                                수집된 개인정보는 서비스 제공 목적 외에는 사용되지 않으며,<br/>
                                법령에 근거한 경우를 제외하고 제3자에게 제공되지 않습니다.
                            </p>
                        </div>

                        {/* 동의 및 닫기 버튼
                modalBtnYes / modalBtnNo 는 단독 full-width 버튼용으로 만들어진 스타일이라
                2-버튼 flex row 에서 그대로 쓰면 한 쪽이 100% 를 점령함.
                → display/width 를 override 하고 flex:1 로 균등 분배 */}
                        <div style={{display: 'flex', gap: 10, marginTop: 16}}>
                            <button
                                onClick={() => {
                                    setPrivacyConsent(true);
                                    setShowPrivacyModal(false)
                                }}
                                style={{...modalBtnYes, display: 'block', width: 'auto', flex: 1}}
                            >
                                동의하고 닫기
                            </button>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                style={{...modalBtnNo, display: 'block', width: 'auto', flex: 1}}
                            >
                                닫기
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
                    <dt style={dt}>영화</dt>
                    <dd style={dd}>{movieTitle}</dd>

                    <dt style={dt}>일시</dt>
                    <dd style={dd}>
                        {schedule.date ?? ''} {schedule.startTime ?? ''} ~ {schedule.endTime ?? ''}
                    </dd>

                    <dt style={dt}>상영관</dt>
                    <dd style={dd}>{schedule.theaterName ?? `${schedule.no ?? ''}관`}</dd>

                    <dt style={dt}>좌석</dt>
                    <dd style={dd}>{selectedSeats.join(', ')}</dd>

                    <dt style={dt}>인원</dt>
                    <dd style={dd}>
                        {PERSON_TYPES.filter(({type}) => (persons[type] ?? 0) > 0)
                            .map(({type, label}) => `${label} ${persons[type]}명`)
                            .join(', ') || '–'}
                    </dd>
                </dl>
            </div>

            {/* ── 금액 계산 ── */}
            <div style={card}>
                <h3 style={cardTitle}>금액</h3>

                {/* 좌석 타입별 상세 */}
                {selectedSeatObjects.length > 0 && (() => {
                    const byType: Record<string, number> = {}
                    selectedSeatObjects.forEach((s: any) => {
                        const t = s?.seatType ?? 'NORMAL'
                        byType[t] = (byType[t] ?? 0) + 1
                    })
                    return Object.entries(byType).map(([type, cnt]) => (
                        <div key={type}
                             style={{...priceRow, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4}}>
                            <span>{SEAT_TYPE_LABEL[type] ?? '일반'} {cnt}석</span>
                        </div>
                    ))
                })()}

                <div style={priceRow}>
                    <span>결제 금액</span>
                    <span>{totalAmount.toLocaleString()}원</span>
                </div>

                {/* 조조 할인 내역 표시 — totalAmount에 이미 반영된 금액을 정보성으로 보여줌 */}
                {earlyBirdAmount > 0 && totalPersons > 0 && (
                    <div style={{...priceRow, color: 'var(--color-brand-default)', fontSize: 13}}>
                        <span>조조 할인 ({totalPersons}명)</span>
                        <span>−{(earlyBirdAmount * totalPersons).toLocaleString()}원 포함</span>
                    </div>
                )}

                {/* 쿠폰 할인 표시
            - CouponDTO 반환 시: couponDiscount.amount 기반 실제 금액 표시
            - Boolean 반환 시:   couponDiscount=null → "결제 시 할인" 안내만 */}
                {appliedCoupon && (
                    <div style={{...priceRow, color: '#00ad74'}}>
                        <span>쿠폰 ({appliedCoupon})</span>
                        <span>
              {couponDiscount
                  ? `−${couponDiscount.amount.toLocaleString()}원`
                  : '결제 시 할인'}
            </span>
                    </div>
                )}

                {pointUsed > 0 && (
                    <div style={{...priceRow, color: '#00ad74'}}>
                        <span>포인트 사용</span>
                        <span>−{pointUsed.toLocaleString()}원</span>
                    </div>
                )}

                <div style={{
                    ...priceRow,
                    borderTop: '1px solid var(--border-default)',
                    paddingTop: 14, marginTop: 10,
                }}>
                    <span style={{fontWeight: 700, fontSize: 18}}>최종 결제 금액</span>
                    <span style={{fontWeight: 800, fontSize: 22, color: 'var(--color-brand-default)'}}>
            {finalAmount.toLocaleString()}원
          </span>
                </div>

                {/* 포인트 적립 예정 (인증 완료 시 표시) or 인증 안내 */}
                <div style={{borderTop: '1px dashed var(--border-default)', marginTop: 14, paddingTop: 14}}>
                    {isVerified ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, color: '#00ad74', fontSize: 14}}>
                            <Gift size={15}/>
                            <span>적립 예정: <strong>{pointEarned.toLocaleString()}P</strong></span>
                        </div>
                    ) : (
                        // 비회원 상태 — 버튼 클릭 시 적립 여부 모달 재오픈
                        <button onClick={() => setShowPointModal(true)} style={pointCtaBtn}>
                            <Phone size={16} style={{marginRight: 8}}/>
                            회원 인증 후 포인트 적립 가능
                        </button>
                    )}
                </div>
            </div>

            {/* ── 쿠폰 입력 섹션 ── */}
            <div style={card}>
                <h3 style={cardTitle}>
                    <Tag size={16} style={{marginRight: 8, verticalAlign: 'middle'}}/>
                    쿠폰 등록
                </h3>

                {appliedCoupon ? (
                    /* 쿠폰 적용 완료 상태 */
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <CheckCircle size={18} color="#00ad74"/>
                        <span style={{fontSize: 15, fontWeight: 600, color: '#00ad74', flex: 1}}>
              {appliedCoupon} 적용 완료
            </span>
                        <button onClick={handleCouponRemove} style={cancelBtn}>제거</button>
                    </div>
                ) : (
                    /* 쿠폰 입력 폼 */
                    <>
                        <div style={{display: 'flex', gap: 10}}>
                            <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleCouponApply()
                                }}
                                placeholder="쿠폰 번호 입력"
                                style={inputStyle}
                            />
                            <button
                                onClick={handleCouponApply}
                                disabled={couponLoading || !couponInput.trim()}
                                style={{
                                    ...smallBtn,
                                    opacity: (couponLoading || !couponInput.trim()) ? 0.6 : 1,
                                }}
                            >
                                {couponLoading ? '확인 중...' : '적용'}
                            </button>
                        </div>
                        {couponMsg && <p style={{fontSize: 13, color: '#00ad74', marginTop: 8}}>{couponMsg}</p>}
                        {couponError && <p style={{fontSize: 13, color: '#e03c3c', marginTop: 8}}>{couponError}</p>}
                    </>
                )}
            </div>

            {/* ── 포인트 사용 (인증 완료 시 자동 활성화) ── */}
            {isVerified && (
                <div style={card}>
                    <h3 style={cardTitle}>
                        <Coins size={16} style={{marginRight: 8, verticalAlign: 'middle'}}/>
                        포인트 사용
                    </h3>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 14,
                        color: '#00ad74',
                        fontSize: 14
                    }}>
                        <CheckCircle size={16}/>
                        <span>{formatPhone(phoneRaw)} 인증 완료</span>
                    </div>

                    {/* 잔여 포인트 */}
                    <div style={pointBalanceBox}>
                        <span style={{fontSize: 14, color: 'var(--text-secondary)'}}>잔여 포인트</span>
                        <span style={{fontSize: 20, fontWeight: 800, color: 'var(--color-brand-default)'}}>
              {memberPoint.toLocaleString()}P
            </span>
                    </div>

                    {pointUsed > 0 ? (
                        <div style={{
                            color: '#00ad74',
                            fontSize: 15,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <CheckCircle size={18}/>
                            {pointUsed.toLocaleString()}P 적용 완료
                            <button
                                onClick={() => {
                                    setPointUsed(0);
                                    setPointInput('')
                                }}
                                style={{...cancelBtn, marginLeft: 'auto'}}
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <div style={{display: 'flex', gap: 10}}>
                            <input
                                type="number"
                                value={pointInput}
                                onChange={(e) => setPointInput(e.target.value)}
                                placeholder="사용할 포인트 입력"
                                style={inputStyle}
                                min={0}
                                max={memberPoint}
                            />
                            <button
                                onClick={() => {
                                    // 포인트 전액 사용 = min(잔여포인트, 쿠폰 할인 후 남은 금액)
                                    const maxUsable = Math.max(Number(totalAmount) - couponDiscountAmount, 0)
                                    setPointInput(String(Math.min(memberPoint, maxUsable)))
                                }}
                                style={{
                                    ...smallBtn,
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--color-brand-default)',
                                    color: 'var(--color-brand-default)',
                                }}
                            >
                                전액
                            </button>
                            <button onClick={handlePointApply} style={smallBtn}>적용</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── 결제 버튼 ── */}
            {/* 결제 수단 선택 없음: 백엔드 결제 루트는 CARD(토스) 단일 */}
            <div style={{marginTop: 16}}>
                {/* 결제 수단 안내 */}
                {!isZeroPayment && (
                    <div style={methodInfoBox}>
                        <CreditCard size={18} color="var(--color-brand-default)"/>
                        <span style={{fontSize: 14, color: 'var(--text-secondary)', marginLeft: 8}}>
              카드 결제 (토스페이먼츠)
            </span>
                    </div>
                )}

                {/* 취소/오류 안내 메시지 (팝업 닫기 or failUrl 복귀 시) */}
                {cancelMsg && (
                    <p style={{
                        fontSize: 14, color: '#e03c3c', textAlign: 'center',
                        marginBottom: 12, padding: '10px 16px',
                        background: 'rgba(224,60,60,0.08)',
                        borderRadius: 10, border: '1px solid rgba(224,60,60,0.2)',
                    }}>
                        {cancelMsg}
                    </p>
                )}

                <button
                    onClick={handlePay}
                    style={{
                        ...payBtn,
                        // Toss SDK 미초기화 or 결제 진행 중이면 흐리게
                        opacity: (isZeroPayment || (!!tossInstance && !isPaying)) ? 1 : 0.6,
                        cursor: isPaying ? 'not-allowed' : 'pointer',
                    }}
                    // 0원 결제: 항상 활성 / 카드 결제: SDK 준비 + 결제창 닫혀있을 때만 활성
                    disabled={(!isZeroPayment && !tossInstance) || isPaying}
                >
                    {isPaying
                        ? '결제 진행 중...'
                        : isZeroPayment
                            ? '0원 결제하기'
                            : `${finalAmount.toLocaleString()}원 카드 결제하기`}
                </button>
            </div>
        </div>
    )
}

/* ── 스타일 ─────────────────────────────────────────────────── */
const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 40px',
}
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
const modalBtnYes: React.CSSProperties = {
    display: 'block', width: '100%', padding: '20px 0',
    background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 14,
    fontSize: 18, fontWeight: 800, cursor: 'pointer',
}
const modalBtnNo: React.CSSProperties = {
    display: 'block', width: '100%', padding: '16px 0',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-default)',
    borderRadius: 14, color: 'var(--text-muted)',
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
}

/* ── 개인정보 동의 관련 스타일 ── */
/** 동의 행: 체크박스 + 레이블 + 자세히보기 버튼을 가로로 배치 */
const privacyRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', marginBottom: 14,
    background: 'var(--bg-base)', borderRadius: 10,
    border: '1px solid var(--border-default)',
}
/** 체크박스 + 텍스트 묶음 */
const privacyLabel: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none',
}
/** 자세히 보기 링크 스타일 버튼 */
const privacyDetailBtn: React.CSSProperties = {
    background: 'none', border: 'none',
    color: 'var(--color-brand-default)', fontSize: 13,
    cursor: 'pointer', textDecoration: 'underline', flexShrink: 0,
}
/** 개인정보 전문 스크롤 박스 */
const privacyScrollBox: React.CSSProperties = {
    flex: 1, overflowY: 'auto', padding: '0 4px',
    maxHeight: '50vh',
}
const privacySection: React.CSSProperties = {
    fontSize: 14, color: 'var(--text-primary)', margin: '16px 0 6px',
}
const privacyText: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 4px',
}
const pointCtaBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '12px 0',
    background: 'rgba(255,184,0,0.07)',
    border: '1px solid rgba(255,184,0,0.3)',
    borderRadius: 10, color: 'var(--color-brand-default)',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
}
const methodInfoBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    padding: '14px 18px', marginBottom: 12,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 12,
}
const pageWrap: React.CSSProperties = {maxWidth: 680, margin: '0 auto', padding: '32px 40px 80px'}
const pageTitle: React.CSSProperties = {fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24}
const card: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderRadius: 16,
    padding: '22px 24px',
    marginBottom: 18
}
const cardTitle: React.CSSProperties = {fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16}
const dl: React.CSSProperties = {display: 'grid', gridTemplateColumns: '64px 1fr', gap: '10px 14px'}
const dt: React.CSSProperties = {color: 'var(--text-muted)', fontSize: 14, fontWeight: 600}
const dd: React.CSSProperties = {color: 'var(--text-secondary)', fontSize: 14, margin: 0}
const priceRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
    flex: 1, width: '100%', padding: '14px 16px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-default)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 16, outline: 'none', boxSizing: 'border-box',
}
const smallBtn: React.CSSProperties = {
    padding: '14px 20px',
    background: 'var(--color-brand-default)', color: 'var(--primitive-neutral-900)',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
const cancelBtn: React.CSSProperties = {
    padding: '8px 14px', background: 'transparent',
    border: '1px solid var(--border-default)', borderRadius: 8,
    color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
}
const pointBalanceBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'var(--bg-base)',
    border: '1px solid var(--border-default)', borderRadius: 10, marginBottom: 10,
}
const payBtn: React.CSSProperties = {
    width: '100%', padding: '20px 0',
    background: 'var(--color-brand-default)', border: 'none',
    borderRadius: 14, color: '#000', fontSize: 18, fontWeight: 800, cursor: 'pointer',
}

export default PaymentPage
