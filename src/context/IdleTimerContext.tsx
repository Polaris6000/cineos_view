/**
 * IdleTimerContext.jsx — 전역 비조작 타이머 Context
 *
 * 키오스크 특성상 1분 이상 아무 조작이 없으면 홈 화면으로 이동.
 * 화면 터치(클릭), 키보드 입력, 마우스 이동 등 모든 조작 시 타이머를 1분으로 리셋.
 *
 * 사용법:
 *   - App.jsx 에서 <IdleTimerProvider> 로 감싸기
 *   - 필요한 컴포넌트에서 useIdleTimer() 훅으로 남은 시간 등 접근
 *
 * 주의:
 *   - 홈 화면(/)에서는 타이머가 동작하지 않음 (홈에서 홈으로 리다이렉트 방지)
 *   - 결제 완료 페이지(/payment/result)에서는 타이머 동작 (완료 후 자동 귀환)
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/** 비조작 제한 시간 (초) */
const IDLE_LIMIT = 60

/**
 * Context 생성
 * remain: 남은 시간 (초)
 * resetTimer: 외부에서 타이머를 수동 리셋할 수 있는 함수
 */
const IdleTimerContext = createContext<{
  remain: number
  resetTimer: () => void
  isExcluded: boolean
}>({
  remain: IDLE_LIMIT,
  resetTimer: () => {},
  isExcluded: false,
})

/**
 * IdleTimerProvider 컴포넌트
 * CustomerLayout 내부 전체를 감싸서 고객 페이지 전역에서 타이머가 동작하게 함.
 */
export function IdleTimerProvider({ children }: { children: ReactNode }) {
  const navigate   = useNavigate()
  const location   = useLocation()

  // 남은 시간 상태 (UI 표시용)
  const [remain, setRemain] = useState(IDLE_LIMIT)

  // 1초 카운트다운 인터벌 ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // 홈 화면이면 타이머를 일시 중지 (홈→홈 리다이렉트 방지)
  const isExcluded = location.pathname === '/' || location.pathname.startsWith('/admin');

  /**
   * 타이머 리셋 함수
   * 조작 이벤트 발생 시 또는 외부에서 수동으로 호출하면
   * 카운트다운을 IDLE_LIMIT(60초)로 다시 시작.
   */
  const resetTimer = useCallback(() => {
    setRemain(IDLE_LIMIT)
  }, [])

  /**
   * 사용자 조작 이벤트 핸들러 — 이벤트 발생 시 타이머 리셋
   * touchstart: 터치스크린 터치
   * mousedown: 마우스 클릭
   * keydown: 키보드 입력
   */
  useEffect(() => {
    const handleInteraction = () => resetTimer()

    // 캡처 단계(capture: true)에서 이벤트 감지 → 이벤트 전파 전에 먼저 처리
    window.addEventListener('touchstart', handleInteraction, { capture: true })
    window.addEventListener('mousedown',  handleInteraction, { capture: true })
    window.addEventListener('keydown',    handleInteraction, { capture: true })

    return () => {
      window.removeEventListener('touchstart', handleInteraction, { capture: true })
      window.removeEventListener('mousedown',  handleInteraction, { capture: true })
      window.removeEventListener('keydown',    handleInteraction, { capture: true })
    }
  }, [resetTimer])

  /**
   * 1초 카운트다운 인터벌
   * 홈 화면이면 타이머 초기화만 하고 카운트다운 안 함.
   * 0초 도달 시 홈으로 이동.
   */
  useEffect(() => {
    // isExcluded이면 항상 IDLE_LIMIT 로 초기화하고 카운트다운 중지
    if (isExcluded) {
      setRemain(IDLE_LIMIT)
      clearInterval(intervalRef.current)
      return
    }

    // 카운트다운 시작
    intervalRef.current = setInterval(() => {
      setRemain((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          // 홈으로 이동 (replace: true → 뒤로가기로 다시 돌아오지 못하게)
          navigate('/', { replace: true })
          return IDLE_LIMIT
        }
        return prev - 1
      })
    }, 1000)

    // cleanup: 경로 변경 또는 언마운트 시 인터벌 제거
    return () => clearInterval(intervalRef.current)
  }, [isExcluded, navigate, location.pathname]) // 경로 바뀔 때마다 타이머 리셋

  return (
    <IdleTimerContext.Provider value={{ remain, resetTimer, isExcluded }}>
      {children}
    </IdleTimerContext.Provider>
  )
}

/**
 * useIdleTimer — Context 소비 훅
 * remain: 남은 시간 (초)
 * resetTimer: 타이머 수동 리셋 함수
 * isExcluded: 타이머를 적용할 화면 여부
 */
export function useIdleTimer() {
  return useContext(IdleTimerContext)
}
