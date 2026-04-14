/**
 * BonusPolicyFormPage.tsx — 적립 정책 등록
 *
 * 할인 정책 등록(PolicyFormPage)과 동일한 패턴으로 별도 페이지 구성.
 * POST /api/admin/bonus-policy 로 등록 요청.
 *
 * bonus_policy 테이블 컬럼:
 *   policy_name  VARCHAR(20) NOT NULL
 *   give_value   BIGINT UNSIGNED NOT NULL  ← 적립률 (%)
 *   start_at     DATETIME NOT NULL
 *   end_at       DATETIME NULL             ← 선택 (무기한 가능)
 *   activation   BOOLEAN NOT NULL
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import apiClient from '../../../api/apiClient.ts'

function BonusPolicyFormPage() {
  const navigate = useNavigate()
  const [success, setSuccess]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [errors,  setErrors]    = useState<Record<string, string>>({})

  // 각 입력 필드 ref
  const nameRef      = useRef<HTMLInputElement>(null)   // 정책 이름
  const giveValueRef = useRef<HTMLInputElement>(null)   // 적립률 (%)
  const startRef     = useRef<HTMLInputElement>(null)   // 시작일
  const endRef       = useRef<HTMLInputElement>(null)   // 종료일 (선택)
  const activationRef = useRef<HTMLInputElement>(null)  // 즉시 활성화 체크박스

  /** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
  const today = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /** 유효성 검사: 에러 객체 반환 (비어있으면 통과) */
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}

    if (!nameRef.current?.value.trim()) {
      e.name = '정책 이름을 입력해 주세요.'
    }

    const gv = Number(giveValueRef.current?.value)
    if (isNaN(gv) || gv < 1 || gv > 100) {
      e.giveValue = '적립률은 1~100 사이의 값이어야 합니다.'
    }

    if (!startRef.current?.value) {
      e.startAt = '시작일을 입력해 주세요.'
    }

    // 종료일이 있고, 시작일보다 이전이면 오류
    if (endRef.current?.value && startRef.current?.value) {
      if (endRef.current.value < startRef.current.value) {
        e.endAt = '종료일은 시작일 이후여야 합니다.'
      }
    }

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

    // 날짜를 DATETIME 형식으로 변환 (백엔드 규격)
    // start_at → 'YYYY-MM-DDT00:00:00'
    // end_at   → 'YYYY-MM-DDT23:59:59' (없으면 null)
    const payload = {
      policyName: nameRef.current!.value.trim(),
      giveValue:  Number(giveValueRef.current!.value),
      startAt:    `${startRef.current!.value}T00:00:00`,
      endAt:      endRef.current?.value
                    ? `${endRef.current.value}T23:59:59`
                    : null,
      activation: activationRef.current?.checked ?? true,
    }

    setSaving(true)
    try {
      console.log('[BonusPolicyForm] 등록 시도:', payload)
      const res = await apiClient.post('/api/admin/bonus-policy', payload)

      if (res.status === 200 || res.status === 201) {
        setSuccess(true)
        // 1.5초 후 목록 페이지로 이동
        setTimeout(() => navigate('/admin/management/policy/list'), 1500)
      }
    } catch (error) {
      console.error('적립 정책 등록 실패:', error)
      alert('서버 통신 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 등록 성공 화면
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>
          등록 완료!
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={pageTitle}>적립 정책 등록</h2>
      <form onSubmit={handleSubmit} style={formStyle}>

        {/* 정책 이름 */}
        <Field label="정책 이름" required error={errors.name}>
          <input
            ref={nameRef}
            style={input}
            placeholder="예: 기본 적립"
          />
        </Field>

        {/* 적립률 */}
        <Field label="적립률 (%)" required error={errors.giveValue}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={giveValueRef}
              type="number"
              min={1}
              max={100}
              step={1}
              defaultValue={5}
              style={{ ...input, width: 120, textAlign: 'right' }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>%</span>
          </div>
        </Field>

        {/* 시작일 / 종료일 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="시작일" required error={errors.startAt}>
            <input
              ref={startRef}
              type="date"
              defaultValue={today()}
              style={input}
            />
          </Field>
          <Field label="종료일 (미입력 시 무기한)" error={errors.endAt}>
            <input
              ref={endRef}
              type="date"
              style={input}
            />
          </Field>
        </div>

        {/* 즉시 활성화 체크박스 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={activationRef}
            type="checkbox"
            id="activation"
            defaultChecked={true}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label htmlFor="activation" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
            즉시 활성화
          </label>
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={cancelBtn}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            style={submitBtn}
          >
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>

      </form>
    </div>
  )
}

/** 공통 폼 필드 래퍼 컴포넌트 */
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--color-error-main)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--color-error-main)', margin: 0 }}>{error}</p>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24,
}
const formStyle: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16,
}
const input: React.CSSProperties = {
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

export default BonusPolicyFormPage
