/**
 * AiChatPanel.tsx — 관리자 AI 챗봇 패널 컴포넌트
 *
 * AdminLayout 우측에 삽입되는 RAG 기반 AI 챗봇 UI.
 *
 * 기능:
 *   - 직원 매뉴얼 기반 Q&A (벡터DB + LLM, 대화 메모리 지원)
 *   - 메시지 버블 (유저/봇 구분)
 *   - 타이핑 인디케이터 (봇 응답 대기 중 dot 애니메이션)
 *   - 메시지 전송: 버튼 클릭 또는 Enter 키
 *   - 자동 스크롤: 새 메시지 추가 시 하단으로 이동
 *   - 환영 메시지: 대화 없을 때 사용 방법 안내
 *
 * Props:
 *   isOpen        — 패널 열림 여부 (부모가 너비 전환 담당, 여기선 초기화 용도)
 *   conversationId — 대화 메모리 키 (관리자 loginId)
 *   onClose       — 패널 닫기 콜백
 */

import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Bot, RotateCcw, Send, X} from 'lucide-react'
import {chatWithRag} from '../../api/aiApi'
import styles from './AiChatPanel.module.css'

// ─── 타입 ────────────────────────────────────────────────────────────────────

/** 채팅 메시지 단위 */
interface ChatMessage {
    id: string
    role: 'user' | 'bot'
    content: string
    timestamp: Date
    isError?: boolean // 에러 메시지 여부 (붉은 스타일)
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AiChatPanelProps {
    isOpen: boolean
    conversationId: string // 관리자 loginId → 백엔드에서 대화 메모리 키로 사용
    onClose: () => void
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

function AiChatPanel({isOpen, conversationId, onClose}: AiChatPanelProps) {
    // 메시지 리스트 상태
    const [messages, setMessages] = useState<ChatMessage[]>([])
    // 입력창 텍스트 상태
    const [inputText, setInputText] = useState('')
    // 봇 응답 대기 중 여부 (타이핑 인디케이터 표시 + 입력 비활성화)
    const [isSending, setIsSending] = useState(false)

    // 메시지 영역 하단으로 자동 스크롤하기 위한 ref
    const messagesEndRef = useRef<HTMLDivElement>(null)
    // 입력창 포커스용 ref
    const inputRef = useRef<HTMLInputElement>(null)

    // messages 변경 시 스크롤 하단으로 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
    }, [messages, isSending])

    // 패널이 열릴 때 입력창 포커스
    useEffect(() => {
        if (isOpen) {
            // 패널 width 전환 애니메이션(0.3s) 끝난 후 포커스
            const timer = setTimeout(() => inputRef.current?.focus(), 350)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    /**
     * 메시지 전송 핸들러
     * 1. 유저 메시지를 리스트에 추가
     * 2. chatWithRag 호출 (POST /api/admin/rag/chat)
     * 3. 봇 응답 또는 에러 메시지를 리스트에 추가
     */
    const handleSend = useCallback(async () => {
        const text = inputText.trim()
        if (!text || isSending) return

        // 유저 메시지 추가
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setIsSending(true)

        try {
            // title 빈 문자열 = 전체 매뉴얼 대상으로 검색
            const answer = await chatWithRag(text, '', conversationId)

            const botMsg: ChatMessage = {
                id: `bot-${Date.now()}`,
                role: 'bot',
                content: answer,
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, botMsg])
        } catch {
            const errMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                role: 'bot',
                content: '서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
                timestamp: new Date(),
                isError: true,
            }
            setMessages(prev => [...prev, errMsg])
        } finally {
            setIsSending(false)
        }
    }, [inputText, isSending, conversationId])

    // Enter 키 전송 (Shift+Enter는 줄바꿈 아닌 그냥 Enter라 막음)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // 대화 초기화
    const handleClearMessages = () => {
        setMessages([])
        setInputText('')
    }

    // 시간 포맷 (HH:MM)
    const formatTime = (date: Date) =>
        date.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})

    return (
        <div className={styles.panel}>

            {/* ── 헤더 ── */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Bot size={16}/>
                    <span>AI 챗봇</span>
                    <span className={styles.headerBadge}>매뉴얼 기반</span>
                </div>
                <div className={styles.headerActions}>
                    {/* 대화 초기화 버튼 — 메시지 있을 때만 표시 */}
                    {messages.length > 0 && (
                        <button
                            onClick={handleClearMessages}
                            className={styles.clearBtn}
                            title="대화 초기화"
                        >
                            <RotateCcw size={13}/>
                        </button>
                    )}
                    <button onClick={onClose} className={styles.closeBtn} title="챗봇 닫기">
                        <X size={16}/>
                    </button>
                </div>
            </div>

            {/* ── 메시지 영역 ── */}
            <div className={styles.body}>
                {messages.length === 0 ? (
                    // 메시지 없을 때 환영 안내
                    <div className={styles.welcome}>
                        <Bot size={40} className={styles.welcomeIcon}/>
                        <p className={styles.welcomeTitle}>안녕하세요!</p>
                        <p className={styles.welcomeDesc}>
                            업로드된 직원 매뉴얼을 기반으로<br/>
                            궁금한 내용을 답변해 드립니다.
                        </p>
                        <div className={styles.welcomeExamples}>
                            <p className={styles.welcomeExamplesTitle}>예시 질문</p>
                            {/* 예시 클릭 시 입력창에 자동 입력 */}
                            {[
                                '환불 처리 절차가 어떻게 되나요?',
                                '키오스크에서 티켓 출력이 되지 않아요.',
                                '비상 상황 시 대피 요령을 알려주세요!',
                            ].map((ex) => (
                                <button
                                    key={ex}
                                    className={styles.exampleChip}
                                    onClick={() => setInputText(ex)}
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // 메시지 버블 목록
                    <div className={styles.messages}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${
                                    msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot
                                }`}
                            >
                                {/* 봇 아이콘 — 봇 메시지 왼쪽에만 표시 */}
                                {msg.role === 'bot' && (
                                    <div className={styles.botAvatar}>
                                        <Bot size={14}/>
                                    </div>
                                )}

                                <div className={styles.bubbleWrap}>
                                    {/* 메시지 버블 */}
                                    <div
                                        className={`${styles.bubble} ${
                                            msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot
                                        } ${msg.isError ? styles.bubbleError : ''}`}
                                    >
                                        {/* 줄바꿈 보존: white-space:pre-wrap 적용 (CSS에서) */}
                                        {msg.content}
                                    </div>
                                    {/* 발송 시각 */}
                                    <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
                                </div>
                            </div>
                        ))}

                        {/* 봇 타이핑 인디케이터 — isSending=true 일 때만 표시 */}
                        {isSending && (
                            <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                                <div className={styles.botAvatar}>
                                    <Bot size={14}/>
                                </div>
                                <div className={styles.bubbleWrap}>
                                    <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}>
                                        <span className={styles.dot}/>
                                        <span className={styles.dot}/>
                                        <span className={styles.dot}/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 스크롤 앵커 */}
                        <div ref={messagesEndRef}/>
                    </div>
                )}
            </div>

            {/* ── 입력 영역 ── */}
            <div className={styles.inputWrap}>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder={isSending ? '답변 생성 중...' : '메시지를 입력하세요...'}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    maxLength={500}
                />
                <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={isSending || !inputText.trim()}
                    title="전송"
                >
                    <Send size={15}/>
                </button>
            </div>

        </div>
    )
}

export default AiChatPanel
