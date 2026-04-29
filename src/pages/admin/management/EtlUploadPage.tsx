/**
 * EtlUploadPage.tsx — AI 매뉴얼 업로드 페이지
 *
 * 직원 교육용 매뉴얼 파일을 벡터DB(PGVector)에 적재하는 관리자 전용 페이지.
 * Spring AI ETL 파이프라인 사용: 파일 추출 → 청킹 → 임베딩 → 벡터 저장.
 *
 * ⚠️ 중요:
 *   업로드 즉시 기존 벡터 데이터와 모든 대화 메모리가 초기화됩니다.
 *   항상 최신 매뉴얼 파일 1개만 유지되는 구조입니다.
 *
 * 접근 권한: ROLE_ADMIN_MANAGEMENT (관리자 계정 관리 권한)
 *
 * 지원 파일 형식: .txt / .pdf / .doc / .docx / .json
 */

import React, { useState, useRef, useCallback } from 'react'
import { UploadCloud, FileText, AlertTriangle, CheckCircle, X, Info } from 'lucide-react'
import { uploadManual } from '../../../api/aiApi'
import styles from './EtlUploadPage.module.css'

// 허용 파일 MIME 타입 목록
const ALLOWED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
]
// 사용자에게 보여줄 허용 확장자 문자열
const ALLOWED_EXTENSIONS = '.txt, .pdf, .doc, .docx, .json'

// 업로드 결과 상태 타입
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

function EtlUploadPage() {
  // 선택된 파일
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // 매뉴얼 제목 (비워두면 파일명으로 자동 설정)
  const [title, setTitle] = useState('')
  // 업로드 상태
  const [status, setStatus] = useState<UploadStatus>('idle')
  // 결과 메시지
  const [message, setMessage] = useState('')
  // 경고 확인 체크박스
  const [warningChecked, setWarningChecked] = useState(false)
  // 드래그 오버 상태 (드롭존 하이라이트용)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 파일 유효성 검사 */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `지원하지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS})`
    }
    // 50MB 제한
    if (file.size > 50 * 1024 * 1024) {
      return '파일 크기가 50MB를 초과합니다.'
    }
    return null
  }

  /** 파일 선택 처리 (input onChange 또는 드롭) */
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setMessage(error)
      setStatus('error')
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
    // 파일명에서 확장자 제거해 title 기본값으로 세팅
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
    setStatus('idle')
    setMessage('')
  }, [title])

  /** input[type=file] 변경 이벤트 */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    // 같은 파일 재선택 가능하도록 value 초기화
    e.target.value = ''
  }

  /** 드래그 앤 드롭 이벤트 핸들러 */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  /** 업로드 실행 */
  const handleUpload = async () => {
    if (!selectedFile || !warningChecked || status === 'uploading') return

    setStatus('uploading')
    setMessage('')

    try {
      const result = await uploadManual(title.trim(), selectedFile)
      setStatus('success')
      setMessage(result || '매뉴얼 업로드 및 벡터DB 적재가 완료되었습니다.')
      // 업로드 성공 후 폼 초기화
      setSelectedFile(null)
      setTitle('')
      setWarningChecked(false)
    } catch (err: unknown) {
      setStatus('error')
      // axios 에러에서 서버 메시지 추출
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setMessage(
        axiosErr.response?.data?.message ??
        '업로드 중 오류가 발생했습니다. 서버 상태를 확인해 주세요.'
      )
    }
  }

  /** 파일 선택 취소 */
  const handleRemoveFile = () => {
    setSelectedFile(null)
    setStatus('idle')
    setMessage('')
  }

  /** 파일 크기 표시 포맷 */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>AI 매뉴얼 업로드</h2>
        <p className={styles.subtitle}>
          직원 교육용 매뉴얼을 업로드하면 AI 챗봇이 해당 내용을 기반으로 답변합니다.
        </p>
      </div>

      <div className={styles.content}>

        {/* ── 경고 박스 ── */}
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <div className={styles.warningText}>
            <strong>업로드 전 반드시 확인하세요</strong>
            <p>
              새 파일을 업로드하면 기존 매뉴얼 데이터와 모든 직원의 AI 대화 내역이
              <strong> 즉시 초기화</strong>됩니다.
              항상 최신 매뉴얼 1개만 유지되는 구조입니다.
            </p>
          </div>
        </div>

        {/* ── 폼 ── */}
        <div className={styles.form}>

          {/* 제목 입력 */}
          <div className={styles.field}>
            <label className={styles.label}>
              매뉴얼 제목
              <span className={styles.optional}>(선택 — 비워두면 파일명 사용)</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="예: CineOS 직원 운영 매뉴얼 v2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={status === 'uploading'}
            />
          </div>

          {/* 파일 드롭존 */}
          <div className={styles.field}>
            <label className={styles.label}>
              파일 선택
              <span className={styles.required}>*</span>
            </label>

            {selectedFile ? (
              // 파일 선택됨 — 파일 정보 카드
              <div className={styles.fileCard}>
                <FileText size={20} className={styles.fileIcon} />
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{selectedFile.name}</p>
                  <p className={styles.fileMeta}>{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  className={styles.fileRemoveBtn}
                  onClick={handleRemoveFile}
                  disabled={status === 'uploading'}
                  title="파일 제거"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              // 파일 미선택 — 드롭존
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <UploadCloud size={32} className={styles.dropzoneIcon} />
                <p className={styles.dropzoneText}>
                  클릭하거나 파일을 드래그해서 올려주세요
                </p>
                <p className={styles.dropzoneHint}>
                  지원 형식: {ALLOWED_EXTENSIONS} &nbsp;·&nbsp; 최대 50MB
                </p>
              </div>
            )}

            {/* 숨겨진 파일 input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </div>

          {/* 지원 형식 안내 */}
          <div className={styles.infoBox}>
            <Info size={14} />
            <span>
              PDF·Word·텍스트·JSON 파일을 지원합니다.
              업로드 후 AI가 내용을 분석하고 질문에 답변할 수 있게 됩니다.
            </span>
          </div>

          {/* 경고 확인 체크박스 */}
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={warningChecked}
              onChange={(e) => setWarningChecked(e.target.checked)}
              disabled={status === 'uploading'}
              className={styles.checkbox}
            />
            <span>
              기존 매뉴얼 데이터와 대화 내역이 초기화되는 것을 확인했습니다.
            </span>
          </label>

          {/* 업로드 버튼 */}
          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={!selectedFile || !warningChecked || status === 'uploading'}
          >
            {status === 'uploading' ? (
              <>
                <span className={styles.spinner} />
                업로드 중...
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                매뉴얼 업로드
              </>
            )}
          </button>

          {/* 결과 메시지 */}
          {message && (
            <div className={`${styles.resultMsg} ${
              status === 'success' ? styles.resultSuccess : styles.resultError
            }`}>
              {status === 'success'
                ? <CheckCircle size={15} />
                : <AlertTriangle size={15} />
              }
              <span>{message}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default EtlUploadPage
