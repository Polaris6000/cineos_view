/**
 * toast.ts — 전역 Toast 알림 유틸
 *
 * apiClient(axios 인스턴스)는 React 모듈 바깥이라 Context/Hook을 직접 쓸 수 없음.
 * 그래서 "setter injection" 패턴을 사용:
 *   1. GlobalToast 컴포넌트가 마운트되면 registerToast()로 자신의 setter를 등록.
 *   2. apiClient(또는 어디서든) showToast()를 호출하면 등록된 setter가 실행됨.
 *
 * 사용 예:
 *   import { showToast } from '../utils/toast'
 *   showToast('저장에 실패했습니다.', 'error')
 */

export type ToastType = 'error' | 'success' | 'info' | 'warning'

/** GlobalToast가 등록한 setter 함수 (마운트 전엔 null) */
let _handler: ((msg: string, type: ToastType) => void) | null = null

/**
 * GlobalToast 컴포넌트에서 호출 — 자신의 상태 setter를 전역에 등록
 * App.tsx 트리 안에 GlobalToast가 마운트되면 자동으로 호출됨
 */
export function registerToast(handler: typeof _handler) {
  _handler = handler
}

/**
 * 어디서든 호출 가능한 알림 트리거
 * @param msg  - 표시할 메시지
 * @param type - 'error' | 'success' | 'info' | 'warning' (기본: 'error')
 */
export function showToast(msg: string, type: ToastType = 'error') {
  if (_handler) {
    _handler(msg, type)
  } else {
    // GlobalToast가 아직 마운트 안 됐을 때 fallback
    console.warn(`[Toast] ${type}: ${msg}`)
  }
}
