/**
 * AdminLayout.tsx — 관리자 영역 공통 레이아웃
 *
 * 레이아웃 구조:
 *   [사이드바 240↔64px] [콘텐츠 flex:1] [AI챗봇 패널 0↔360px]
 *
 * - 좌측 사이드바: 접기/펼치기 토글 (240px ↔ 64px, CSS transition)
 *   - 접기 버튼: 사용자 정보 div 오른쪽에 위치
 *   - 접힘 상태: 아이콘만 표시, hover 툴팁으로 라벨 확인
 *   - 하단: AI 챗봇 토글 버튼
 * - AI 챗봇 패널: 우측에서 슬라이드인, 메인 콘텐츠를 밀어냄 (push 레이아웃)
 *   - width 0 ↔ 360px 전환, overflow:hidden으로 내용 숨김
 * - 상단 헤더: 로그인 사용자 정보 + 역할 뱃지 + 로그아웃
 * - 메인 콘텐츠 영역: Outlet
 * - data-theme="light"/"dark" 를 body 에 붙여 라이트/다크 테마 CSS 변수 적용
 *
 * 권한 체계:
 *   SUPER_ADMIN — 사이드바 전 메뉴 노출
 *   MANAGER     — 통계/정책/회원/계정 메뉴 숨김
 */
import React, {useEffect, useState} from 'react'
import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {motion} from 'framer-motion'
import {
    Armchair,
    BookOpen,
    Bot,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Film,
    LayoutDashboard,
    Moon,
    PlaySquare,
    RotateCcw,
    ScrollText,
    ShieldCheck,
    Sun,
    Ticket,
    Users,
} from 'lucide-react'
import {adminPageTransition, adminPageVariants} from '../../styles/transitions'
import {useAuth} from '../../context/AuthContext'
import type {Permission} from '../../types/auth'
import AiChatPanel from '../AiChatPanel/AiChatPanel'
import styles from './AdminLayout.module.css'

/**
 * 사이드바 네비게이션 메뉴 구성
 * permission 필드: 해당 링크를 표시하기 위해 필요한 권한 (없으면 로그인만 하면 됨)
 */
interface NavItem {
    path: string
    label: string
    Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
    permission?: Permission
}

interface NavSection {
    section: string
    items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
    {
        section: '영화 관리',
        items: [
            {path: '/admin/management/movie/list', label: '영화 목록', Icon: Film, permission: 'ROLE_MOVIE_LIST'},
            {path: '/admin/management/movie/form', label: '영화 등록', Icon: Film, permission: 'ROLE_MOVIE_REGISTER'},
            {path: '/admin/management/movie/manage', label: '상영 관리', Icon: PlaySquare, permission: 'ROLE_MOVIE_DELETE'},
        ],
    },
    {
        section: '상영관/좌석',
        items: [
            {path: '/admin/management/seat/list', label: '좌석 현황', Icon: Armchair, permission: 'ROLE_THEATER_LIST'},
            {path: '/admin/management/theater/list', label: '상영관 편집', Icon: Armchair, permission: 'ROLE_THEATER_EDIT'},
        ],
    },
    {
        section: '정책/환불',
        items: [
            {path: '/admin/management/policy/list', label: '정책 목록', Icon: ScrollText, permission: 'ROLE_POLICY_LIST'},
            {path: '/admin/management/coupon/list', label: '쿠폰 관리', Icon: Ticket, permission: 'ROLE_POLICY_LIST'},
            {path: '/admin/refund', label: '환불 처리', Icon: RotateCcw, permission: 'ROLE_REFUND'},
            {path: '/admin/management/payment-log', label: '결제 로그', Icon: ClipboardList, permission: 'ROLE_REFUND'},
        ],
    },
    {
        section: '통계',
        items: [
            {path: '/admin/statistics/dashboard', label: '대시보드', Icon: LayoutDashboard, permission: 'ROLE_STATISTICS'},
        ],
    },
    {
        section: '회원/계정 관리',
        items: [
            {path: '/admin/management/members', label: '회원 정보 관리', Icon: Users, permission: 'ROLE_MEMBER_MANAGEMENT'},
            {
                path: '/admin/management/accounts',
                label: '계정 및 권한',
                Icon: ShieldCheck,
                permission: 'ROLE_ADMIN_MANAGEMENT'
            },
            {path: '/admin/management/etl', label: 'AI 매뉴얼 관리', Icon: BookOpen, permission: 'ROLE_ADMIN_MANAGEMENT'},
        ],
    },
]

