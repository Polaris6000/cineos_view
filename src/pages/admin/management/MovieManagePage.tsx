/**
 * MovieManagePage.tsx — 영화 상영 관리
 *
 * 개선사항:
 *  1. 상영관 + 날짜 선택 시 해당 상영관의 기존 스케줄 타임라인 표시
 *  2. 마지막 스케줄 종료시간 기준으로 시작시간 자동 입력
 *  3. 영화 런타임 + 상영관 정리시간 = 종료시간 미리보기
 *  4. 스케줄 상태 표시 (정상 / 만료 / 삭제예정)
 *  5. 삭제 → 만료처리 (즉시 제거 X)
 *
 * TODO: GET/POST/DELETE /api/admin/schedules 연동
 */
import { useState, useMemo, useEffect } from 'react'
import { MOCK_MOVIES, MOCK_SCHEDULES, MOCK_THEATERS } from '../../../api/mockData'

/* ── 타입 정의 ────────────────────────────────────── */
interface Schedule {
  scheduleId: number
  date: string
  startTime: string
  endTime: string
  theaterId: number
  theaterName: string
  availableSeats: number
  totalSeats: number
  movieTitle?: string  // 타임라인 표시용 (등록된 스케줄에 영화 제목 포함)
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' // 스케줄 상태
}

/** 오늘 날짜 */
const TODAY = new Date().toISOString().slice(0, 10)

/**
 * 시간 문자열 → 분 변환 (계산용)
 * 예: '14:30' → 870
 */
function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * 분 → 시간 문자열 변환
 * 예: 870 → '14:30'
 */
function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/**
 * 스케줄 상태 계산
 * - 날짜가 오늘 이전이면 '만료'
 * - cancelledIds에 포함되면 '삭제예정'
 * - 그 외 '정상'
 */
function getScheduleStatus(date: string, scheduleId: number, cancelledIds: Set<number>): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' {
  if (cancelledIds.has(scheduleId)) return 'CANCELLED'
  if (date < TODAY) return 'EXPIRED'
  return 'ACTIVE'
}

