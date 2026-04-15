/**
 * PolicyManagePage.tsx — 가격 정책 수정
 *
 * 사용 방법:
 *   PolicyListPage에서 navigate('/admin/management/policy/manage', { state: { policy } })
 *   형태로 진입. location.state.policy 로 기존 정책 데이터를 받아 폼에 초기값 세팅.
 *
 * 주의:
 *   state 없이 직접 URL 접근하면 목록 페이지로 리다이렉트됨.
 *   현재 이 페이지는 할인 정책 수정 전용.
 *   (적립 정책 수정은 별도 페이지나 기능 확장 시 추가 예정)
 *
 * TODO: PATCH /api/admin/discount-policy/{id} 연동 (백엔드 엔드포인트 확인 후 적용)
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import type { DiscountPolicy } from './PolicyListPage'

// 할인 조건 유형 옵션 (백엔드 conditionType enum 기준)
const CONDITION_TYPE_OPTIONS: DiscountPolicy['conditionType'][] = ['TIME', 'AGE', 'JOB', 'COUPON']
// 할인 방식 옵션 (백엔드 discountType enum 기준)
const DISCOUNT_TYPE_OPTIONS: DiscountPolicy['discountType'][]   = ['RATIO', 'WON']

function PolicyManagePage() {
  const navigate = useNavigate()
  const location = useLocation()

  // location.state?.policy 로 기존 정책 데이터 수신
  // state 없이 직접 URL 접근 시 policy가 undefined → useEffect에서 리다이렉트
  const initPolicy = location.state?.policy as DiscountPolicy | undefined

  const [form, setForm]       = useState<Partial<DiscountPolicy>>(initPolicy ?? {})
  const [success, setSuccess] = useState(false)

  /**
   * state 없이 직접 진입한 경우 목록 페이지로 리다이렉트
   * (MOCK_POLICIES 같은 임시 데이터 사용 금지)
   */
  useEffect(() => {
    if (!initPolicy) {
      alert('정책 데이터가 없습니다. 목록에서 다시 진입해 주세요.')
      navigate('/admin/management/policy/list', { replace: true })
    }
  }, [initPolicy, navigate])

  // 리다이렉트 중이면 빈 화면 렌더
  if (!initPolicy) return null

  const change = <K extends keyof DiscountPolicy>(field: K, val: DiscountPolicy[K]) =>
    setForm((p) => ({ ...p, [field]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.policyName?.trim()) { alert('정책명을 입력해 주세요.'); return }
    // TODO: PATCH /api/admin/discount-policy/{id} 연동
    // 현재는 콘솔 출력만 (백엔드 수정 엔드포인트 확인 후 apiClient.patch 적용 예정)
    console.log('[PolicyManage] 수정 예정 데이터:', form)
    setSuccess(true)
    setTimeout(() => navigate('/admin/management/policy/list'), 1500)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>수정 완료!</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={pageTitle}>할인 정책 수정</h2>
      <form onSubmit={handleSubmit} style={formStyle}>

        {/* 정책명 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>정책명 *</label>
          <input
            value={form.policyName ?? ''}
            onChange={(e) => change('policyName', e.target.value)}
            style={inputStyle}
            placeholder="정책명을 입력하세요"
          />
        </div>

        {/* 조건 유형 (conditionType) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>조건 유형</label>
          <select
            value={form.conditionType ?? 'TIME'}
            onChange={(e) => change('conditionType', e.target.value as DiscountPolicy['conditionType'])}
            style={inputStyle}
          >
            {CONDITION_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 할인 방식 (discountType) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>할인 방식</label>
          <select
            value={form.discountType ?? 'WON'}
            onChange={(e) => change('discountType', e.target.value as DiscountPolicy['discountType'])}
            style={inputStyle}
          >
            {DISCOUNT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === 'RATIO' ? '비율 (%)' : '정액 (원)'}</option>
            ))}
          </select>
        </div>

        {/* 할인 값 (discountValue) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            할인 값 ({form.discountType === 'RATIO' ? '%' : '원'})
          </label>
          <input
            type="number"
            value={form.discountValue ?? 0}
            min={0}
            step={form.discountType === 'RATIO' ? 1 : 500}
            onChange={(e) => change('discountValue', Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
          <button type="submit" style={submitBtn}>저장</button>
        </div>
      </form>
    </div>
  )
}

const pageTitle: React.CSSProperties  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const formStyle: React.CSSProperties  = {
  background: 'var(--bg-surface)', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16,
}
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const inputStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
  width: '100%', boxSizing: 'border-box',
}
const cancelBtn: React.CSSProperties = {
  padding: '12px 24px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)',
}
const submitBtn: React.CSSProperties = {
  flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

export default PolicyManagePage
