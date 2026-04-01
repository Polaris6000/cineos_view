/**
 * ForbiddenPage.tsx — 접근 권한 없음 (403)
 *
 * PrivateRoute에서 권한 부족 시 /admin/forbidden 으로 리다이렉트됨.
 * 현재 로그인한 계정과 부족한 권한을 안내하고 뒤로 돌아갈 수 있게 한다.
 */
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function ForbiddenPage() {
  const navigate = useNavigate()
  const { currentAdmin } = useAuth()

  return (
    <div style={wrap}>
      {/* 아이콘 */}
      <div style={iconWrap}>
        <ShieldOff size={48} color="var(--color-error-main)" />
      </div>

      <h1 style={title}>접근 권한이 없습니다</h1>
      <p style={desc}>
        이 페이지는 <strong>최고관리자(SUPER_ADMIN)</strong> 전용 기능입니다.
      </p>

      {/* 현재 로그인 계정 정보 표시 */}
      {currentAdmin && (
        <div style={accountInfo}>
          <span style={accountLabel}>현재 계정</span>
          <span style={accountValue}>
            {currentAdmin.name} (@{currentAdmin.id}) — {
              currentAdmin.role === 'SUPER_ADMIN' ? '최고관리자' : '일반관리자'
            }
          </span>
        </div>
      )}

      {/* 이전 페이지로 돌아가기 버튼 */}
      <button style={backBtn} onClick={() => navigate(-1)}>
        ← 이전 페이지로 돌아가기
      </button>
    </div>
  )
}

/* ── 스타일 ── */
const wrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  gap: 16,
  padding: 40,
  textAlign: 'center',
}

const iconWrap: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: 'var(--color-error-bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
}

const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
}

const desc: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--text-secondary)',
  margin: 0,
  lineHeight: 1.6,
}

const accountInfo: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '12px 24px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  marginTop: 8,
}

const accountLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const accountValue: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: 'monospace',
}

const backBtn: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 24px',
  background: 'var(--btn-primary-bg)',
  color: 'var(--btn-primary-text)',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

export default ForbiddenPage
