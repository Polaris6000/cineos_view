/**
 * AdminLoginPage.tsx — 관리자 로그인 (UC-11)
 *
 * 동작:
 *  - 아이디/비밀번호 입력
 *  - 로그인 실패 시 인라인 에러 메시지 표시 (UC-11: 실패 시 경고창)
 *  - 성공 시 /admin/statistics/dashboard 이동
 *  - AuthContext.login() 을 통해 인증 처리
 *
 * 더미 계정:
 *   admin    / admin123  (최고관리자)
 *   manager  / manager123 (일반관리자)
 *   manager2 / manager123 (일반관리자)
 *
 * TODO: POST /api/admin/login 연동 시 AuthContext.login() 내부만 교체
 */
import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

function AdminLoginPage() {
  const navigate   = useNavigate()
  // useLocation: 로그인 전 접근하려던 경로를 state로 받아 로그인 후 돌아가기 위해
  const location   = useLocation()
  const { login }  = useAuth()

  const [id,      setId]      = useState('')
  const [pw,      setPw]      = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // PrivateRoute에서 리다이렉트될 때 전달한 원래 경로 — 없으면 영화 목록으로
  const from = (location.state as { from?: Location })?.from?.pathname
    ?? '/admin/management/movie/list'

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // 앞뒤 공백 제거 후 검사 — 공백만 입력한 경우도 빈 값으로 처리
    const trimId = id.trim()
    const trimPw = pw.trim()
    if (!trimId || !trimPw) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }

    setLoading(true)

    // AuthContext.login() 호출 — 공백 제거된 값으로 비교, 성공: true, 실패: false 반환
    const ok = await login(trimId, trimPw)

    if (ok) {
      // 로그인 성공 → 원래 접근하려던 페이지(또는 대시보드)로 이동
      navigate(from, { replace: true })
    } else {
      // UC-11: 실패 시 경고창 (인라인 에러 메시지)
      setError('아이디 또는 비밀번호가 틀렸습니다.')
    }
    setLoading(false)
  }

  return (
    <div style={pageWrap}>
      {/* 로고 */}
      <div style={logoWrap}>
        <span style={logoText}>CineOS</span>
        <span style={logoBadge}>관리자</span>
      </div>

      <h1 style={title}>관리자 로그인</h1>

      {/* 테스트 계정 안내 (개발 환경에서만) */}
      {import.meta.env.DEV && (
        <div style={hintBox}>
          <p style={hintTitle}>개발 테스트 계정</p>
          <p style={hintLine}>admin / admin123 — 최고관리자 (모든 기능)</p>
          <p style={hintLine}>manager / manager123 — 일반관리자 (운영만)</p>
        </div>
      )}

      <form onSubmit={handleLogin} style={form}>
        {/* 아이디 */}
        <div style={fieldGroup}>
          <label style={labelStyle}>아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="관리자 아이디"
            required
            style={inputStyle}
            autoComplete="username"
          />
        </div>

        {/* 비밀번호 */}
        <div style={fieldGroup}>
          <label style={labelStyle}>비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호"
            required
            style={inputStyle}
            autoComplete="current-password"
          />
        </div>

        {/* 에러 메시지 (UC-11: 로그인 실패 경고) */}
        {error && (
          <div style={errorBox}>
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={submitBtn}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}

/* ── 스타일 (관리자 전용 라이트 테마) ── */
const pageWrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#f5f3ef', padding: '24px 16px',
}
const logoWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
}
const logoText: React.CSSProperties = {
  fontSize: 28, fontWeight: 900, color: '#0e0b08', letterSpacing: -1,
}
const logoBadge: React.CSSProperties = {
  padding: '3px 10px', background: '#ffb800', borderRadius: 20,
  fontSize: 12, fontWeight: 700, color: '#4c1c00',
}
const title: React.CSSProperties = {
  fontSize: 20, fontWeight: 700, color: '#0e0b08', marginBottom: 16,
}
const hintBox: React.CSSProperties = {
  width: '100%', maxWidth: 380,
  padding: '12px 16px', marginBottom: 20,
  background: '#fffaec', border: '1px solid #ffe08a',
  borderRadius: 8,
}
const hintTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#b8860b',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
}
const hintLine: React.CSSProperties = {
  fontSize: 12, color: '#7a6540', lineHeight: 1.7, fontFamily: 'monospace',
}
const form: React.CSSProperties = {
  width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16,
}
const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#4f4537' }
const inputStyle: React.CSSProperties = {
  padding: '12px 14px', border: '1px solid #dfe0df', borderRadius: 8,
  fontSize: 15, background: '#fff', color: '#0e0b08', outline: 'none',
}
const errorBox: React.CSSProperties = {
  padding: '12px 16px', background: '#fdeaea', border: '1px solid #e03c3c',
  borderRadius: 8, color: '#a82020', fontSize: 14,
}
const submitBtn: React.CSSProperties = {
  padding: '14px 0', background: '#ffb800', color: '#4c1c00',
  border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
  cursor: 'pointer', marginTop: 4,
}

export default AdminLoginPage
