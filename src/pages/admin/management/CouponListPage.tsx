/**
 * CouponListPage.tsx — 쿠폰 관리
 *
 * 기능:
 *  1. 쿠폰 목록 조회  → GET  /api/admin/discount-policy/coupon/list
 *  2. 쿠폰 발행       → POST /api/admin/discount-policy/coupon/{policyId}?count={n}
 *     - 쿠폰을 발행할 할인 정책(COUPON 타입)을 선택 후 장수 입력 후 버튼 클릭
 *     - 백엔드 @RequestParam(defaultValue="1") int count 에 대응
 *
 * CouponDTO (백엔드 기준):
 *   couponNum  String  — 쿠폰 번호 (PK, 12자리)
 *   policyId   Long    — 연결된 할인 정책 ID
 *   status     boolean — 사용 가능 여부 (true=사용가능, false=사용완료)
 *
 * 할인 정책은 condition_type=COUPON인 것만 쿠폰 발행 가능하므로
 * 드롭다운에는 COUPON 타입 정책만 필터링하여 표시.
 */
import {useCallback, useEffect, useState} from 'react'
import apiClient from '../../../api/apiClient.ts'
import {DiscountPolicy} from './PolicyListPage'
import { useAuth } from '../../../context/AuthContext'

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

/** 쿠폰 1건 타입 (CouponDTO 대응) */
interface Coupon {
    couponNum: string   // 쿠폰 번호 (12자리 고유 식별자)
    policyId: number   // 연결된 할인 정책 ID
    status: boolean  // true=사용가능, false=사용완료
}

