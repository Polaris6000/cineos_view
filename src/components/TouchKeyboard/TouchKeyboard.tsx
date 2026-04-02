/**
 * TouchKeyboard.jsx — 터치 키보드 컴포넌트
 *
 * simple-keyboard 라이브러리 기반 터치스크린 전용 키보드.
 * 화면 하단에 fixed 로 표시되며, 한/영 전환 가능.
 *
 * 지원 모드:
 *   - 'text'   : QWERTY + 한글 키보드 (한글 기본값)
 *   - 'numeric': 숫자 키패드 (전화번호·인증번호 입력용)
 *
 * 변경사항:
 *   - 한글을 기본 레이아웃으로 설정
 *   - .com 버튼 → 한/영 전환 버튼({lang})으로 교체
 *   - 언어 전환 시 인스턴스 재생성 없이 setOptions() 로 처리 (스택 방지)
 *   - keyboardType='numeric' 이면 숫자 키패드만 표시
 *   - containerRef 로 DOM 타겟 직접 지정해 중복 마운트 방지
 *
 * 연동 방식:
 *   - KeyboardContext 를 통해 전역적으로 관리
 *   - input 포커스 시 openKeyboard(el, val, fn, type) 호출
 */
import {useEffect, useRef, useState} from 'react'
import Keyboard from 'simple-keyboard'
import * as Hangul from 'hangul-js';
import 'simple-keyboard/build/css/index.css'
import KoreanLayout from 'simple-keyboard-layouts/build/layouts/Korean'
import {useKeyboard} from '../../context/KeyboardContext'
import styles from './TouchKeyboard.module.css'

/* ─── 영문 커스텀 레이아웃 ─────────────────────────────
   기본 simple-keyboard 레이아웃에서 '.com' → '{lang}' 으로 교체
   {lang} 버튼을 누르면 한글로 전환됨
   ─────────────────────────────────────────────────── */
const ENGLISH_LAYOUT = {
    default: [
        '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
        '{tab} q w e r t y u i o p [ ] \\',
        '{lock} a s d f g h j k l ; \' {enter}',
        '{shift} z x c v b n m , . / {shift}',
        '{lang} @ {space} {enter}',
    ],
    shift: [
        '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
        '{tab} Q W E R T Y U I O P { } |',
        '{lock} A S D F G H J K L : " {enter}',
        '{shift} Z X C V B N M < > ? {shift}',
        '{lang} @ {space} {enter}',
    ],
}

/* ─── 숫자 키패드 레이아웃 ────────────────────────────
   전화번호·인증번호 입력에 사용
   ─────────────────────────────────────────────────── */
const NUMPAD_LAYOUT = {
    default: [
        '1 2 3',
        '4 5 6',
        '7 8 9',
        '{bksp} 0 {enter}',
    ],
}

/* ─── 버튼 display 텍스트 ─────────────────────────── */
const BUTTON_DISPLAY = {
    '{bksp}': '⌫',
    '{enter}': '확인',
    '{shift}': '⇧',
    '{lock}': 'Caps',
    '{tab}': 'Tab',
    '{space}': '────────────────────',
    '{lang}': '한/영',
}

