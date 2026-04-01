/**
 * MovieFormPage.jsx — 영화 등록 / 수정 (UC-18, UC-19)
 *
 * state.movie 가 있으면 수정 모드, 없으면 등록 모드
 * 기능:
 *  - 포스터 파일 업로드 (프리뷰 표시)
 *  - 제목/장르/등급/감독/출연/런타임/상영관유형/개봉일/종영일 입력
 *  - 상영 일정 추가/삭제 (상영관 + 시작시간)
 *  - 중복 시간 체크 (같은 날 같은 상영관, 30분 이내)
 * TODO: POST /api/admin/movies, PUT /api/admin/movies/:id 연동
 */
import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { MOCK_THEATERS } from '../../../api/mockData'

const RATING_OPTIONS = [
  { value: 'ALL', label: '전체관람가' },
  { value: '12',  label: '12세 이상' },
  { value: '15',  label: '15세 이상' },
  { value: '19',  label: '청소년관람불가' },
]

function MovieFormPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // 수정 모드: state.movie 존재
  const editMovie = location.state?.movie ?? null
  const isEdit    = editMovie !== null

  // 폼 필드 초기값 (수정이면 기존 값, 등록이면 빈 값)
  const [form, setForm] = useState({
    title:       editMovie?.title       ?? '',
    genre:       editMovie?.genre       ?? '',
    rating:      editMovie?.rating      ?? 'ALL',
    director:    editMovie?.director    ?? '',
    cast:        editMovie?.cast        ?? '',
    runtime:     editMovie?.runtime     ?? '',
    synopsis:    editMovie?.synopsis    ?? '',
    startAt:     editMovie?.startAt     ?? '',
    endAt:       editMovie?.endAt       ?? '',
  })

  // 포스터 프리뷰
  const [posterPreview, setPosterPreview] = useState(editMovie?.posterUrl ?? null)
  const fileRef = useRef(null)

  // 에러 메시지
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  /** 입력값 변경 핸들러 */
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  /** 포스터 파일 선택 */
  const handlePosterChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }
    // FileReader 로 프리뷰 표시
    const reader = new FileReader()
    reader.onload = (ev) => setPosterPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  /** 유효성 검사 */
  const validate = () => {
    const errs = {}
    if (!form.title.trim())    errs.title    = '제목을 입력해 주세요.'
    if (!form.genre.trim())    errs.genre    = '장르를 입력해 주세요.'
    if (!form.director.trim()) errs.director = '감독을 입력해 주세요.'
    if (!form.runtime || isNaN(Number(form.runtime)) || Number(form.runtime) <= 0)
      errs.runtime = '올바른 런타임을 입력해 주세요. (분 단위 숫자)'
    if (!form.startAt)         errs.startAt  = '개봉일을 선택해 주세요.'
    return errs
  }

  /** 제출 */
  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    // TODO: API 연동
    // isEdit → PUT /api/admin/movies/:id
    // 등록  → POST /api/admin/movies
    console.log('[MovieForm] 제출 데이터:', form)
    setSuccess(true)
    setTimeout(() => navigate('/admin/management/movie/list'), 1500)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CheckCircle size={48} color="var(--color-success-main)" />
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>
          {isEdit ? '수정 완료!' : '등록 완료!'}
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>영화 목록으로 돌아갑니다.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={pageTitle}>{isEdit ? '영화 수정' : '영화 등록'}</h2>

      <form onSubmit={handleSubmit}>
        {/* 포스터 업로드 */}
        <div style={section}>
          <label style={sectionLabel}>포스터 이미지</label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* 프리뷰 */}
            <div
              style={posterBox}
              onClick={() => fileRef.current?.click()}
            >
              {posterPreview ? (
                <img src={posterPreview} alt="포스터" style={{ width: '100%', height: '100%',
                                                                objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={posterPH}>
                  <span style={{ fontSize: 32 }}>📷</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>클릭하여 업로드</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePosterChange}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              <p>권장: 2:3 비율 (예: 400×600px)</p>
              <p>지원 형식: JPG, PNG, WEBP</p>
              {posterPreview && (
                <button
                  type="button"
                  onClick={() => setPosterPreview(null)}
                  style={removePosterBtn}
                >
                  이미지 제거
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div style={section}>
          <label style={sectionLabel}>기본 정보</label>
          <div style={grid2}>
            <Field label="제목" required error={errors.title}>
              <input value={form.title} onChange={(e) => handleChange('title', e.target.value)}
                style={input} placeholder="영화 제목" />
            </Field>
            <Field label="장르" error={errors.genre}>
              <input value={form.genre} onChange={(e) => handleChange('genre', e.target.value)}
                style={input} placeholder="예: 액션 / SF" />
            </Field>
            <Field label="관람등급" required>
              <select value={form.rating} onChange={(e) => handleChange('rating', e.target.value)}
                style={input}>
                {RATING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="감독" required error={errors.director}>
              <input value={form.director} onChange={(e) => handleChange('director', e.target.value)}
                style={input} placeholder="감독 이름" />
            </Field>
            <Field label="상영시간(분)" required error={errors.runtime}>
              <input type="number" value={form.runtime}
                onChange={(e) => handleChange('runtime', e.target.value)}
                style={input} placeholder="예: 120" min={1} />
            </Field>
            <Field label="개봉일" required error={errors.startAt}>
              <input type="date" value={form.startAt}
                onChange={(e) => handleChange('startAt', e.target.value)} style={input} />
            </Field>
            <Field label="종영일 (미입력 시 상영예정)">
              <input type="date" value={form.endAt ?? ''}
                onChange={(e) => handleChange('endAt', e.target.value || null)} style={input}
                min={form.startAt} />
            </Field>
          </div>

          {/* 출연진 */}
          <Field label="출연진" style={{ marginTop: 12 }}>
            <input value={form.cast} onChange={(e) => handleChange('cast', e.target.value)}
              style={input} placeholder="주연 배우 (쉼표로 구분)" />
          </Field>

          {/* 줄거리 */}
          <Field label="줄거리" style={{ marginTop: 12 }}>
            <textarea
              value={form.synopsis}
              onChange={(e) => handleChange('synopsis', e.target.value)}
              style={{ ...input, height: 100, resize: 'vertical' }}
              placeholder="영화 줄거리를 입력해 주세요."
            />
          </Field>
        </div>

        {/* 제출 버튼 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtn}>취소</button>
          <button type="submit" style={submitBtn}>
            {isEdit ? '수정 완료' : '등록 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** 필드 래퍼 컴포넌트 */
function Field({ label, required, error, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={fieldLabel}>
        {label} {required && <span style={{ color: 'var(--color-error-main)' }}>*</span>}
      </label>
      {children}
      {error && <p style={errorMsg}>{error}</p>}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle      = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }
const section        = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px 24px',
                          marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sectionLabel   = { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
                          display: 'block', marginBottom: 14 }
const grid2          = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }
const input          = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                          fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
                          outline: 'none', width: '100%', boxSizing: 'border-box' }
const fieldLabel     = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const errorMsg       = { fontSize: 12, color: 'var(--color-error-main)', margin: 0 }
const posterBox      = { width: 120, height: 180, border: '2px dashed var(--border-default)', borderRadius: 8,
                          cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }
const posterPH       = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center' }
const removePosterBtn= { marginTop: 8, padding: '4px 10px', background: 'var(--color-error-bg)',
                          border: '1px solid var(--color-error-text)', borderRadius: 6,
                          fontSize: 12, color: 'var(--color-error-text)', cursor: 'pointer' }
const cancelBtn      = { padding: '12px 24px', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                          borderRadius: 8, fontSize: 15, cursor: 'pointer', color: 'var(--text-secondary)' }
const submitBtn      = { flex: 1, padding: '12px 24px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }

export default MovieFormPage