/**
 * AiChatContext.tsx — AI 챗봇 전역 상태 관리
 *
 * 왜 Context가 필요한가:
 *   App.tsx의 AnimatedRoutes 컴포넌트가 <Routes key={location.pathname}> 를 사용하기 때문에
 *   페이지 이동 시 Routes 트리 전체가 리마운트된다.
 *   그 결과 AdminLayout도 같이 리마운트되어 chatOpen, messages 상태가 초기화된다.
 *
 *   이 Context를 AnimatedRoutes 바깥(App.tsx)에서 감싸면,
 *   페이지 이동 여부와 무관하게 챗봇 상태가 유지된다.
 */

import {createContext, ReactNode, useContext, useState} from 'react'

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 채팅 메시지 단위 — AiChatPanel과 공유 */
export interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: Date
  isError?: boolean
}

interface AiChatContextValue {
  /** 챗봇 패널 열림 여부 */
  chatOpen: boolean
  setChatOpen: React.Dispatch<React.SetStateAction<boolean>>
  /** 대화 메시지 목록 */
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  /** 봇 응답 대기 중 여부 */
  isSending: boolean
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>
}

// ── Context 생성 ──────────────────────────────────────────────────────────────

const AiChatContext = createContext<AiChatContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AiChatProvider({children}: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  
  return (
    <AiChatContext.Provider value={{chatOpen, setChatOpen, messages, setMessages, isSending, setIsSending}}>
      {children}
    </AiChatContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** AI 챗봇 상태에 접근하는 커스텀 훅 */
export function useAiChat(): AiChatContextValue {
  const ctx = useContext(AiChatContext)
  if (!ctx) throw new Error('useAiChat must be used inside AiChatProvider')
  return ctx
}