function MovieManagePage() {
  // 선택된 영화 id
  const [selectedMovieId, setSelectedMovieId] = useState<number>(MOCK_MOVIES[0]?.id ?? 1)

  // 로컬 스케줄 상태 (초기값: MOCK_SCHEDULES)
  const [schedules, setSchedules] = useState<Record<number, Schedule[]>>(
    Object.fromEntries(
      Object.entries(MOCK_SCHEDULES).map(([id, scheds]) => [
        Number(id),
        scheds.map(s => ({ ...s })),
      ])
    )
  )

  // 만료처리된 scheduleId Set (즉시 제거 대신 상태 변경)
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set())

  // 새 스케줄 입력 폼 상태
  const [newDate,    setNewDate]    = useState<string>(TODAY)
  const [newTime,    setNewTime]    = useState<string>('10:00')
  const [newTheater, setNewTheater] = useState<number>(MOCK_THEATERS[0]?.id ?? 1)

  // 선택된 영화/상영관 객체
  const selectedMovie  = MOCK_MOVIES.find((m) => m.id === selectedMovieId)
  const selectedTheater = MOCK_THEATERS.find((t) => t.id === newTheater)

  /**
   * 특정 상영관 + 날짜에 등록된 모든 스케줄 (전체 영화 통합)
   * 타임라인 표시 및 시간 겹침 확인에 사용
   */
  const theaterDaySchedules = useMemo((): (Schedule & { movieTitle: string })[] => {
    return Object.entries(schedules)
      .flatMap(([movieId, scheds]) =>
        scheds
          .filter(s => s.theaterId === newTheater && s.date === newDate)
          .map(s => ({
            ...s,
            movieTitle: MOCK_MOVIES.find(m => m.id === Number(movieId))?.title ?? '알 수 없음',
          }))
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, newTheater, newDate])

  /**
   * 해당 상영관+날짜의 마지막 스케줄 종료시간 (자동입력용)
   * 만료처리된 스케줄은 제외
   */
  const lastEndTime = useMemo((): string | null => {
    const active = theaterDaySchedules.filter(s => !cancelledIds.has(s.scheduleId))
    if (active.length === 0) return null
    return active[active.length - 1].endTime
  }, [theaterDaySchedules, cancelledIds])

  /**
   * 상영관 또는 날짜가 바뀌면 시작시간을 마지막 종료시간으로 자동 입력
   * 없으면 '10:00' 유지
   */
  useEffect(() => {
    if (lastEndTime) {
      setNewTime(lastEndTime)
    } else {
      setNewTime('10:00')
    }
  }, [newTheater, newDate, lastEndTime])

  /**
   * 종료시간 미리보기 계산
   * 종료시간 = 시작시간 + 런타임(min) + 상영관 정리시간(min)
   */
  const previewEndTime = useMemo((): string => {
    const runtime = selectedMovie?.runtime ?? 120
    const cleanup = selectedTheater?.cleanupTime ?? 10
    return minToTime(timeToMin(newTime) + runtime + cleanup)
  }, [newTime, selectedMovie, selectedTheater])

  /** 스케줄 등록 */
  const handleAddSchedule = () => {
    if (!newDate || !newTime) { alert('날짜와 시간을 선택해 주세요.'); return }
    if (newDate < TODAY) { alert('과거 날짜는 선택할 수 없습니다.'); return }

    // 시간 겹침 체크: 새 스케줄의 시작~종료 구간이 기존 스케줄과 겹치는지 확인
    const newStart = timeToMin(newTime)
    const newEnd   = timeToMin(previewEndTime)
    const overlap  = theaterDaySchedules
      .filter(s => !cancelledIds.has(s.scheduleId))
      .find(s => {
        const eStart = timeToMin(s.startTime)
        const eEnd   = timeToMin(s.endTime)
        // 구간 겹침 조건: 새 시작이 기존 종료 전 AND 새 종료가 기존 시작 후
        return newStart < eEnd && newEnd > eStart
      })

    if (overlap) {
      alert(
        `❗ 시간이 겹칩니다!\n\n` +
        `"${overlap.movieTitle}" 스케줄 (${overlap.startTime} ~ ${overlap.endTime})\n` +
        `와(과) 겹쳐서 등록할 수 없습니다.`
      )
      return
    }

    const newSched: Schedule = {
      scheduleId:     Date.now(),
      date:           newDate,
      startTime:      newTime,
      endTime:        previewEndTime,
      theaterId:      newTheater,
      theaterName:    selectedTheater?.name ?? '-',
      availableSeats: selectedTheater?.totalSeats ?? 100,
      totalSeats:     selectedTheater?.totalSeats ?? 100,
    }

    setSchedules((prev) => ({
      ...prev,
      [selectedMovieId]: [...(prev[selectedMovieId] ?? []), newSched],
    }))
  }

  /**
   * 스케줄 만료처리 — 즉시 삭제하지 않고 cancelledIds에 추가
   * 실제로는 서버에서 status를 CANCELLED로 변경
   */
  const handleExpire = (scheduleId: number) => {
    const ok = window.confirm('이 상영 일정을 만료처리하시겠습니까?\n(즉시 삭제되지 않고 만료 상태로 변경됩니다)')
    if (ok) {
      setCancelledIds((prev) => new Set(prev).add(scheduleId))
      // TODO: DELETE /api/admin/schedules/:scheduleId (서버에서 만료처리)
    }
  }

  // 선택된 영화의 전체 스케줄 (날짜별 그룹핑 전)
  const movieSchedules = schedules[selectedMovieId] ?? []

  // 날짜별 그룹핑
  const grouped = movieSchedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  return (
    <div>
      <h2 style={pageTitle}>영화 상영 관리</h2>

      {/* 영화 선택 */}
      <div style={card}>
        <label style={sLabel}>영화 선택</label>
        <select
          value={selectedMovieId}
          onChange={(e) => setSelectedMovieId(Number(e.target.value))}
          style={selectStyle}
        >
          {MOCK_MOVIES.map((m) => (
            <option key={m.id} value={m.id}>{m.title} ({m.runtime}분)</option>
          ))}
        </select>
        {selectedMovie && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            감독: {selectedMovie.director} · 런타임: {selectedMovie.runtime}분 · 등급: {selectedMovie.rating === 'ALL' ? '전체관람가' : `${selectedMovie.rating}세 이상`}
          </p>
        )}
      </div>

      {/* 상영 일정 추가 폼 */}
      <div style={card}>
        <p style={sLabel}>상영 일정 추가</p>

        <div style={addRow}>
          {/* 날짜 선택 */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>날짜</label>
            <input
              type="date"
              value={newDate}
              min={TODAY}
              onChange={(e) => setNewDate(e.target.value)}
              style={inputS}
            />
          </div>

          {/* 상영관 선택 */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>상영관</label>
            <select
              value={newTheater}
              onChange={(e) => setNewTheater(Number(e.target.value))}
              style={inputS}
            >
              {MOCK_THEATERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.totalSeats}석, 정리 {t.cleanupTime}분)
                </option>
              ))}
            </select>
          </div>

          {/* 시작시간 (마지막 스케줄 종료시간 자동입력) */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>
              시작시간
              {lastEndTime && (
                <span style={{ color: 'var(--color-brand-default)', fontSize: 10, marginLeft: 4 }}>
                  (자동입력)
                </span>
              )}
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              style={inputS}
            />
          </div>

          <button onClick={handleAddSchedule} style={addBtn}>+ 등록</button>
        </div>

        {/* 종료시간 미리보기: 런타임 + 정리시간 합산 */}
        <div style={endTimePreview}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>종료 예상:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
            {newTime} + {selectedMovie?.runtime ?? 0}분(런타임) + {selectedTheater?.cleanupTime ?? 0}분(정리) ={' '}
            <span style={{ color: 'var(--color-brand-default)' }}>{previewEndTime}</span>
          </span>
        </div>
      </div>

      {/* 선택된 상영관+날짜의 기존 스케줄 타임라인 */}
      <div style={card}>
        <p style={sLabel}>
          {selectedTheater?.name ?? '-'} · {newDate} 기존 스케줄
          {lastEndTime && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
              (마지막 종료: {lastEndTime})
            </span>
          )}
        </p>
        {theaterDaySchedules.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>이 날짜에 등록된 스케줄이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {theaterDaySchedules.map((s) => {
              const isCancelled = cancelledIds.has(s.scheduleId)
              return (
                <div
                  key={s.scheduleId}
                  style={{
                    ...timelineChip,
                    opacity: isCancelled ? 0.4 : 1,
                    background: isCancelled ? 'var(--bg-base)' : 'var(--color-info-bg)',
                    borderColor: isCancelled ? 'var(--border-default)' : 'var(--color-info-text)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-info-dark)' }}>
                    {s.startTime} ~ {s.endTime}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block' }}>
                    {s.movieTitle}
                  </span>
                  {isCancelled && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>만료처리됨</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 선택된 영화의 전체 등록 스케줄 목록 */}
      <div style={card}>
        <p style={sLabel}>
          "{selectedMovie?.title}" 등록된 상영 일정 ({movieSchedules.length}건)
        </p>
        {Object.keys(grouped).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>등록된 상영 일정이 없습니다.</p>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => {
              const dateLabel = date < TODAY ? (
                <span>
                  {date} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(과거)</span>
                </span>
              ) : date === TODAY ? (
                <span>
                  {date} <span style={{ fontSize: 11, color: 'var(--color-success-main)' }}>(오늘)</span>
                </span>
              ) : date

              return (
                <div key={date} style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, fontSize: 14 }}>
                    {dateLabel}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {items
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((s) => {
                        const sStatus = getScheduleStatus(date, s.scheduleId, cancelledIds)
                        const statusColors = {
                          ACTIVE:    { bg: 'var(--bg-base)',            border: 'var(--border-default)',      label: '정상',    labelColor: 'var(--color-success-main)' },
                          EXPIRED:   { bg: 'var(--bg-base)',            border: 'var(--border-subtle)',       label: '만료',    labelColor: 'var(--text-muted)' },
                          CANCELLED: { bg: 'var(--color-error-bg)',     border: 'var(--color-error-text)',    label: '만료처리', labelColor: 'var(--color-error-text)' },
                        }
                        const sc = statusColors[sStatus]
                        return (
                          <div key={s.scheduleId} style={{ ...scheduleChip, background: sc.bg, borderColor: sc.border, opacity: sStatus === 'EXPIRED' ? 0.55 : 1 }}>
                            <div>
                              {/* 시작~종료 시간 */}
                              <span style={{ fontWeight: 700 }}>{s.startTime}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}> ~ {s.endTime}</span>
                              <br />
                              {/* 상영관 · 잔여석 */}
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {s.theaterName} · {s.availableSeats}/{s.totalSeats}석
                              </span>
                              <br />
                              {/* 스케줄 상태 배지 */}
                              <span style={{ fontSize: 11, fontWeight: 600, color: sc.labelColor }}>
                                {sc.label}
                              </span>
                            </div>
                            {/* ACTIVE 상태만 만료처리 버튼 표시 (EXPIRED는 이미 만료, CANCELLED는 처리됨) */}
                            {sStatus === 'ACTIVE' && (
                              <button
                                onClick={() => handleExpire(s.scheduleId)}
                                style={expireBtn}
                                title="만료처리"
                              >
                                만료처리
                              </button>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })
        )}
      </div>
    </div>
  )
}

/* ── 스타일 ──────────────────────────────────────── */
const pageTitle    = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const card         = { background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                       marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel       = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }
const selectStyle  = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                       fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: '100%' }
const addRow       = { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end' }
const fieldGroup   = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
const fieldLabel   = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }
const inputS       = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                       fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)' }
const addBtn       = { padding: '10px 18px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                       border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }
const endTimePreview = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 12px',
                         background: 'var(--bg-base)', borderRadius: 8, flexWrap: 'wrap' as const }
const timelineChip = { padding: '8px 12px', borderRadius: 8, border: '1px solid',
                       minWidth: 120, transition: 'opacity 0.2s' }
const scheduleChip = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                       padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8,
                       border: '1px solid', borderColor: 'var(--border-default)', minWidth: 160,
                       transition: 'opacity 0.2s' }
const expireBtn    = { background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
                       color: 'var(--color-error-text)', borderRadius: 6, fontSize: 11, fontWeight: 600,
                       padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }

export default MovieManagePage