function AdminLayout() {
    const navigate = useNavigate()
    const {currentAdmin, logout, hasPermission} = useAuth()

    // 다크모드 상태 — localStorage에서 복원 (기본값: 라이트)
    const [isDark, setIsDark] = useState(
        () => localStorage.getItem('adminTheme') === 'dark'
    )

    /**
     * 사이드바 펼침/접힘 상태
     * true: 240px 펼침 (기본), false: 64px 아이콘 전용
     * localStorage에 저장해 새로고침 후에도 상태 유지
     */
    const [sidebarOpen, setSidebarOpen] = useState(
        () => localStorage.getItem('adminSidebar') !== 'closed'
    )

    /**
     * AI 챗봇 패널 열림/닫힘 상태
     * true: 우측 360px 패널 노출 (메인 콘텐츠를 밀어냄), false: width:0 숨김
     */
    const [chatOpen, setChatOpen] = useState(false)

    // isDark 변경 시 body의 data-theme 속성 교체
    useEffect(() => {
        if (isDark) {
            // 다크: data-theme 제거 → :root 기본값(다크 웜) 사용
            delete document.body.dataset.theme
        } else {
            // 라이트: data-theme="light" 오버라이드 적용
            document.body.dataset.theme = 'light'
        }
        localStorage.setItem('adminTheme', isDark ? 'dark' : 'light')

        return () => {
            // 관리자 페이지 벗어날 때 다크 테마로 복원
            delete document.body.dataset.theme
        }
    }, [isDark])

    /**
     * sidebarOpen 변경 시 localStorage 저장
     * 새로고침 후에도 펼침/접힘 상태 유지
     */
    useEffect(() => {
        localStorage.setItem('adminSidebar', sidebarOpen ? 'open' : 'closed')
    }, [sidebarOpen])

    // 로그아웃 처리
    const handleLogout = () => {
        logout()
        navigate('/admin/login', {replace: true})
    }

    /**
     * 네비게이션 섹션 필터링
     * 섹션 내 아이템 중 현재 사용자가 권한을 가진 것만 남김
     * 아이템이 하나도 없는 섹션은 통째로 숨김
     */
    const visibleSections = NAV_SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
        ),
    })).filter((sec) => sec.items.length > 0)

    // 역할 뱃지 스타일
    const roleBadgeText = currentAdmin?.level === false ? '최고관리자' : '일반관리자'
    const roleBadgeColor = currentAdmin?.level === false ? '#ffb800' : '#82b0ff'
    const roleBadgeBg = currentAdmin?.level === false
        ? 'rgba(255,184,0,0.15)' : 'rgba(130,176,255,0.15)'

    return (
        <div className={styles.layout}>

            {/* ── 좌측 사이드바 ──
          sidebarOpen 에 따라 .sidebarCollapsed 클래스 추가/제거
          CSS width transition 으로 240px 에서 64px 애니메이션
      */}
            <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>

                {/* 로고 영역 — 접힘 상태에서는 로고만 중앙 정렬 */}
                <div className={styles.sidebarLogo}>
                    <img src="/logo_cineos.svg" alt="CineOS" className={styles.logo}/>
                    {/* 펼침 상태에서만 "관리자" 배지 노출 */}
                    {sidebarOpen && <span className={styles.adminBadge}>관리자</span>}
                </div>

                {/*
          사용자 정보 + 접기/펼치기 버튼 영역
          flex row: [왼쪽 텍스트(펼침 시)] [오른쪽 접기 버튼(항상)]
          접힘 상태: 텍스트 없이 버튼만 중앙 정렬
        */}
                {currentAdmin && (
                    <div className={styles.sidebarUserArea}>
                        {/* 사용자 텍스트 — 펼침 상태에서만 표시 */}
                        {sidebarOpen && (
                            <div className={styles.sidebarUserInfo}>
                                {/* 역할 뱃지 */}
                                <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: roleBadgeColor,
                                    background: roleBadgeBg,
                                    marginBottom: 5,
                                }}>
                  {roleBadgeText}
                </span>
                                {/* 표시 이름 */}
                                <p style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    margin: '0 0 1px'
                                }}>
                                    {currentAdmin.name}
                                </p>
                                {/* 아이디 */}
                                <p style={{fontSize: 11, color: 'var(--text-muted)', margin: 0}}>
                                    @{currentAdmin.loginId}
                                </p>
                            </div>
                        )}

                        {/*
              접기/펼치기 버튼 — 사용자 정보 오른쪽에 항상 표시
              펼침: ChevronLeft (클릭 시 접힘)
              접힘: ChevronRight (클릭 시 펼침)
            */}
                        <button
                            onClick={() => setSidebarOpen((o) => !o)}
                            className={styles.collapseBtn}
                            title={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
                        >
                            {sidebarOpen
                                ? <ChevronLeft size={14}/>
                                : <ChevronRight size={14}/>
                            }
                        </button>
                    </div>
                )}

                {/* 섹션별 네비게이션 — 권한 없는 섹션/항목은 렌더링되지 않음 */}
                <nav className={styles.nav}>
                    {visibleSections.map((section) => (
                        <div key={section.section} className={styles.navSection}>
                            {/*
                섹션 제목 — 펼침 상태에서만 표시
                접힘(64px) 상태에서는 아이콘만 보이므로 섹션 타이틀 불필요
              */}
                            {sidebarOpen && (
                                <p className={styles.navSectionTitle}>{section.section}</p>
                            )}

                            {section.items.map(({path, label, Icon}) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    end
                                    title={!sidebarOpen ? label : undefined}
                                    className={({isActive}) =>
                                        `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                                    }
                                >
                                    {Icon && <Icon size={15} style={{flexShrink: 0}}/>}
                                    {/* 라벨 텍스트 — 펼침 상태에서만 표시 */}
                                    {sidebarOpen && label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* ── 사이드바 하단 — AI 챗봇 버튼 ── */}
                <div className={styles.sidebarFooter}>
                    {/*
            AI 챗봇 토글 버튼
            클릭 시 우측 챗봇 패널 열기/닫기
            접힘 상태: 아이콘만 중앙 정렬, 펼침 상태: "AI 챗봇" 텍스트 포함
            활성(chatOpen=true) 시 골드 강조 스타일 적용
          */}
                    <button
                        onClick={() => setChatOpen((o) => !o)}
                        className={`${styles.chatToggleBtn} ${chatOpen ? styles.chatToggleBtnActive : ''}`}
                        title={!sidebarOpen ? 'AI 챗봇' : undefined}
                    >
                        <Bot size={15} style={{flexShrink: 0}}/>
                        {sidebarOpen && <span>AI 챗봇</span>}
                    </button>
                </div>

            </aside>

            {/* ── 메인 콘텐츠 영역 ──
          flex:1 이므로 사이드바/챗봇 패널 크기에 따라 자동으로 너비 조절됨
      */}
            <div className={styles.content}>

                {/* 상단 헤더 */}
                <header className={styles.header}>
                    <h1 className={styles.pageTitle}>관리자 페이지</h1>
                    <div className={styles.headerActions}>
                        {/* 다크모드 토글 버튼 */}
                        <button
                            onClick={() => setIsDark((d) => !d)}
                            className={styles.themeBtn}
                            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
                        >
                            {isDark ? <Sun size={16}/> : <Moon size={16}/>}
                        </button>
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            로그아웃
                        </button>
                    </div>
                </header>

                {/* 페이지 콘텐츠 */}
                <main className={styles.main}>
                    {/* motion.div: 관리자 페이지 전환 애니메이션 */}
                    <motion.div
                        className={styles.pageWrapper}
                        variants={adminPageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={adminPageTransition}
                    >
                        <Outlet/>
                    </motion.div>
                </main>

            </div>

            {/* ── AI 챗봇 패널 (우측) ──
          항상 DOM에 존재하지만 chatOpen=false 일 때 width:0, overflow:hidden으로 숨김
          chatOpen=true 일 때 .chatPanelOpen 클래스가 추가되어 width:360px로 전환
          flex 레이아웃 덕분에 메인 콘텐츠가 overlay 아닌 push 방식으로 좁아짐
      */}
            <aside className={`${styles.chatPanel} ${chatOpen ? styles.chatPanelOpen : ''}`}>
                {/*
          AiChatPanel 컴포넌트 — 실제 RAG 챗봇 UI
          conversationId로 관리자 loginId를 넘겨 백엔드 대화 메모리 키로 사용
        */}
                <AiChatPanel
                    isOpen={chatOpen}
                    conversationId={currentAdmin?.loginId ?? 'guest'}
                    onClose={() => setChatOpen(false)}
                />
            </aside>

        </div>
    )
}

export default AdminLayout
