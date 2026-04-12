/**
 * CouponListPage.tsx — 쿠폰 관리
 *
 * 기능:
 *  1. 쿠폰 목록 조회  → GET  /api/admin/discount-policy/coupon/list
 *  2. 쿠폰 발행       → POST /api/admin/discount-policy/coupon/{policyId}
 *     - 쿠폰을 발행할 할인 정책(COUPON 타입)을 선택 후 버튼 클릭
 *
 * CouponDTO (백엔드 기준):
 *   couponNum  String  — 쿠폰 번호 (PK, 12자리)
 *   policyId   Long    — 연결된 할인 정책 ID
 *   status     boolean — 사용 가능 여부 (true=사용가능, false=사용완료)
 *
 * 할인 정책은 condition_type=COUPON인 것만 쿠폰 발행 가능하므로
 * 드롭다운에는 COUPON 타입 정책만 필터링하여 표시.
 */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { DiscountPolicy } from './PolicyListPage'

/** 쿠폰 1건 타입 (CouponDTO 대응) */
interface Coupon {
  couponNum: string   // 쿠폰 번호 (12자리 고유 식별자)
  policyId:  number   // 연결된 할인 정책 ID
  status:    boolean  // true=사용가능, false=사용완료
}

function CouponListPage() {
  const [loading,   setLoading]   = useState(true)
  const [coupons,   setCoupons]   = useState<Coupon[]>([])
  // 쿠폰 발행 가능한 정책 목록 (condition_type = COUPON 인 것만)
  const [policies,  setPolicies]  = useState<DiscountPolicy[]>([])
  // 드롭다운에서 선택된 정책 ID
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | ''>('')
  const [issuing,   setIssuing]   = useState(false) // 발행 중 여부
  const [msg,       setMsg]       = useState('')     // 피드백 메시지

  /* ──────────────────────────────────────────
     초기 데이터 로딩: 쿠폰 목록 + 할인 정책 목록 병렬 조회
  ────────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [couponRes, policyRes] = await Promise.all([
          axios.get('/api/admin/discount-policy/coupon/list'),
          // 전체 할인 정책 fetch — 쿠폰 목록에서 정책명 표시 시 모든 타입 커버 필요
          axios.get('/api/admin/discount-policy/list'),
        ])
        setCoupons(couponRes.data)

        const allPolicies = policyRes.data as DiscountPolicy[]
        // 전체 정책을 저장 (목록 정책명 표시용)
        setPolicies(allPolicies)

        // 발행 드롭다운은 COUPON 타입만 필터링
        const couponPolicies = allPolicies.filter((p) => p.conditionType === 'COUPON')
        // 기본 선택값: 첫 번째 COUPON 정책
        if (couponPolicies.length > 0) {
          setSelectedPolicyId(couponPolicies[0].id)
        }
      } catch (e) {
        console.error('[CouponListPage] 데이터 로딩 실패:', e)
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [])

  /**
   * 쿠폰 발행
   * POST /api/admin/discount-policy/coupon/{policyId}
   * 성공 시 목록을 서버에서 새로 불러와 최신 상태 유지
   */
  const handleIssueCoupon = async () => {
    if (selectedPolicyId === '') {
      alert('쿠폰을 발행할 정책을 선택해 주세요.')
      return
    }

    setIssuing(true)
    try {
      await axios.post(`/api/admin/discount-policy/coupon/${selectedPolicyId}`)

      // 발행 성공 → 목록 새로고침 (서버가 생성한 couponNum을 가져오기 위해)
      const res = await axios.get('/api/admin/discount-policy/coupon/list')
      setCoupons(res.data)

      setMsg('쿠폰이 발행되었습니다.')
    } catch (e) {
      console.error('[CouponListPage] 쿠폰 발행 실패:', e)
      alert('쿠폰 발행에 실패했습니다.')
    } finally {
      setIssuing(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  /* ── 사용 가능 / 사용 완료 건수 집계 ── */
  const availableCount = coupons.filter((c) => c.status).length
  const usedCount      = coupons.filter((c) => !c.status).length

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

        {policies.filter((p) => p.conditionType === 'COUPON').length === 0 ? (
          // COUPON 타입 정책이 없으면 안내 문구 표시
          <div style={emptyNotice}>
            등록된 COUPON 타입 할인 정책이 없습니다. 먼저 정책 목록에서 정책을 등록해 주세요.
          </div>
        ) : (
          <div style={issueRow}>
            {/* 정책 선택 드롭다운 — COUPON 타입 정책만 필터링 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

            {/* 발행 버튼 */}
            <button
              onClick={handleIssueCoupon}
              disabled={issuing || selectedPolicyId === ''}
              style={{ ...issueBtn, opacity: issuing ? 0.7 : 1, alignSelf: 'flex-end' }}
            >
              {issuing ? '발행 중...' : '쿠폰 발행'}
            </button>
          </div>
        )}
      </div>

      {/* ── 쿠폰 목록 섹션 ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>쿠폰 목록</h2>
            <p style={sectionDesc}>
              전체 {coupons.length}건
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--color-success-main)', fontWeight: 600 }}>
                사용 가능 {availableCount}건
              </span>
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--text-muted)' }}>
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
                <th style={{ ...th, textAlign: 'center' }}>연결 정책 ID</th>
                <th style={{ ...th, textAlign: 'center' }}>정책명</th>
                {/* status: true=사용가능, false=사용완료 */}
                <th style={{ ...th, textAlign: 'center' }}>사용 여부</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 24 }}>로딩 중...</td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
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
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
                        {c.couponNum}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {c.policyId}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {policy ? policy.policyName : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      {/* 사용 여부 배지 */}
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: c.status ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color:      c.status ? 'var(--color-success-text)' : 'var(--color-error-text)',
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
const sectionTitle = { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }
const sectionDesc  = { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }

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
const fieldLabel = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  minWidth: 280, cursor: 'pointer',
}
const issueBtn: React.CSSProperties = {
  padding: '10px 22px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
}

const tableWrap = { borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thead = { background: 'var(--bg-base)' }
const th: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
  color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
}
const tr   = { borderBottom: '1px solid var(--border-subtle)' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }

export default CouponListPage
