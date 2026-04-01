/**
 * KeyboardContext.jsx — 터치 키보드 전역 Context
 *
 * 고객용 입력창(input) 포커스 시 화면 하단에 터치 키보드를 자동으로 표시.
 * 어느 컴포넌트에서든 openKeyboard(ref, onChange) 를 호출하면 키보드가 열림.
 *
 * 사용법:
 *   const { openKeyboard, closeKeyboard } = useKeyboard()
 *   <input onFocus={(e) => openKeyboard(e.target, setValue)} />
 */
import { type ReactNode, createContext, useContext, useState, useCallback } from 'react'

const KeyboardContext = createContext({
  isOpen: false,
  inputRef: null,
  onChange: null,
  openKeyboard: () => {},
  closeKeyboard: () => {},
  currentValue: '',
  setCurrentValue: () => {},
  keyboardType: 'text', // 'text' | 'numeric'
})

export function KeyboardProvider({ children }: { children: ReactNode }) {
  // 키보드 표시 여부
  const [isOpen, setIsOpen] = useState(false)
  // 현재 포커스된 input 엘리먼트 ref
  const [inputRef, setInputRef] = useState(null)
  // 현재 입력 값
  const [currentValue, setCurrentValue] = useState('')
  // 값이 바뀔 때 호출할 콜백 (보통 setState)
  const [onChange, setOnChange] = useState(null)
  // 키보드 종류: 'text'(기본 한/영 키보드) | 'numeric'(숫자 키패드)
  const [keyboardType, setKeyboardType] = useState('text')

  /**
   * 키보드 열기
   * @param {HTMLInputElement} inputEl - 포커스된 input 엘리먼트
   * @param {string} value - 현재 input 값
   * @param {function} onChangeFn - 값 변경 콜백
   * @param {'text'|'numeric'} type - 키보드 종류 (기본값: 'text')
   */
  const openKeyboard = useCallback((inputEl, value, onChangeFn, type = 'text') => {
    setInputRef(inputEl)
    setCurrentValue(value ?? '')
    // useState의 setter에 함수를 넘기면 lazy initializer로 처리되므로 래핑
    setOnChange(() => onChangeFn)
    setKeyboardType(type)
    setIsOpen(true)
  }, [])

  /** 키보드 닫기 */
  const closeKeyboard = useCallback(() => {
    setIsOpen(false)
    setInputRef(null)
    setOnChange(null)
    setKeyboardType('text')
  }, [])

  return (
    <KeyboardContext.Provider value={{
      isOpen,
      inputRef,
      onChange,
      openKeyboard,
      closeKeyboard,
      currentValue,
      setCurrentValue,
      keyboardType,
    }}>
      {children}
    </KeyboardContext.Provider>
  )
}

/** useKeyboard 훅 */
export function useKeyboard() {
  return useContext(KeyboardContext)
}