function CouponListPage() {
    // ROLE_POLICY_EDIT 권한이 있어야 쿠폰 발행 폼이 표시됨
    const { hasPermission } = useAuth()
    const canEdit = hasPermission('ROLE_POLICY_EDIT')

    const [loading, setLoading] = useState(true)
    const [coupons, setCoupons] = useState<Coupon[]>([])
    // 쿠폰 발행 가능한 정책 목록 (condition_type = COUPON 인 것만)
    const [policies, setPolicies] = useState<DiscountPolicy[]>([])
    // 드롭다운에서 선택된 정책 ID
    const [selectedPolicyId, setSelectedPolicyId] = useState<number | ''>('')
    const [issuing, setIssuing] = useState(false) // 발행 중 여부
    const [msg, setMsg] = useState('')     // 피드백 메시지

    /* ────────────────────────────────────────────────────────
       [추가] 발행 수량 상태
       - 백엔드 POST /coupon/{policyId}?count=n 의 count 파라미터에 대응
       - 최소 1장, 최대 100장으로 제한
    ──────────────────────────────────────────────────────── */
    const [issueCount, setIssueCount] = useState(1) // 한 번에 발행할 쿠폰 장 수 (기본값 1)

    /* ────────────────────────────────────────────────────────
       [추가] 페이징 관련 상태 관리
       ──────────────────────────────────────────────────────── */
    const [currentPage, setCurrentPage] = useState(1) // 현재 보고 있는 페이지 번호 (1부터 시작)
    const [totalPages, setTotalPages] = useState(1)  // 서버에서 받아온 전체 페이지 수
    const [totalItems, setTotalItems] = useState(0)  // 전체 쿠폰 개수 (UI 표시용)

    /* ────────────────────────────────────────────────────────
       데이터 로딩 함수: 쿠폰 목록 조회
       - page 인자를 받아 해당 페이지의 데이터를 서버에 요청.
       - useCallback을 사용하여 불필요한 함수 재생성을 방지.
    ──────────────────────────────────────────────────────── */
    const fetchCoupons = useCallback(async (page: number) => {
        try {
            setLoading(true)
            // 서버의 @RequestParam Integer page에 대응
            const res = await apiClient.get('/admin/discount-policy/coupon/list', {
                params: {page: page}
            })

            // Page<CouponDTO>의 content 배열과 페이징 정보를 상태에 저장
            const {content, totalPages, totalElements} = res.data

            // 사용 가능(status=true)이 상단에 오도록 정렬
            // 참고: 페이지 단위로 가져오는 구조라 현재 페이지 내 정렬만 적용됨
            const sorted = [...(content ?? [])].sort((a: Coupon, b: Coupon) => {
                if (a.status === b.status) return 0
                return a.status ? -1 : 1 // true(사용 가능) → 앞으로
            })

            setCoupons(sorted)
            setTotalPages(totalPages ?? 1)
            setTotalItems(totalElements ?? 0)
        } catch (e) {
            console.error('[CouponListPage] 쿠폰 목록 로딩 실패:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    /* ────────────────────────────────────────────────────────
       초기 1회 실행: 할인 정책 목록 로드
       ──────────────────────────────────────────────────────── */
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 전체 할인 정책 fetch — 드롭다운 구성용
                const policyRes = await apiClient.get('/admin/discount-policy/list')
                const allPolicies = policyRes.data as DiscountPolicy[]
                setPolicies(allPolicies)

                // 발행 드롭다운 기본값 설정 (COUPON 타입 중 첫 번째)
                const couponPolicies = allPolicies.filter((p) => p.conditionType === 'COUPON')
                if (couponPolicies.length > 0) {
                    setSelectedPolicyId(couponPolicies[0].id)
                }
            } catch (e) {
                console.error('[CouponListPage] 초기 데이터 로딩 실패:', e)
            }
        }
        void fetchInitialData()
    }, [])

    /* ────────────────────────────────────────────────────────
       페이지 변경 감지: currentPage가 바뀔 때마다 서버에서 데이터를 다시 가져옴
       ──────────────────────────────────────────────────────── */
    useEffect(() => {
        void fetchCoupons(currentPage)
    }, [currentPage, fetchCoupons])

    /**
     * 쿠폰 발행 함수
     * POST /api/admin/discount-policy/coupon/{policyId}?count={issueCount}
     *
     * 백엔드: @RequestParam(defaultValue = "1") int count
     * count=1 이면 1장, count=5 이면 5장 발행.
     */
    const handleIssueCoupon = async () => {
        if (selectedPolicyId === '') {
            alert('쿠폰을 발행할 정책을 선택해 주세요.')
            return
        }
        if (issueCount < 1 || issueCount > 100) {
            alert('발행 수량은 1~100장 사이여야 합니다.')
            return
        }

        setIssuing(true)
        try {
            // count 파라미터를 쿼리스트링으로 전달
            // axios의 params 옵션: { count: 5 } → URL에 ?count=5 자동 추가
            await apiClient.post(
                `/admin/discount-policy/coupon/${selectedPolicyId}`,
                null,                       // POST body 없음 (백엔드가 @RequestParam으로 받음)
                {params: {count: issueCount}}
            )

            setMsg(`쿠폰 ${issueCount}장이 성공적으로 발행되었습니다.`)

            // 발행 직후에는 최신 쿠폰을 확인하기 위해 1페이지로 강제 이동 및 갱신
            setCurrentPage(1)
            void fetchCoupons(1)
        } catch (e) {
            console.error('[CouponListPage] 쿠폰 발행 실패:', e)
            alert('쿠폰 발행에 실패했습니다.')
        } finally {
            setIssuing(false)
            setTimeout(() => setMsg(''), 3000)
        }
    }

    /* ── 사용 가능 / 사용 완료 건수 집계 (현재 페이지 내에서 계산) ── */
    const availableCount = coupons.filter((c) => c.status).length
    const usedCount = coupons.filter((c) => !c.status).length

    return (
        <div>

            {/* ── 쿠폰 발행 섹션 ── */}
            <div style={sectionCard}>
                <div style={sectionHeader}>
                    <div>
                        <h2 style={sectionTitle}>쿠폰 발행</h2>
                        <p style={sectionDesc}>
                            COUPON 타입 할인 정책에 연결된 쿠폰을 새로 발행합니다.
                        </p>
                    </div>
                </div>

                {msg && <div style={msgBox}>{msg}</div>}

                {/* ROLE_POLICY_EDIT 없으면 쿠폰 발행 폼 전체 숨김 */}
                {canEdit ? (
                    policies.filter((p) => p.conditionType === 'COUPON').length === 0 ? (
                        // COUPON 타입 정책이 없으면 안내 문구 표시
                        <div style={emptyNotice}>
                            등록된 COUPON 타입 할인 정책이 없습니다. 먼저 정책 목록에서 정책을 등록해 주세요.
                        </div>
                    ) : (
                        <div style={issueRow}>
                            {/* 정책 선택 드롭다운 — COUPON 타입 정책만 필터링 */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                                <label style={fieldLabel}>정책 선택</label>
                                <select
                                    value={selectedPolicyId}
                                    onChange={(e) => setSelectedPolicyId(Number(e.target.value))}
                                    style={selectStyle}
                                >
                                    {policies.filter((p) => p.conditionType === 'COUPON').map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.id}] {p.policyName}
                                            {' — '}
                                            {p.discountType === 'RATIO' ? `${p.discountValue}%` : `${p.discountValue.toLocaleString()}원`} 할인
                                            {p.activation ? '' : ' (비활성)'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* [추가] 발행 수량 입력 필드
                                백엔드 POST /coupon/{policyId}?count=n 의 count 파라미터에 대응.
                                1~100 범위로 제한. */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                                <label style={fieldLabel}>발행 수량</label>
                                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={issueCount}
                                        onChange={(e) => {
                                            // 1~100 범위로 클램핑
                                            const v = Math.max(1, Math.min(100, Number(e.target.value) || 1))
                                            setIssueCount(v)
                                        }}
                                        style={countInput}
                                    />
                                    <span style={{fontSize: 13, color: 'var(--text-muted)'}}>장</span>
                                </div>
                            </div>

                            {/* 발행 버튼 */}
                            <button
                                onClick={handleIssueCoupon}
                                disabled={issuing || selectedPolicyId === ''}
                                style={{...issueBtn, opacity: issuing ? 0.7 : 1, alignSelf: 'flex-end'}}
                            >
                                {issuing ? '발행 중...' : `쿠폰 ${issueCount}장 발행`}
                            </button>
                        </div>
                    )
                ) : (
                    // 권한 없는 경우 안내 문구
                    <div style={emptyNotice}>
                        쿠폰 발행 권한이 없습니다.
                    </div>
                )}
            </div>

            {/* ── 쿠폰 목록 섹션 ── */}
            <div style={sectionCard}>
                <div style={sectionHeader}>
                    <div>
                        <h2 style={sectionTitle}>쿠폰 목록</h2>
                        <p style={sectionDesc}>
                            전체 {totalItems}건 (현재 페이지: {currentPage} / {totalPages})
                            &nbsp;·&nbsp;
                            {/* 사용 가능 건수 표시 (초록색) */}
                            <span style={{color: 'var(--color-success-main)', fontWeight: 600}}>
                사용 가능 {availableCount}건
              </span>
                            &nbsp;/&nbsp;
                            {/* 사용 완료 건수 표시 (빨간색) */}
                            <span style={{color: 'var(--color-error-main)', fontWeight: 600}}>
                사용 완료 {usedCount}건
              </span>
                        </p>
                    </div>
                </div>

                <div style={tableWrap}>
                    <table style={table}>
                        <thead>
                        <tr style={thead}>
                            <th style={th}>쿠폰 번호</th>
                            <th style={{...th, textAlign: 'center'}}>연결 정책 ID</th>
                            <th style={{...th, textAlign: 'center'}}>정책명</th>
                            {/* status: true=사용가능, false=사용완료 */}
                            <th style={{...th, textAlign: 'center'}}>사용 여부</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: 24}}>로딩 중...</td>
                            </tr>
                        ) : coupons.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: 24, color: 'var(--text-muted)'}}>
                                    발행된 쿠폰이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            coupons.map((c) => {
                                // 연결된 정책 이름 조회 (없으면 ID만 표시)
                                const policy = policies.find((p) => p.id === c.policyId)
                                return (
                                    <tr key={c.couponNum} style={tr}>
                                        {/* 쿠폰 번호: 고정폭 폰트로 가독성 향상 */}
                                        <td style={{...td, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1}}>
                                            {c.couponNum}
                                        </td>
                                        <td style={{...td, textAlign: 'center', color: 'var(--text-secondary)'}}>
                                            {c.policyId}
                                        </td>
                                        <td style={{...td, textAlign: 'center'}}>
                                            {policy ? policy.policyName :
                                                <span style={{color: 'var(--text-muted)'}}>—</span>}
                                        </td>
                                        {/* 사용 여부 배지 */}
                                        <td style={{...td, textAlign: 'center'}}>
                        <span className="badge" style={{
                            padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: c.status ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            color: c.status ? 'var(--color-success-text)' : 'var(--color-error-text)',
                        }}>
                          {c.status ? '사용 가능' : '사용 완료'}
                        </span>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                        </tbody>
                    </table>
                </div>

                {/* ── 페이지네이션 UI ── */}
                {!loading && totalPages > 0 && (
                    <div style={paginationWrap}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            style={{...pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                        >
                            이전
                        </button>

                        {/* buildPageRange: 1 · ... · (현재±2) · ... · N 구조 */}
                        {buildPageRange(currentPage, totalPages).map((num, idx) =>
                            num === '...'
                                ? <span key={`ellipsis-${idx}`} style={ellipsisStyle}>…</span>
                                : (
                                    <button
                                        key={num}
                                        onClick={() => setCurrentPage(num)}
                                        style={{
                                            ...pageNumberBtn,
                                            backgroundColor: currentPage === num ? 'var(--color-brand-default)' : 'transparent',
                                            color: currentPage === num ? '#fff' : 'var(--text-primary)',
                                            border: currentPage === num ? 'none' : '1px solid var(--border-subtle)'
                                        }}
                                    >
                                        {num}
                                    </button>
                                )
                        )}

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            style={{...pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>

        </div>
    )
}

/* ── 스타일 ── */
const sectionCard: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12,
    padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24,
}
const sectionHeader: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16,
}
const sectionTitle = {fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0}
const sectionDesc = {fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0'}

const msgBox: React.CSSProperties = {
    padding: '10px 14px', background: 'var(--color-success-bg)',
    border: '1px solid var(--color-success-main)', borderRadius: 8,
    color: 'var(--color-success-main)', fontSize: 13, fontWeight: 600, marginBottom: 16,
}
const emptyNotice: React.CSSProperties = {
    padding: '14px 16px', background: 'var(--bg-base)', borderRadius: 8,
    fontSize: 13, color: 'var(--text-muted)', border: '1px dashed var(--border-default)',
}
const issueRow: React.CSSProperties = {
    display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap',
}
const fieldLabel = {fontSize: 12, fontWeight: 700, color: 'var(--text-muted)'}
const selectStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
    minWidth: 280, cursor: 'pointer',
}
/** 발행 수량 입력 박스 */
const countInput: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
    width: 72, textAlign: 'center',
}

const issueBtn: React.CSSProperties = {
    padding: '10px 22px', background: 'var(--color-brand-default)',
    color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
}

const tableWrap = {borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)'}
const table: React.CSSProperties = {width: '100%', borderCollapse: 'collapse'}
const thead = {background: 'var(--bg-base)'}
const th: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
}
const tr = {borderBottom: '1px solid var(--border-subtle)'}
const td: React.CSSProperties = {padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)'}

/* 페이징 전용 스타일 */
const paginationWrap: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 4, marginTop: 24, paddingBottom: 8, flexWrap: 'wrap', maxWidth: '100%',
}
const pageBtn: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-default)',
    background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    color: 'var(--text-secondary)',
}
const pageNumberBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const ellipsisStyle: React.CSSProperties = {
    width: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: '34px',
}

export default CouponListPage
