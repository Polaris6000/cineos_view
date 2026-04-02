/**
 * CustomerLayout.jsx — 고객 영역 공통 레이아웃
 *
 * FHD(1080×1920) 세로형 키오스크 기준으로 설계.
 *
 * 통합된 기능:
 *   - 전역 비조작 타이머 (IdleTimerProvider): 1분 미조작 시 홈 이동
 *   - 전역 터치 키보드 (KeyboardProvider + TouchKeyboard)
 *   - 상단 헤더: CineOS 로고 + 타이머 표시
 *   - 페이지 전환 애니메이션 (Framer Motion)
 *
 * 레이아웃 구조:
 *   <div class="layout">  ← 1080px 고정 너비, 1920px 최소 높이
 *     <header>            ← 로고 + 타이머 바
 *     <main>              ← 페이지 콘텐츠
 *     <TouchKeyboard />   ← 하단 fixed 키보드
 *   </div>
 */
import {Outlet, Link} from 'react-router-dom'
import {motion} from 'framer-motion'
import {Clock} from 'lucide-react'
import {pageVariants, pageTransition} from '../../styles/transitions'
import {IdleTimerProvider, useIdleTimer} from '../../context/IdleTimerContext'
import {KeyboardProvider} from '../../context/KeyboardContext'
import TouchKeyboard from '../TouchKeyboard/TouchKeyboard'
import styles from './CustomerLayout.module.css'

/**
 * InnerLayout — 실제 레이아웃 렌더링
 * IdleTimerProvider 안에서 렌더링되어야 useIdleTimer() 훅을 사용 가능
 */
function InnerLayout() {
    // 남은 비조작 시간 (초)
    const {remain, isExcluded} = useIdleTimer()

    // 남은 시간에 따른 타이머 색상: 30초 이하면 경고색
    const timerUrgent = remain <= 30 && !isExcluded

    return (
        <div className={styles.layout}>

            {/* ── 상단 헤더 (isExcluded이 아닐 때만 렌더링) ── */}
            {!isExcluded && (
                <header className={styles.header}>
                    {/* 로고 */}
                    <Link to="/" className={styles.logoLink}>
                        <img
                            src="/logo_cineos.svg"
                            alt="CineOS 로고"
                            className={styles.logo}
                        />
                    </Link>

                    {/* 비조작 타이머 (홈 화면이 아닐 때만 표시) */}
                    {!isExcluded && (
                        <div className={`${styles.timerBadge} ${timerUrgent ? styles.timerUrgent : ''}`}>
                            <Clock size={16}/>
                            <span className={styles.timerText}>
              {String(Math.floor(remain / 60)).padStart(2, '0')}:{String(remain % 60).padStart(2, '0')}
            </span>
                            <span className={styles.timerLabel}>후 홈으로 이동</span>
                        </div>
                    )}
                </header>
            )}

            {/* ── 메인 콘텐츠 영역 ── */}
            <main className={styles.main}>
                {/*
          motion.div: Framer Motion 페이지 전환 애니메이션
          App.jsx 의 AnimatePresence 와 연동됨
        */}
                <motion.div
                    className={styles.pageWrapper}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={pageTransition}
                >
                    {/* Outlet: 현재 URL에 맞는 자식 페이지 렌더링 */}
                    <Outlet/>
                </motion.div>
            </main>

            {/* ── 터치 키보드 (입력창 포커스 시 자동 표시) ── */}
            <TouchKeyboard/>
        </div>
    )
}

/**
 * CustomerLayout — Provider 계층 구성 후 InnerLayout 렌더링
 *
 * Provider 중첩 순서:
 * KeyboardProvider → IdleTimerProvider → InnerLayout
 * (InnerLayout 에서 useIdleTimer 사용하므로 IdleTimerProvider 안에 있어야 함)
 */
function CustomerLayout() {
    return (
        <KeyboardProvider>
            <IdleTimerProvider>
                <InnerLayout/>
            </IdleTimerProvider>
        </KeyboardProvider>
    )
}

export default CustomerLayout
