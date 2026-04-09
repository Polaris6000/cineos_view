/**
 * PolicyFormPage.jsx — 가격 정책 등록
 * TODO: POST /api/admin/policies 연동
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import axios from "axios";

// 타입 정의 (필요에 따라 PolicyManagePage에서 가져온 타입을 확장하세요)
interface DiscountPolicy {
  // id: number // 인덱스
  policyName: string // 정책 이름
  conditionType: string // 할인대상
  discountType: string // 할인유형
  discountValue: number // 할인값
  startAt: string // 시작일 (YYYY-MM-DD)
  endAt: null // 만료일 (YYYY-MM-DD)
  // activation: boolean // 만료여부 (생성이라 필요없음)

  description: string // TODO 설명이 DB에 존재하지않음
}

const TYPE_CONDITION = ['AGE', 'COUPON', 'JOB', 'TIME']
const TYPE_DISCOUNT = ['RATIO', 'WON']

const getOffsetDate = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

function PolicyFormPage() {
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // 1. 각 입력 필드에 대한 Ref 생성
  const nameRef = useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null); // 시작일
  const endRef = useRef<HTMLInputElement>(null);   // 종료일

  const validate = () => {
    const e: { [key: string]: string } = {}
    if (!nameRef.current?.value.trim()) e.name = '정책명을 입력해 주세요.'

    const amount = Number(amountRef.current?.value);
    if (isNaN(amount) || amount < 0) e.discount = '할인금액은 0 이상이어야 합니다.'

    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    // 2. Ref를 통해 데이터 객체 생성
    const formData: DiscountPolicy = {
      policyName: nameRef.current?.value || '',
      conditionType: conditionRef.current?.value || 'AGE',
      discountType: typeRef.current?.value || 'RATIO',
      discountValue: Number(amountRef.current?.value) || 0,
      startAt: new Date().toISOString(), // 예시 데이터
      endAt: null,
      description: descriptionRef.current?.value || '' // TODO 설명이 DB에 존재하지않음
    }

    try {
      console.log('[PolicyForm] 등록 시도:', formData)
      const res = await axios.post('/api/admin/discount-policy', formData);

      if (res.status === 200 || res.status === 201) {
        setSuccess(true)
        setTimeout(() => navigate('/admin/management/policy/list'), 1500)
      }
    } catch (error) {
      console.error("정책 등록 실패:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
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
            <input
                ref={nameRef}
                style={input}
                placeholder="예: 청소년 할인"
            />
          </Field>

          <Field label="할인대상">
            <select ref={conditionRef} style={input}>
              {TYPE_CONDITION.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="할인유형">
            <select ref={typeRef} style={input}>
              {TYPE_DISCOUNT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="할인금액 (원/%)" error={errors.discount}>
            <input
                ref={amountRef}
                type="number"
                defaultValue={0}
                min={0}
                step={500}
                style={input}
            />
          </Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="시작일" required error={errors.startAt}>
              <input
                  ref={startRef}
                  type="date"
                  defaultValue={getOffsetDate(0)}
                  style={input}
              />
            </Field>
            <Field label="종료일">
              <input
                  ref={endRef}
                  type="date"
                  defaultValue={getOffsetDate(7)}
                  style={input}
              />
            </Field>
          </div>

          <Field label="설명">
            <input
                ref={descriptionRef}
                style={input}
                placeholder="적용 조건 설명"
            />
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
        {label} {required && <span style={{ color: 'var(--color-error-main)' }}></span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: 'var(--color-error-main)', margin: 0 }}>{error}</p>}
    </div>
  )
}

const pageTitle: React.CSSProperties  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const formStyle: React.CSSProperties  = { background: 'var(--bg-surface)', borderRadius: 12, padding: '24px',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }
const input: React.CSSProperties     = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                     fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
                     width: '100%', boxSizing: 'border-box' }
const cancelBtn: React.CSSProperties = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                     borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn: React.CSSProperties  = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                     border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

export default PolicyFormPage
