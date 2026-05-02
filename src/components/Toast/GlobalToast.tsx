/**
 * GlobalToast.tsx — 전역 Toast 알림 컴포넌트
 *
 * App.tsx 최상단에 한 번만 마운트해서 사용.
 * registerToast()로 자신의 setter를 toast.ts에 등록하면,
 * apiClient 인터셉터 등 React 외부에서도 showToast()로 호출 가능.
 *
 * [동작 방식]
 *   - 알림은 최대 5개까지 쌓임
 *   - 각 알림은 4초 후 자동 제거
 *   - X 버튼으로 수동 제거 가능
 *   - 화면 우하단 고정 (position: fixed)
 *
 * [타입별 색상]
 *   error   — 빨강 (서버 400/500 에러)
 *   success — 초록 (저장 성공 등)
 *   info    — 파랑/골드 (일반 정보)
 *   warning — 노랑 (주의 메시지)
 */
import React, {useEffect, useState} from 'react'
import {AlertCircle, AlertTriangle, CheckCircle, Info, X} from 'lucide-react'
import {registerToast, type ToastType} from '../../utils/toast'

/** 개별 Toast 아이템 타입 */
interface ToastItem {
    id: number
    msg: string
    type: ToastType
}

/** 타입별 스타일 설정 */
const TYPE_CONFIG: Record<ToastType, {
    bg: string
    border: string
    iconColor: string
    icon: React.ReactNode
}> = {
    error: {
        bg: 'var(--color-error-bg, #2d1414)',
        border: 'var(--color-error-main, #e53e3e)',
        iconColor: 'var(--color-error-main, #e53e3e)',
        icon: <AlertCircle size={16}/>,
    },
    success: {
        bg: 'var(--color-success-bg, #142d1a)',
        border: 'var(--color-success-main, #38a169)',
        iconColor: 'var(--color-success-main, #38a169)',
        icon: <CheckCircle size={16}/>,
    },
    info: {
        bg: 'var(--bg-surface, #1a1a2e)',
        border: 'var(--color-brand-default, #ffb800)',
        iconColor: 'var(--color-brand-default, #ffb800)',
        icon: <Info size={16}/>,
    },
    warning: {
        bg: '#2d2414',
        border: '#d69e2e',
        iconColor: '#d69e2e',
        icon: <AlertTriangle size={16}/>,
    },
}

/** 자동 제거까지 걸리는 시간 (ms) */
const AUTO_DISMISS_MS = 4000

/** 화면에 동시에 표시할 최대 개수 */
const MAX_TOASTS = 5

export default function GlobalToast() {
    const [items, setItems] = useState<ToastItem[]>([])

    /**
     * 마운트 시 toast.ts에 setter 등록
     * 이후 showToast() 호출 시 이 함수가 실행됨
     * useEffect 의존성 빈 배열 → 마운트 시 1회만 실행
     */
    useEffect(() => {
        registerToast((msg, type) => {
            const id = Date.now() + Math.random() // 동시 호출 시 ID 충돌 방지

            setItems((prev) => {
                // 최대 개수 초과 시 가장 오래된 것 제거
                const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
                return [...next, {id, msg, type}]
            })

            // 4초 후 자동 제거
            setTimeout(() => {
                setItems((prev) => prev.filter((t) => t.id !== id))
            }, AUTO_DISMISS_MS)
        })
    }, [])

    /** X 버튼 클릭 시 수동 제거 */
    const dismiss = (id: number) => {
        setItems((prev) => prev.filter((t) => t.id !== id))
    }

    if (items.length === 0) return null

    return (
        <div style={containerStyle}>
            {items.map((item) => {
                const cfg = TYPE_CONFIG[item.type]
                return (
                    <div
                        key={item.id}
                        style={{
                            ...toastStyle,
                            background: cfg.bg,
                            borderLeft: `4px solid ${cfg.border}`,
                        }}
                    >
                        {/* 타입 아이콘 */}
                        <span style={{color: cfg.iconColor, flexShrink: 0, display: 'flex'}}>
              {cfg.icon}
            </span>

                        {/* 메시지 */}
                        <span style={msgStyle}>{item.msg}</span>

                        {/* 닫기 버튼 */}
                        <button
                            onClick={() => dismiss(item.id)}
                            style={closeStyle}
                            aria-label="닫기"
                        >
                            <X size={13}/>
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

/* ─── 스타일 ─── */

const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 380,
    pointerEvents: 'none', // 컨테이너 자체는 클릭 통과, 버튼만 클릭 가능
}

const toastStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
    fontSize: 13,
    color: 'var(--text-primary, #f0f0f0)',
    pointerEvents: 'auto',
    minWidth: 260,
}

const msgStyle: React.CSSProperties = {
    flex: 1,
    lineHeight: 1.5,
    wordBreak: 'break-word',
}

const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted, #888)',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
}
