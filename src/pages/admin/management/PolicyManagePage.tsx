/**
 * PolicyManagePage.jsx — 가격 정책 수정
 * state.policy 로 기존 정책 수신
 * TODO: PUT /api/admin/policies/:id 연동
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import axios from "axios";

export interface DiscountPolicy {
  id: number
  policyName: string
  conditionType: 'AGE' | 'TIME' | 'JOB' | 'COUPON'
  discountType: 'WON' | 'RATIO'
  discountValue: number
  activation: number
  startAt: string
  endAt: string | null
}

const TYPE_OPTIONS = ['AGE', 'COUPON', 'JOB', 'TIME']

function PolicyManagePage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  // state 없으면 첫 번째 정책으로 기본값
  // const initPolicy  = location.state?.policy ?? MOCK_POLICIES[0]

  const initPolicy = location.state?.policy

  const [form, setForm] = useState<DiscountPolicy>(initPolicy ?? null)
  const [success, setSuccess] = useState(false)

  const change = (field, val) => setForm((p) => ({ ...p, [field]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.policyName.trim()) { alert('정책명을 입력해 주세요.'); return }
    // TODO: PUT /api/admin/policies/:id

    try {
      await axios.post('http://localhost:8080/api/admin/discount-policy', form)
      console.log('[PolicyManage] 수정:', form)
      setSuccess(true)
      setTimeout(() => navigate('/admin/management/policy/list'), 1500)
    } catch (error) {
      console.log(error)
      alert('등록 실패')
    }

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
      <h2 style={pageTitle}>가격 정책 수정</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={field}>
          <label style={label}>정책명 *</label>
          <input value={form.policyName} onChange={(e) => change('policyName', e.target.value)} style={input} />
        </div>
        <div style={field}>
          <label style={label}>유형</label>
          <select value={form.conditionType} onChange={(e) => change('conditionType', e.target.value)} style={input}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={field}>
          <label style={label}>할인금액 (원)</label>
          <input type="number" value={form.discountValue} min={0} step={500}
            onChange={(e) => change('discountValue', Number(e.target.value))} style={input} />
        </div>
        <div style={field}>
          <label style={label}>설명</label>
          <input value={form.conditionType} onChange={(e) => change('conditionType', e.target.value)} style={input} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
          <button type="submit" style={submitBtn}>저장</button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const formStyle = { background: 'var(--bg-surface)', borderRadius: 12, padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }
const field     = { display: 'flex', flexDirection: 'column', gap: 5 }
const label     = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const input     = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
                    width: '100%', boxSizing: 'border-box' }
const cancelBtn = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                    borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

export default PolicyManagePage
