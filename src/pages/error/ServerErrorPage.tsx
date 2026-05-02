/**
 * ServerErrorPage.tsx — 500 서버 오류 페이지
 *
 * 심각한 서버 오류 발생 시 표시.
 * App.tsx에 path="500" 라우트로 등록.
 * navigate('/500') 으로 직접 이동하거나 ErrorBoundary에서 사용.
 */
import React from 'react'
import {useNavigate} from 'react-router-dom'
import {AlertOctagon, Home, RefreshCw} from 'lucide-react'

export default function ServerErrorPage() {
    const navigate = useNavigate()

    return (
        <div style={pageStyle}>
            {/* 아이콘 */}
            <div style={iconWrap}>
                <AlertOctagon size={40} color="var(--color-error-main, #e53e3e)"/>
            </div>

            {/* 에러 코드 */}
            <h1 style={errorCode}>500</h1>

            <p style={titleText}>서버 오류가 발생했습니다</p>
            <p style={descText}>
                일시적인 서버 오류입니다. 잠시 후 다시 시도해 주세요.
                <br/>
                문제가 지속되면 관리자에게 문의해 주세요.
            </p>

            {/* 버튼 영역 */}
            <div style={btnGroup}>
                <button onClick={() => window.location.reload()} style={outlineBtn}>
                    <RefreshCw size={15}/>
                    새로고침
                </button>
                <button onClick={() => navigate('/')} style={primaryBtn}>
                    <Home size={15}/>
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
    border: '2px solid var(--color-error-main, #e53e3e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
}
const errorCode: React.CSSProperties = {
    fontSize: 80,
    fontWeight: 800,
    color: 'var(--color-error-main, #e53e3e)',
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
    lineHeight: 1.7,
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
