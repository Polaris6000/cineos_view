/**
 * PolicyListPage.jsx — 가격 정책 목록
 * TODO: GET /api/admin/policies 연동
 */
import { useNavigate } from 'react-router-dom'
import { MOCK_POLICIES } from '../../../api/mockData'

function PolicyListPage() {
  const navigate = useNavigate()
  return (
    <div>
      <div style={headerRow}>
        <h2 style={pageTitle}>가격 정책 목록</h2>
        <button onClick={() => navigate('/admin/management/policy/form')} style={addBtn}>
          + 정책 등록
        </button>
      </div>
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>ID</th><th style={th}>정책명</th><th style={th}>유형</th>
              <th style={th}>할인금액</th><th style={th}>설명</th><th style={th}>관리</th>
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
                    style={editBtn}
                  >수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const headerRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }
const pageTitle = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }
const addBtn    = { padding: '10px 20px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const tableWrap = { background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const table     = { width: '100%', borderCollapse: 'collapse' }
const thead     = { background: 'var(--bg-base)' }
const th        = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
                    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }
const tr        = { borderBottom: '1px solid var(--border-subtle)' }
const td        = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }
const typeBadge = { padding: '2px 8px', background: 'var(--bg-base)', borderRadius: 4,
                    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }
const editBtn   = { padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                    border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }

export default PolicyListPage
