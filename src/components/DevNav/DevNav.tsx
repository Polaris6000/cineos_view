/**
 * DevNav.tsx — 포트폴리오 데모용 빠른 네비게이션 패널
 *
 * 포트폴리오 열람자(면접관)가 별도 안내 없이도 모든 화면을 탐색할 수 있도록
 * 우상단에 항상 고정 표시.
 *
 * 기능:
 *  - 고객 화면 주요 페이지 바로가기
 *  - 관리자 화면 주요 페이지 바로가기
 *  - 최소화/최대화 토글
 *  - 드래그로 위치 이동 (헤더를 잡고 드래그)
 *  - 위치는 localStorage(devnav_pos)에 저장 → 새로고침 후에도 유지
 */
import {useCallback, useEffect, useRef, useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {ChevronDown, ChevronUp, Code2} from 'lucide-react'

/** 현재 뷰포트 기준 기본 위치 — 우상단 여백 16px */
function getDefaultPos(): { x: number; y: number } {
  return {x: window.innerWidth - 232, y: 16}
}

/**
 * localStorage에서 저장된 위치 복원.
 * 저장된 좌표가 현재 뷰포트 밖을 벗어나면 기본 위치로 초기화.
 * (다른 해상도·창 크기에서 저장된 위치가 화면 밖에 찍히는 문제 방지)
 */
function loadPos(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem('devnav_pos')
    if (saved) {
      const parsed = JSON.parse(saved) as { x: number; y: number }
      const margin = 40
      const inBounds =
        parsed.x >= 0 &&
        parsed.y >= 0 &&
        parsed.x < window.innerWidth - margin &&
        parsed.y < window.innerHeight - margin
      if (inBounds) return parsed
    }
  } catch { /* ignore */
  }
  return getDefaultPos()
}

/* ── 바로가기 링크 정의 ── */

const CUSTOMER_LINKS = [
  {label: '홈', path: '/'},
  {label: '영화 목록', path: '/movie/list'},
  {label: '영화 상세', path: '/movie/detail/1'},
  {label: '상영 일정', path: '/booking/schedule'},
  {label: '좌석 선택', path: '/booking/seat'},
  {label: '결제', path: '/payment'},
  {label: '결제 완료', path: '/payment/result'},
]

const ADMIN_LINKS = [
  {label: '로그인', path: '/admin/login'},
  {label: '대시보드', path: '/admin/statistics/dashboard'},
  {label: '일별 통계', path: '/admin/statistics/stats/daily'},
  {label: '월별 통계', path: '/admin/statistics/stats/monthly'},
  {label: '시간대 통계', path: '/admin/statistics/stats/by-hour'},
  {label: '요일 통계', path: '/admin/statistics/stats/by-day'},
  {label: '영화별 통계', path: '/admin/statistics/stats/by-movie'},
  {label: '영화 목록', path: '/admin/management/movie/list'},
  {label: '영화 등록', path: '/admin/management/movie/form'},
  {label: '상영 관리', path: '/admin/management/movie/manage'},
  {label: '상영관 목록', path: '/admin/management/theater/list'},
  {label: '상영관 편집', path: '/admin/management/theater/edit'},
  {label: '좌석 현황', path: '/admin/management/seat/list'},
  {label: '정책 목록', path: '/admin/management/policy/list'},
  {label: '할인정책 등록', path: '/admin/management/policy/form'},
  {label: '적립정책 등록', path: '/admin/management/policy/bonus-form'},
  {label: '쿠폰 목록', path: '/admin/management/coupon/list'},
  {label: '회원 관리', path: '/admin/management/members'},
  {label: '계정 관리', path: '/admin/management/accounts'},
  {label: '환불', path: '/admin/refund'},
]

/* ── 인라인 스타일 ── */
const panelBase: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9000,
  background: 'rgba(14, 11, 8, 0.92)',
  border: '1px solid #ffb800',
  borderRadius: 10,
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  fontSize: 12,
  color: '#fff8f0',
  minWidth: 200,
  backdropFilter: 'blur(6px)',
  overflow: 'hidden',
  userSelect: 'none',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: 'rgba(255,184,0,0.15)',
  borderBottom: '1px solid rgba(255,184,0,0.3)',
  cursor: 'grab',
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
  transition: 'color 0.1s, background 0.1s',
}

function DevNav() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos)
  
  // 드래그 상태 ref — 렌더를 유발하지 않기 위해 ref 사용
  const dragging = useRef(false)
  // 마우스 포인터와 패널 좌상단 사이의 오프셋
  const offset = useRef({x: 0, y: 0})
  // 패널 DOM 참조 (크기 계산용)
  const panelRef = useRef<HTMLDivElement>(null)
  
  // 드래그 중 마우스 이동
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const panelW = panelRef.current?.offsetWidth ?? 200
    const panelH = panelRef.current?.offsetHeight ?? 48
    const newX = Math.min(Math.max(e.clientX - offset.current.x, 0), window.innerWidth - panelW)
    const newY = Math.min(Math.max(e.clientY - offset.current.y, 0), window.innerHeight - panelH)
    setPos({x: newX, y: newY})
  }, [])
  
  // 드래그 종료 — 위치 localStorage에 저장
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    dragging.current = false
    if (panelRef.current) {
      const hdr = panelRef.current.querySelector<HTMLElement>('[data-drag-handle]')
      if (hdr) hdr.style.cursor = 'grab'
    }
    const panelW = panelRef.current?.offsetWidth ?? 200
    const panelH = panelRef.current?.offsetHeight ?? 48
    const savedX = Math.min(Math.max(e.clientX - offset.current.x, 0), window.innerWidth - panelW)
    const savedY = Math.min(Math.max(e.clientY - offset.current.y, 0), window.innerHeight - panelH)
    try {
      localStorage.setItem('devnav_pos', JSON.stringify({x: savedX, y: savedY}))
    } catch { /* ignore */
    }
  }, [])
  
  // document에 mousemove/mouseup 리스너 등록
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])
  
  // 헤더 mousedown — 드래그 시작
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
    ;(e.currentTarget as HTMLElement).style.cursor = 'grabbing'
    e.preventDefault()
  }
  
  return (
    <div
      ref={panelRef}
      style={{...panelBase, left: pos.x, top: pos.y}}
    >
      {/* 헤더 — 드래그 핸들 + 접기/펼치기 버튼 */}
      <div
        data-drag-handle
        style={headerStyle}
        onMouseDown={handleHeaderMouseDown}
      >
        <span style={{display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none'}}>
          <Code2 size={12} color="#ffb800"/>
          <span style={{color: '#ffb800', fontWeight: 700}}>데모 네비게이션</span>
          <span style={{color: '#6b5c4e', fontSize: 10, fontWeight: 400}}>드래그 이동 가능</span>
        </span>
        <span style={{
          color: '#4f4537', maxWidth: 100,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {location.pathname}
        </span>
        <span
          style={{cursor: 'pointer', lineHeight: 0}}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronDown size={12}/> : <ChevronUp size={12}/>}
        </span>
      </div>
      
      {!collapsed && (
        <div style={{maxHeight: 520, overflowY: 'auto'}}>
          <p style={sectionTitle}>고객 화면</p>
          {CUSTOMER_LINKS.map(({label, path}) => (
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
              <span style={{color: '#4f4537', marginLeft: 6}}>{path}</span>
            </button>
          ))}
          
          <div style={{height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0'}}/>
          
          <p style={sectionTitle}>관리자 화면</p>
          {ADMIN_LINKS.map(({label, path}) => (
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
              <span style={{color: '#4f4537', marginLeft: 6}}>{path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DevNav
