/**
 * TheaterEditPage.tsx — 상영관 수정 (UC-21)
 *
 * 수정 가능 항목 (백엔드 지원 범위):
 *  - 정리시간 (cleanupTime) → PATCH /api/admin/theater/cleantime
 *  - 좌석 정책 (policyId)   → PATCH /api/admin/theater/policy
 *
 * ⚠️ 미지원 항목 (백엔드 TheaterDTO에 rows/cols 없음):
 *  - 좌석 구성(행×열), 미니 좌석 미리보기 → 제거
 *
 * location.state 수신:
 *  - theater: { no, policyId, cleanupTime, name, hasRecliner, policyName }
 *  - seatPolicies: SeatPolicyDTO[]  (TheaterListPage에서 전달)
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { SeatPolicy } from './TheaterListPage'
import axios from 'axios'

function TheaterEditPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  /** TheaterListPage에서 navigate state로 전달받은 데이터 */
  const theater      = location.state?.theater
  const seatPolicies: SeatPolicy[] = location.state?.seatPolicies ?? []

  /* state 없이 직접 접근한 경우 목록으로 리다이렉트 */
  if (!theater) {
    setTimeout(() => navigate('/admin/management/theater/list'))
    return null
  }

  /** 수정 폼 상태 — 백엔드가 지원하는 필드만 포함 */
  const [form, setForm] = useState({
    cleanupTime: theater.cleanupTime ?? 10, // 정리시간(분)
    policyId:    theater.policyId,           // 좌석 정책 ID
  })

  const [saving,  setSaving]  = useState(false)  // 저장 진행 중
  const [success, setSuccess] = useState(false)  // 저장 완료 여부
  const [error,   setError]   = useState('')     // 오류 메시지

  /** 폼 필드 단일 변경 헬퍼 */
  const change = (field: string, val: number) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  /**
   * 저장 처리
   *  - cleanupTime 변경 시 → PATCH /api/admin/theater/cleantime
   *  - policyId 변경 시    → PATCH /api/admin/theater/policy
   *  - 두 값 모두 변경됐으면 순차 호출
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.cleanupTime < 0 || form.cleanupTime > 60) {
      alert('정리시간은 0~60분 사이여야 합니다.')
      return
    }

    setSaving(true)
    setError('')


      /* ① 정리시간이 바뀐 경우
       *   백엔드 TheaterRequest: { ids: Long[], changeValue: Long }
       *   ids = 상영관 번호 배열, changeValue = 새 정리시간(분) */
    try {
      if (form.cleanupTime !== theater.cleanupTime) {
          await axios.patch('/api/admin/theater/cleantime', {
            ids:         [theater.no],
            changeValue: form.cleanupTime,
          })
      }

      /* ② 좌석 정책이 바뀐 경우
       *   ids = 상영관 번호 배열, changeValue = 새 policyId */
      if (form.policyId !== theater.policyId) {
          await axios.patch('/api/admin/theater/policy', {
            ids:         [theater.no],
            changeValue: form.policyId,
          })
      }

      setSuccess(true)
      setTimeout(() => navigate('/admin/management/theater/list'), 1500)

    } catch (err) {
      console.error('[TheaterEditPage] 저장 실패', err)
      setError('저장에 실패했습니다. 데이터 형식을 확인하거나 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  /* ── 저장 완료 화면 ── */
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>
          수정 완료!
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={pageTitle}>상영관 수정 — {theater.name}</h2>

      {/* 오류 메시지 */}
      {error && (
        <div style={errorBox}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── 정리시간 카드 ── */}
        <div style={card}>
          <p style={sLabel}>상영 후 정리시간</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            스케줄 종료시간 = 시작시간 + 런타임 + 정리시간으로 계산됩니다.
          </p>
          <div style={fieldWrap}>
            <label style={fieldLabel}>정리시간 (분)</label>
            <input
              type="number"
              value={form.cleanupTime}
              min={0}
              max={60}
              step={5}
              onChange={(e) => change('cleanupTime', Number(e.target.value))}
              style={input}
            />
          </div>
        </div>

        {/* ── 좌석 정책 카드 ── */}
        <div style={card}>
          <p style={sLabel}>좌석 정책</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            좌석 유형에 따라 기본 요금이 결정됩니다. (추가요금 없음, 할인 정책 별도 적용)
          </p>
          <div style={fieldWrap}>
            <label style={fieldLabel}>좌석 유형 선택</label>
            <select
              value={form.policyId}
              onChange={(e) => change('policyId', Number(e.target.value))}
              style={{ ...input, width: 'auto', cursor: 'pointer' }}
            >
              {seatPolicies.length === 0 ? (
                <option value={form.policyId}>{theater.policyName}</option>
              ) : (
                /* 일반 / 리클라이너 2종만 (name에 '일반' 또는 '리클라이너' 포함) */
                seatPolicies
                  .filter((p) => p.name.includes('일반') || p.name.includes('리클라이너'))
                  .map((p) => (
                    <option key={p.policyId} value={p.policyId}>
                      {p.name}
                    </option>
                  ))
              )}
            </select>
          </div>

          {/* 선택된 정책의 기본요금 자동 표시 */}
          {(() => {
            const selected = seatPolicies.find((p) => p.policyId === form.policyId)
            if (!selected) return null
            return (
              <div style={{ marginTop: 14, padding: '10px 14px',
                            background: 'var(--bg-base)', borderRadius: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>기본 요금</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-default)' }}>
                  {selected.cost.toLocaleString()}원
                </span>
              </div>
            )
          })()}
        </div>

        {/* ── 버튼 ── */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
            style={cancelBtn}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ ...submitBtn, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const card      = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel    = { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, margin: '0 0 8px 0' }
const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const fieldLabel= { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }
const input     = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: 120 }
const cancelBtn = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                    borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const errorBox  = { padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-main)',
                    borderRadius: 8, color: 'var(--color-error-text)', fontSize: 14 }

export default TheaterEditPage
