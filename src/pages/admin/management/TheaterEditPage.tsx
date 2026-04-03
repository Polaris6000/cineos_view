/**
 * TheaterEditPage.jsx — 상영관 정보 수정 (UC-21)
 *
 * 수정 항목:
 *  - 좌석 구성 (rows × cols)
 *  - 기본 요금
 *  - 리클라이너 여부
 *
 * state.theater 로 기존 데이터 수신
 * TODO: PUT /api/admin/theaters/:id 연동
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { generateSeats } from '../../../api/mockData'

function TheaterEditPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const theater   = location.state?.theater

  if (!theater) {
    navigate('/admin/management/theater/list')
    return null
  }

  const [form, setForm] = useState({
    rows:        theater.rows,
    cols:        theater.cols,
    basePrice:   theater.basePrice,
    hasRecliner: theater.hasRecliner,
    cleanupTime: theater.cleanupTime ?? 10, // 정리시간(분) — 없으면 기본 10분
  })

  const [success, setSuccess] = useState(false)

  const change = (field, val) => setForm((p) => ({ ...p, [field]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.rows < 1 || form.cols < 1) { alert('행/열은 1 이상이어야 합니다.'); return }
    if (form.basePrice < 0) { alert('요금은 0 이상이어야 합니다.'); return }
    // TODO: PUT /api/admin/theaters/:id
    console.log('[TheaterEdit] 저장:', { ...theater, ...form })
    setSuccess(true)
    setTimeout(() => navigate('/admin/management/theater/list'), 1500)
  }

  // 미리보기 좌석 (rows × cols)
  const previewSeats = generateSeats(Math.min(form.rows, 6), Math.min(form.cols, 10))
    .filter((s) => s.status !== 'sold_out' && s.status !== 'disabled')

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>수정 완료!</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={pageTitle}>상영관 수정 — {theater.name}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 좌석 구성 */}
        <div style={card}>
          <p style={sLabel}>좌석 구성</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={fieldWrap}>
              <label style={fieldLabel}>행 수</label>
              <input type="number" value={form.rows} min={1} max={26}
                onChange={(e) => change('rows', Number(e.target.value))} style={input} />
            </div>
            <span style={{ fontSize: 20, color: 'var(--text-secondary)', marginTop: 20 }}>×</span>
            <div style={fieldWrap}>
              <label style={fieldLabel}>열 수</label>
              <input type="number" value={form.cols} min={1} max={30}
                onChange={(e) => change('cols', Number(e.target.value))} style={input} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 20 }}>
              = 총 <strong>{form.rows * form.cols}</strong>석
            </div>
          </div>

          {/* 미니 좌석 미리보기 */}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 8 }}>
            미리보기 (최대 6행 × 10열)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...new Set(previewSeats.map((s) => s.row))].map((row) => (
              <div key={row} style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 16, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{row}</span>
                {previewSeats.filter((s) => s.row === row).map((s) => (
                  <div key={s.id} style={miniSeat} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 요금 */}
        <div style={card}>
          <p style={sLabel}>기본 요금</p>
          <div style={fieldWrap}>
            <label style={fieldLabel}>기본 요금 (원)</label>
            <input type="number" value={form.basePrice} min={0} step={1000}
              onChange={(e) => change('basePrice', Number(e.target.value))} style={input} />
          </div>
        </div>

        {/* 정리시간 */}
        <div style={card}>
          <p style={sLabel}>상영 후 정리시간 (분)</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            스케줄 종료시간 = 시작시간 + 런타임 + 정리시간 으로 계산됩니다.
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

        {/* 리클라이너 */}
        <div style={card}>
          <p style={sLabel}>리클라이너 여부</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.hasRecliner}
              onChange={(e) => change('hasRecliner', e.target.checked)}
              style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              리클라이너 좌석 있음
            </span>
          </label>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
          <button type="submit" style={submitBtn}>저장</button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const card      = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel    = { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }
const fieldWrap = { display: 'flex', flexDirection: 'column', gap: 4 }
const fieldLabel= { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }
const input     = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: 100 }
const miniSeat  = { width: 16, height: 16, background: 'var(--border-default)', borderRadius: 3 }
const cancelBtn = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                    borderRadius: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

export default TheaterEditPage
