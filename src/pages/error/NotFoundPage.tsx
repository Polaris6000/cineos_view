/**
 * NotFoundPage.tsx — 404 에러 페이지
 *
 * 존재하지 않는 경로로 접근했을 때 표시.
 * App.tsx 와일드카드 라우트 path="*" 에 연결.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Film } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={pageStyle}>
      {/* 로고 아이콘 */}
      <div style={iconWrap}>
        <Film size={40} color="var(--color-brand-default, #ffb800)" />
      </div>

      {/* 에러 코드 */}
      <h1 style={errorCode}>404</h1>

      <p style={titleText}>페이지를 찾을 수 없습니다</p>
      <p style={descText}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>

      {/* 버튼 영역 */}
      <div style={btnGroup}>
        <button onClick={() => navigate(-1)} style={outlineBtn}>
          <ArrowLeft size={15} />
          이전으로
        </button>
        <button onClick={() => navigate('/')} style={primaryBtn}>
          <Home size={15} />
          홈으로
        </button>
      </div>
    </div>
  )
}

/* ─── 스타일 ─── */
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  background: 'var(--bg-base, #0d0d0d)',
  padding: 32,
  textAlign: 'center',
}
const iconWrap: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'var(--bg-surface, #1a1a1a)',
  border: '2px solid var(--color-brand-default, #ffb800)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
}
const errorCode: React.CSSProperties = {
  fontSize: 80,
  fontWeight: 800,
  color: 'var(--color-brand-default, #ffb800)',
  lineHeight: 1,
  margin: 0,
  letterSpacing: '-2px',
}
const titleText: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--text-primary, #f0f0f0)',
  margin: 0,
}
const descText: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary, #aaa)',
  margin: 0,
  marginBottom: 8,
}
const btnGroup: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 8,
}
const primaryBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '11px 22px',
  background: 'var(--color-brand-default, #ffb800)',
  color: '#000',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
const outlineBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '11px 22px',
  background: 'transparent',
  color: 'var(--text-secondary, #aaa)',
  border: '1px solid var(--border-default, #333)',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
}
