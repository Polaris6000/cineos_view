/**
 * aiApi.ts — Spring AI (RAG) 연동 API 함수 모음
 *
 * 엔드포인트:
 *   POST /api/admin/rag/chat        — RAG 기반 챗밇 질문/답변
 *   POST /api/admin/etl/file        — 매뉴얼 파일 업로드 → 벡터DB 적재
 *
 * 백엔드 특이사항:
 *   - /api/admin/** 경로는 JWT 인증 필요 (관리자 로그인 후에만 사용 가능)
 *   - ETL 업로드 시 기존 벡터 데이터 + 대화 내역 전체 초기화됨 (주의!)
 *   - RAG 챗의 conversationId = 관리자 loginId (DB에 대화 메모리 저장)
 *   - title 이 빈 문자열이면 전체 매뉴얼에서 검색, 특정 제목 지정 시 필터링
 *   - ETL: 백엔드 @RequestPart 는 title(optional), file 두 가지만 받음
 */

import apiClient from './apiClient'

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────────────────

/** POST /api/admin/rag/chat 요청 바디 */
export interface RagRequest {
    question: string       // 사용자 질문
    title: string          // 검색 필터용 매뉴얼 제목 (빈 문자열 = 전체 검색)
    conversationId: string // 대화 메모리 키 (보통 관리자 loginId)
}

/** POST /api/admin/etl/file 응답: 성공 메시지 문자열 */
export type EtlResponse = string

// ─── API 함수 ──────────────────────────────────────────────────────────────────────────────

/**
 * RAG 챗밇 질문 전송
 *
 * 내부적으로 벡터DB(PGVector) 유사도 검색 → LLM 답변 생성 흐름.
 * 대화 메모리가 DB에 저장되므로 이전 대화 맥락을 이어받아 답변함.
 *
 * @param question       사용자가 입력한 질문 텍스트
 * @param title          매뉴얼 제목 필터 (빈 문자열이면 전체 매뉴얼 검색)
 * @param conversationId 대화 세션 식별자 (관리자 loginId 사용 권장)
 * @returns              LLM이 생성한 답변 문자열
 */
export async function chatWithRag(
    question: string,
    title: string,
    conversationId: string
): Promise<string> {
    const body: RagRequest = {question, title, conversationId}

    // 백엔드 응답은 순수 문자열
    const res = await apiClient.post<string>('/admin/rag/chat', body)
    return res.data
}

/**
 * 매뉴얼 파일 업로드 → ETL(벡터DB 적재)
 *
 * 업로드 즉시 기존 벡터 데이터(rag.vector_store)와
 * 대화 메모리(rag.spring_ai_chat_memory) 테이블이 TRUNCATE됨!
 *
 * 지원 파일 형식: .txt / .pdf / .doc / .docx / .json
 * 백엔드 @RequestPart: title(optional), file — author 파라미터 없음
 *
 * @param title  매뉴얼 제목 (비워두면 백엔드에서 파일명으로 자동 설정)
 * @param file   업로드할 파일 객체
 * @returns      처리 완료 메시지 문자열
 */
export async function uploadManual(
    title: string,
    file: File
): Promise<EtlResponse> {
    const formData = new FormData()
    if (title) formData.append('title', title)
    formData.append('file', file)

    // axios에 multipart/form-data 명시 — Content-Type boundary 자동 처리
    const res = await apiClient.post<string>('/admin/etl/file', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
    })
    return res.data
}
