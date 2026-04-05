/**
 * PolicyListPage.tsx — 가격 정책 목록
 *
 * 구성:
 *  1. 상영관별 기본 요금 편집 카드 (상영관별 basePrice)
 *     - TODO: PATCH /api/admin/theaters/:id { basePrice } 연동
 *  2. 좌석 타입별 추가 요금 편집 (NORMAL / RECLINER / COUPLE)
 *     - TODO: PATCH /api/admin/seat-prices 연동
 *  3. 할인 정책 목록 테이블
 *
 * 사용 좌석: 일반석(NORMAL) / 리클라이너석(RECLINER) / 커플석(COUPLE)
 * VIP석 없음
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_POLICIES, MOCK_THEATERS, SEAT_PRICES, SEAT_TYPE_LABEL } from '../../../api/mockData'

type SeatType = keyof typeof SEAT_PRICES

/** 좌석 타입별 색상 (VIP 없음) */
const SEAT_TYPE_COLOR: Record<SeatType, string> = {
  NORMAL:   '#2563eb',
  RECLINER: '#7c3aed',
  COUPLE:   '#db2777',
}

function PolicyListPage() {
  const navigate = useNavigate()

  /* ──────────────────────────────────────────
     1. 상영관별 기본 요금
  ────────────────────────────────────────── */
  // Map<theaterId, basePrice>
  const initBasePrices = Object.fromEntries(MOCK_THEATERS.map((t) => [t.id, t.basePrice]))
  const [basePrices,     setBasePrices]     = useState<Record<number, number>>(initBasePrices)
  const [editBasePrices, setEditBasePrices] = useState<Record<number, number>>(initBasePrices)
  const [baseEditing,    setBaseEditing]    = useState(false)
  const [baseSaving,     setBaseSaving]     = useState(false)
  const [baseMsg,        setBaseMsg]        = useState('')

  const handleBaseEdit   = () => { setEditBasePrices({ ...basePrices }); setBaseEditing(true); setBaseMsg('') }
  const handleBaseCancel = () => { setBaseEditing(false); setEditBasePrices({ ...basePrices }) }

  const handleBaseSave = async () => {
    for (const [id, price] of Object.entries(editBasePrices)) {
      if (price <= 0) {
        const t = MOCK_THEATERS.find((x) => x.id === Number(id))
        alert(`${t?.name ?? id} 기본 요금은 0원보다 커야 합니다.`)
        return
      }
    }
    setBaseSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    setBasePrices({ ...editBasePrices })
    setBaseEditing(false)
    setBaseSaving(false)
    setBaseMsg('상영관 기본 요금이 저장되었습니다.')
    setTimeout(() => setBaseMsg(''), 3000)
    // TODO: Promise.all(MOCK_THEATERS.map(t => PATCH /api/admin/theaters/:id { basePrice }))
  }

  /* ──────────────────────────────────────────
     2. 좌석 타입별 추가 요금
  ────────────────────────────────────────── */
  const [prices,     setPrices]     = useState<Record<SeatType, number>>({ ...SEAT_PRICES })
  const [editPrices, setEditPrices] = useState<Record<SeatType, number>>({ ...SEAT_PRICES })
  const [seatEditing,  setSeatEditing]  = useState(false)
  const [seatSaving,   setSeatSaving]   = useState(false)
  const [seatMsg,      setSeatMsg]      = useState('')

  const handleSeatEdit   = () => { setEditPrices({ ...prices }); setSeatEditing(true); setSeatMsg('') }
  const handleSeatCancel = () => { setSeatEditing(false); setEditPrices({ ...prices }) }

  const handleSeatSave = async () => {
    for (const key of Object.keys(editPrices) as SeatType[]) {
      if (editPrices[key] < 0) {
        alert(`${SEAT_TYPE_LABEL[key]} 추가 요금은 0원 이상이어야 합니다.`)
        return
      }
    }
    setSeatSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    setPrices({ ...editPrices })
    setSeatEditing(false)
    setSeatSaving(false)
    setSeatMsg('좌석 추가 요금이 저장되었습니다.')
    setTimeout(() => setSeatMsg(''), 3000)
    // TODO: PATCH /api/admin/seat-prices
  }

  return (
    <div>

      {/* ══════════════════════════════
          1. 상영관별 기본 요금
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>상영관 기본 요금</h2>
            <p style={sectionDesc}>상영관마다 적용되는 기본 입장 요금입니다. 좌석 타입별 추가 요금은 아래에서 별도 설정합니다.</p>
          </div>
          {!baseEditing ? (
            <button onClick={handleBaseEdit} style={editActionBtn}>수정</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleBaseCancel} disabled={baseSaving} style={cancelBtn}>취소</button>
              <button onClick={handleBaseSave}  disabled={baseSaving} style={saveBtn}>
                {baseSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        {baseMsg && <div style={saveMsgBox}>✅ {baseMsg}</div>}

        <div style={priceGrid}>
          {MOCK_THEATERS.map((t) => (
            <div key={t.id} style={priceCard}>
              {/* 상영관 타입 바 */}
              <div style={{ ...typeBar, background: t.hasRecliner ? '#7c3aed' : '#2563eb' }} />
              <div style={priceCardInner}>
                <p style={priceTypeLabel}>{t.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t.hasRecliner ? '리클라이너관' : '일반관'} · {t.totalSeats}석
                </p>
                {baseEditing ? (
                  <div style={inputWrap}>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={editBasePrices[t.id]}
                      onChange={(e) =>
                        setEditBasePrices((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
                      }
                      style={priceInput}
                    />
                    <span style={unitLabel}>원</span>
                  </div>
                ) : (
                  <p style={{ ...priceValue, color: t.hasRecliner ? '#7c3aed' : '#2563eb' }}>
                    {basePrices[t.id].toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          2. 좌석 타입별 추가 요금
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>좌석 타입별 추가 요금</h2>
            <p style={sectionDesc}>
              기본 요금에 더해지는 좌석 타입별 추가 금액입니다.
              일반석은 추가 요금 없이 기본 요금만 적용됩니다.
            </p>
          </div>
          {!seatEditing ? (
            <button onClick={handleSeatEdit} style={editActionBtn}>수정</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSeatCancel} disabled={seatSaving} style={cancelBtn}>취소</button>
              <button onClick={handleSeatSave}  disabled={seatSaving} style={saveBtn}>
                {seatSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        {seatMsg && <div style={saveMsgBox}>✅ {seatMsg}</div>}

        <div style={priceGrid}>
          {(Object.keys(SEAT_PRICES) as SeatType[]).map((type) => (
            <div key={type} style={priceCard}>
              <div style={{ ...typeBar, background: SEAT_TYPE_COLOR[type] }} />
              <div style={priceCardInner}>
                <p style={priceTypeLabel}>{SEAT_TYPE_LABEL[type]}</p>
                {seatEditing ? (
                  <div style={inputWrap}>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={editPrices[type]}
                      onChange={(e) =>
                        setEditPrices((prev) => ({ ...prev, [type]: Number(e.target.value) }))
                      }
                      style={priceInput}
                    />
                    <span style={unitLabel}>원</span>
                  </div>
                ) : (
                  <p style={{ ...priceValue, color: SEAT_TYPE_COLOR[type] }}>
                    +{prices[type].toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          3. 할인 정책 목록
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>할인 정책</h2>
            <p style={sectionDesc}>회원 등급, 연령대 등 조건별 할인 정책을 관리합니다.</p>
          </div>
          <button
            onClick={() => navigate('/admin/management/policy/form')}
            style={addBtn}
          >
            + 정책 등록
          </button>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>ID</th>
                <th style={th}>정책명</th>
                <th style={th}>유형</th>
                <th style={th}>할인금액</th>
                <th style={th}>설명</th>
                <th style={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_POLICIES.map((p) => (
                <tr key={p.id} style={tr}>
                  <td style={td}>{p.id}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                  <td style={td}><span style={typeBadge}>{p.type}</span></td>
                  <td style={{ ...td, color: p.discount > 0 ? 'var(--color-success-main)' : 'var(--text-primary)' }}>
                    {p.discount > 0 ? `-${p.discount.toLocaleString()}원` : '기본요금'}
                  </td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{p.description}</td>
                  <td style={td}>
                    <button
                      onClick={() => navigate('/admin/management/policy/manage', { state: { policy: p } })}
                      style={rowEditBtn}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
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

const editActionBtn: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
}
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
}
const saveBtn: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const saveMsgBox: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--color-success-bg)',
  border: '1px solid var(--color-success-main)', borderRadius: 8,
  color: 'var(--color-success-main)', fontSize: 13, fontWeight: 600, marginBottom: 16,
}

const priceGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
}
const priceCard: React.CSSProperties = {
  background: 'var(--bg-base)', borderRadius: 10, overflow: 'hidden',
  border: '1px solid var(--border-subtle)',
}
const typeBar: React.CSSProperties = { height: 4 }
const priceCardInner: React.CSSProperties = { padding: '14px 16px' }
const priceTypeLabel = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }
const priceValue     = { fontSize: 22, fontWeight: 800, margin: '8px 0 0' }
const inputWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }
const priceInput: React.CSSProperties = {
  width: '90px', padding: '6px 8px', border: '1px solid var(--border-default)',
  borderRadius: 6, fontSize: 16, fontWeight: 700,
  color: 'var(--text-primary)', background: 'var(--input-bg)', outline: 'none', textAlign: 'right',
}
const unitLabel = { fontSize: 14, color: 'var(--text-secondary)' }

const addBtn: React.CSSProperties = {
  padding: '10px 20px', background: 'var(--color-brand-default)',
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
const typeBadge: React.CSSProperties = {
  padding: '2px 8px', background: 'var(--bg-base)', borderRadius: 4,
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
}
const rowEditBtn: React.CSSProperties = {
  padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
  border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}

export default PolicyListPage
