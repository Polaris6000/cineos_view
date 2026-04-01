/**
 * TheaterListPage.jsx — 상영관 목록
 * TODO: GET /api/admin/theaters 연동
 */
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { MOCK_THEATERS } from '../../../api/mockData'

function TheaterListPage() {
  const navigate = useNavigate()
  return (
    <div>
      <h2 style={pageTitle}>상영관 목록</h2>
      <div style={grid}>
        {MOCK_THEATERS.map((t) => (
          <div key={t.id} style={card}>
            {/* 상단: 이름 */}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t.name}</h3>
            </div>
            {/* 정보 */}
            <dl style={dl}>
              <dt style={dt}>총 좌석</dt>  <dd style={dd}>{t.totalSeats}석</dd>
              <dt style={dt}>배치</dt>     <dd style={dd}>{t.rows}행 × {t.cols}열</dd>
              <dt style={dt}>기본 요금</dt><dd style={dd}>{t.basePrice.toLocaleString()}원</dd>
              <dt style={dt}>리클라이너</dt>
              <dd style={dd}>
                {t.hasRecliner
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success-main)' }}><Check size={14} />있음</span>
                  : '없음'}
              </dd>
            </dl>
            <button
              onClick={() => navigate('/admin/management/theater/edit', { state: { theater: t } })}
              style={editBtn}
            >
              수정
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const grid      = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }
const card      = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const dl        = { display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 10px', marginBottom: 16 }
const dt        = { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }
const dd        = { fontSize: 14, color: 'var(--text-primary)', margin: 0 }
const editBtn   = { width: '100%', padding: '10px 0', background: 'var(--primitive-brand-50)', border: '1px solid var(--color-brand-default)',
                    borderRadius: 8, color: 'var(--primitive-brand-700)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

export default TheaterListPage
