/**
 * PolicyManagePage.jsx — 가격 정책 수정
 * state.policy 로 기존 정책 수신
 * TODO: PUT /api/admin/policies/:id 연동
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { MOCK_POLICIES } from '../../../api/mockData'

const TYPE_OPTIONS = ['ADULT', 'TEEN', 'SENIOR', 'DISABLED', 'MORNING', 'CULTURE', 'COUPLE', 'MEMBER']

function PolicyManagePage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  // state 없으면 첫 번째 정책으로 기본값
  const initPolicy  = location.state?.policy ?? MOCK_POLICIES[0]

  const [form, setForm]       = useState({ ...initPolicy })
  const [success, setSuccess] = useState(false)

  const change = (field, val) => setForm((p) => ({ ...p, [field]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { alert('정책명을 입력해 주세요.'); return }
    // TODO: PUT /api/admin/policies/:id
    console.log('[PolicyManage] 수정:', form)
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
      <h2 style={pageTitle}>가격 정책 수정</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={field}>
          <label style={label}>정책명 *</label>
          <input value={form.name} onChange={(e) => change('name', e.target.value)} style={input} />
        </div>
        <div style={field}>
          <label style={label}>유형</label>
          <select value={form.type} onChange={(e) => change('type', e.target.value)} style={input}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={field}>
          <label style={label}>할인금액 (원)</label>
          <input type="number" value={form.discount} min={0} step={500}
            onChange={(e) => change('discount', Number(e.target.value))} style={input} />
        </div>
        <div style={field}>
          <label style={label}>설명</label>
          <input value={form.description} onChange={(e) => change('description', e.target.value)} style={input} />
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