function TouchKeyboard() {
    const {
        isOpen,
        onChange,
        closeKeyboard,
        currentValue,
        setCurrentValue,
        keyboardType, // 'text' | 'numeric'
    } = useKeyboard()

    // simple-keyboard 인스턴스 ref
    const keyboardRef = useRef<any>(null)
    // 키보드가 마운트될 DOM 컨테이너 ref (중복 마운트 방지)
    const containerRef = useRef<HTMLDivElement>(null)

    // 한글(true) / 영어(false) — 한글이 기본값
    const [isKorean, setIsKorean] = useState(true)

    /**
     * 현재 모드에 맞는 레이아웃 옵션 반환
     */
    const getLayoutOptions = (korean) => {
        if (keyboardType === 'numeric') {
            return {
                layout: NUMPAD_LAYOUT,
                layoutName: 'default',
                display: {'{bksp}': '⌫', '{enter}': '확인'},
            }
        }
        return {
            layout: korean ? KoreanLayout.layout : ENGLISH_LAYOUT,
            layoutName: 'default',
            display: BUTTON_DISPLAY,
        }
    }

    /**
     * isOpen 이 true 로 바뀔 때 키보드 인스턴스 생성
     * false 로 바뀔 때 제거
     * keyboardType 이 바뀔 때도 재생성 (숫자패드 ↔ 텍스트 전환)
     */
    useEffect(() => {
        if (!isOpen) {
            // 닫힐 때 인스턴스 파괴
            if (keyboardRef.current) {
                keyboardRef.current.destroy()
                keyboardRef.current = null
            }
            return
        }

        // containerRef 가 준비될 때까지 짧게 대기 (React 렌더 완료 후 실행)
        const timer = setTimeout(() => {
            if (!containerRef.current) return

            // 혹시 남아있는 인스턴스 제거 후 새로 생성 (스택 방지)
            if (keyboardRef.current) {
                keyboardRef.current.destroy()
                // keyboardRef.current = null
            }

            const layoutOpts = getLayoutOptions(isKorean)

            keyboardRef.current = new Keyboard(containerRef.current, {
                // onChange는 사용하지 않고 onKeyPress에서 모든 조합을 처리
                onKeyPress: (button) => {
                    // 특수 키({lang}, {shift}, {enter} 등)는 기존 함수에서 처리
                    if (button.startsWith("{") && button.endsWith("}")) {
                        handleSpecialKey(button)
                    } else {
                        // 한글 조합 로직: 기존 값 + 누른 키를 분해 후 재조립
                        const prev = currentValue || ""
                        const nextValue = Hangul.assemble([...Hangul.disassemble(prev), ...Hangul.disassemble(button)])

                        setCurrentValue(nextValue)
                        if (onChange) onChange(nextValue)
                    }
                },
                // 테마
                theme: 'hg-theme-default cineos-keyboard',
                // 레이아웃 설정
                ...layoutOpts,
            });
            // 생성 직후 현재 값 동기화
            keyboardRef.current.setInput(currentValue || "");
        }, 50)

        return () => clearTimeout(timer)
        // [중요] 의존성 배열의 크기를 고정합니다. (HMR 에러 방지) 의존성 배열 크기를 절대 변경하지 마세요.
    }, [isOpen, keyboardType, isKorean]);

    /**
     * isKorean 전환 시: 인스턴스 재생성 없이 setOptions() 로 레이아웃만 교체
     * → 화면에 키보드가 중복으로 쌓이는 현상 방지
     */
    useEffect(() => {
        if (!keyboardRef.current || keyboardType === 'numeric') return
        const layoutOpts = getLayoutOptions(isKorean)
        keyboardRef.current.setOptions(layoutOpts)
    }, [isKorean]) // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 외부에서 currentValue 가 바뀌면 키보드 입력값도 동기화
     */
    useEffect(() => {
        if (keyboardRef.current) {
            keyboardRef.current.setInput(currentValue || "");
        }
    }, [currentValue])

    /**
     * 특수 키 처리
     */
    const handleSpecialKey = (button) => {
        if (button === '{bksp}') {
            const prev = currentValue || "";
            const disassembled = Hangul.disassemble(prev);
            disassembled.pop(); // 마지막 자모 하나 제거
            const nextValue = Hangul.assemble(disassembled);

            setCurrentValue(nextValue);
            if (onChange) onChange(nextValue);
            return;
        }

        if (button === '{lang}') {
            setIsKorean((prev) => !prev);
            return;
        }

        if (button === '{shift}' || button === '{lock}') {
            const currentLayout = keyboardRef.current?.options.layoutName;
            keyboardRef.current?.setOptions({
                layoutName: currentLayout === 'shift' ? 'default' : 'shift',
            });
            return;
        }

        if (button === '{enter}') {
            closeKeyboard();
            return;
        }
    };

    // 닫혀 있으면 렌더링 안 함
    if (!isOpen) return null

    const isNumeric = keyboardType === 'numeric'

    return (
        // 오버레이: 키보드 외부(위쪽) 클릭 시 닫기
        <div
            className={styles.overlay}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeKeyboard()
            }}
        >
            <div className={`${styles.keyboardWrapper} ${isNumeric ? styles.numpadWrapper : ''}`}>

                {/* 상단 툴바 */}
                <div className={styles.toolbar}>
                    {/* 텍스트 모드일 때만 한/영 전환 버튼 표시 */}
                    {!isNumeric && (
                        <button
                            type="button"
                            className={`${styles.langBtn} ${isKorean ? styles.langBtnActive : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault() // input blur 방지
                                setIsKorean((prev) => !prev)
                            }}
                        >
                            {isKorean ? '한국어' : 'English'}
                        </button>
                    )}
                    {isNumeric && (
                        // 숫자 키패드 모드일 때 왼쪽 자리 채우기용 레이블
                        <span className={styles.numpadLabel}>숫자 입력</span>
                    )}
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onMouseDown={(e) => {
                            e.preventDefault()
                            closeKeyboard()
                        }}
                    >
                        ✕ 닫기
                    </button>
                </div>

                {/* simple-keyboard 가 마운트될 div — containerRef 로 직접 참조 */}
                <div ref={containerRef} className="simple-keyboard"/>
            </div>
        </div>
    )
}

export default TouchKeyboard
