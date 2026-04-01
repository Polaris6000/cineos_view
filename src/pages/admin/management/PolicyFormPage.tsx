/**
 * PolicyFormPage.jsx — 가격 정책 등록
 * TODO: POST /api/admin/policies 연동
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

const TYPE_OPTIONS = ['ADULT', 'TEEN', 'SENIOR', 'DISABLED', 'MORNING', 'CULTURE', 'COUPLE', 'MEMBER']

function PolicyFormPage() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ name: '', type: 'ADULT', discount: 0, description: '' })
  const [success, setSuccess] = useState(false)
  const [errors, setErrors]   = useState({})

  const change = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = '정책명을 입력해 주세요.'
    if (form.discount < 0)    e.discount = '할인금액은 0 이상이어야 합니다.'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    // TODO: POST /api/admin/policies
    console.log('[PolicyForm] 등록:', form)
    setSuccess(true)
    setTimeout(() => navigate('/admin/management/policy/list'), 1500)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>등록 완료!</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={pageTitle}>가격 정책 등록</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        <Field label="정책명" required error={errors.name}>
          <input value={form.name} onChange={(e) => change('name', e.target.value)}
            style={input} placeholder="예: 청소년 할인" />
        </Field>
        <Field label="유형">
          <select value={form.type} onChange={(e) => change('type', e.target.value)} style={input}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="할인금액 (원)" error={errors.discount}>
          <input type="number" value={form.discount} min={0} step={500}
            onChange={(e) => change('discount', Number(e.target.value))} style={input} />
        </Field>
        <Field label="설명">
          <input value={form.description} onChange={(e) => change('description', e.target.value)}
            style={input} placeholder="적용 조건 설명" />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
          <button type="submit" style={submitBtn}>등록</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--color-error-main)' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: 'var(--color-error-main)', margin: 0 }}>{error}</p>}
    </div>
  )
}

const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const formStyle  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '24px',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }
const input      = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                     fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
                     width: '100%', boxSizing: 'border-box' }
const cancelBtn  = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                     borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn  = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                     border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

export default PolicyFormPage
