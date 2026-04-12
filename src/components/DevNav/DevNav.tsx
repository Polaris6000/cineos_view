/**
 * DevNav.tsx — 개발용 빠른 네비게이션 패널
 *
 * import.meta.env.DEV (= vite dev 서버 실행 중) 일 때만 렌더링됨.
 * 프로덕션 빌드에서는 자동으로 사라짐.
 *
 * 기능:
 *  - 고객 화면 주요 페이지 바로가기
 *  - 관리자 화면 주요 페이지 바로가기
 *  - 최소화/최대화 토글
 *  - 우하단 고정 (z-index: 9000)
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Code2, ChevronDown, ChevronUp } from 'lucide-react'

/* ── 바로가기 링크 정의 ─────────────────────────────── */

/** 고객 화면 (키오스크 플로우 순서) */
const CUSTOMER_LINKS = [
  { label: '홈',          path: '/' },
  { label: '영화 목록',   path: '/movie/list' },
  { label: '영화 상세',   path: '/movie/detail/1' },     // movieId=1 예시
  { label: '상영 일정',   path: '/booking/schedule' },   // movieId는 state로 전달
  { label: '좌석 선택',   path: '/booking/seat' },
  { label: '결제',        path: '/payment' },
  { label: '결제 완료',   path: '/payment/result' },
]

/** 관리자 화면 (카테고리별 그룹) */
const ADMIN_LINKS = [
  // ── 인증 ──
  { label: '로그인',         path: '/admin/login' },
  // ── 통계 ──
  { label: '대시보드',       path: '/admin/statistics/dashboard' },
  { label: '일별 통계',      path: '/admin/statistics/stats/daily' },
  { label: '월별 통계',      path: '/admin/statistics/stats/monthly' },
  { label: '시간대 통계',    path: '/admin/statistics/stats/by-hour' },
  { label: '요일 통계',      path: '/admin/statistics/stats/by-day' },
  { label: '영화별 통계',    path: '/admin/statistics/stats/by-movie' },
  // ── 영화 ──
  { label: '영화 목록',      path: '/admin/management/movie/list' },
  { label: '영화 등록',      path: '/admin/management/movie/form' },
  { label: '영화 관리',      path: '/admin/management/movie/manage' },
  // ── 상영관 / 좌석 ──
  { label: '상영관 목록',    path: '/admin/management/theater/list' },
  { label: '상영관 편집',    path: '/admin/management/theater/edit' },
  { label: '좌석 목록',      path: '/admin/management/seat/list' },
  // ── 정책 ──
  { label: '정책 목록',      path: '/admin/management/policy/list' },
  { label: '할인정책 등록',  path: '/admin/management/policy/form' },
  { label: '적립정책 등록',  path: '/admin/management/policy/bonus-form' },
  { label: '쿠폰 목록',      path: '/admin/management/coupon/list' },
  // ── 회원 / 환불 ──
  { label: '회원 관리',      path: '/admin/management/members' },
  { label: '계정 관리',      path: '/admin/management/accounts' },
  { label: '환불',           path: '/admin/refund' },
]

/* ── 인라인 스타일 (tokens.css 의존 없이 독립적으로 동작) ── */
const panel: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 9000,
  background: 'rgba(14, 11, 8, 0.92)',
  border: '1px solid #ffb800',
  borderRadius: 10,
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#fff8f0',
  minWidth: 200,
  backdropFilter: 'blur(6px)',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: 'rgba(255,184,0,0.15)',
  borderBottom: '1px solid rgba(255,184,0,0.3)',
  cursor: 'pointer',
  userSelect: 'none',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#ffb800',
  padding: '6px 12px 4px',
}

const linkBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '5px 12px',
  background: 'transparent',
  border: 'none',
  color: '#b6a999',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'monospace',
  transition: 'color 0.1s, background 0.1s',
}

function DevNav() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  // 프로덕션에서는 렌더링 안 함
  if (!import.meta.env.DEV) return null

  return (
    <div style={panel}>
      {/* 헤더 — 클릭하면 패널 접기/펼치기 */}
      <div style={header} onClick={() => setCollapsed((c) => !c)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Code2 size={12} color="#ffb800" />
          <span style={{ color: '#ffb800', fontWeight: 700 }}>DevNav</span>
        </span>
        {/* 현재 경로 표시 */}
        <span style={{ color: '#4f4537', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {location.pathname}
        </span>
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </div>

      {/* 링크 목록 — collapsed 시 숨김 */}
      {!collapsed && (
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {/* 고객 화면 */}
          <p style={sectionTitle}>고객 화면</p>
          {CUSTOMER_LINKS.map(({ label, path }) => (
            <button
              key={path}
              style={{
                ...linkBtn,
                color: location.pathname === path ? '#ffb800' : '#b6a999',
                background: location.pathname === path ? 'rgba(255,184,0,0.08)' : 'transparent',
              }}
              onClick={() => navigate(path)}
            >
              {label}
              <span style={{ color: '#4f4537', marginLeft: 6 }}>{path}</span>
            </button>
          ))}

          {/* 구분선 */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

          {/* 관리자 화면 */}
          <p style={sectionTitle}>관리자 화면</p>
          {ADMIN_LINKS.map(({ label, path }) => (
            <button
              key={path}
              style={{
                ...linkBtn,
                color: location.pathname === path ? '#ffb800' : '#b6a999',
                background: location.pathname === path ? 'rgba(255,184,0,0.08)' : 'transparent',
              }}
              onClick={() => navigate(path)}
            >
              {label}
              <span style={{ color: '#4f4537', marginLeft: 6 }}>{path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DevNav
