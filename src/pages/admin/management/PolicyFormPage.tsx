import {type CSSProperties, type ReactNode, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {CheckCircle} from 'lucide-react'
import apiClient from "../../../api/apiClient.ts";

interface DiscountPolicy {
    policyName: string
    conditionType: string
    discountType: string
    discountValue: number
    startAt: string
    endAt: string | null
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

    // select 변경 시 리렌더가 필요하므로 useRef 대신 useState로 관리
    const [discountType, setDiscountType] = useState<'RATIO' | 'WON'>('RATIO')

    const nameRef = useRef<HTMLInputElement>(null);
    const conditionRef = useRef<HTMLSelectElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const startRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLInputElement>(null);

    const validate = () => {
        const e: { [key: string]: string } = {}
        if (!nameRef.current?.value.trim()) e.name = '정책명을 입력해 주세요.'

        const amount = Number(amountRef.current?.value)
        if (isNaN(amount) || amount <= 0) e.discount = '할인값은 1 이상이어야 합니다.'

        if (!startRef.current?.value) e.startAt = '시작일을 입력해 주세요.'

        // 종료일이 입력됐는데 시작일보다 이전이면 오류
        if (endRef.current?.value && startRef.current?.value) {
            if (endRef.current.value < startRef.current.value) {
                e.endAt = '종료일은 시작일 이후여야 합니다.'
            }
        }

        return e
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const errs = validate()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }

        const formData: DiscountPolicy = {
            policyName: nameRef.current?.value || '',
            conditionType: conditionRef.current?.value || 'AGE',
            discountType: typeRef.current?.value || 'RATIO',
            discountValue: Number(amountRef.current?.value) || 0,
            startAt: `${startRef.current!.value}T00:00:00`,
            endAt: endRef.current?.value ? `${endRef.current.value}T23:59:59` : null,
        }

        try {
            console.log('[PolicyForm] 등록 시도:', formData)
            const res = await apiClient.post('/admin/discount-policy', formData);

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
            <div style={{textAlign: 'center', padding: 40}}>
                <CheckCircle size={48} color="var(--color-success-main)"/>
                <p style={{fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16}}>등록 완료!</p>
            </div>
        )
    }

    return (
        <div style={{maxWidth: 560}}>
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
                    <select
                        ref={typeRef}
                        style={input}
                        onChange={(e) => setDiscountType(e.target.value as 'RATIO' | 'WON')}
                    >
                        {TYPE_DISCOUNT.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </Field>

                <Field label={discountType === 'RATIO' ? '할인율 (%)' : '할인금액 (원)'} error={errors.discount}>
                    <input
                        ref={amountRef}
                        type="number"
                        defaultValue={0}
                        min={0}
                        max={discountType === 'RATIO' ? 100 : undefined}
                        step={discountType === 'RATIO' ? 1 : 500}
                        placeholder={discountType === 'RATIO' ? '예: 10' : '예: 3000'}
                        style={input}
                    />
                </Field>
                <div style={{display: 'flex', gap: 12}}>
                    <Field label="시작일" required error={errors.startAt}>
                        <input
                            ref={startRef}
                            type="date"
                            defaultValue={getOffsetDate(0)}
                            style={input}
                        />
                    </Field>
                    <Field label="종료일" error={errors.endAt}>
                        <input
                            ref={endRef}
                            type="date"
                            defaultValue={getOffsetDate(7)}
                            style={input}
                        />
                    </Field>
                </div>

                <div style={{display: 'flex', gap: 10, marginTop: 8}}>
                    <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
                    <button type="submit" style={submitBtn}>등록</button>
                </div>
            </form>
        </div>
    )
}

interface FieldProps {
    label: string
    required?: boolean
    error?: string
    children: ReactNode
}

function Field({label, required, error, children}: FieldProps) {
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
            <label style={{fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)'}}>
                {label} {required && <span style={{color: 'var(--color-error-main)'}}></span>}
            </label>
            {children}
            {error && <p style={{fontSize: 12, color: 'var(--color-error-main)', margin: 0}}>{error}</p>}
        </div>
    )
}

const pageTitle: CSSProperties = {fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24}
const formStyle: CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 12, padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16
}
const input: CSSProperties = {
    padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
    width: '100%', boxSizing: 'border-box'
}
const cancelBtn: CSSProperties = {
    padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)'
}
const submitBtn: CSSProperties = {
    flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer'
}

export default PolicyFormPage