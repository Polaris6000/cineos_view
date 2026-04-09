/**
 * MovieManagePage.tsx — 영화 상영 관리
 *
 * 기능:
 *  1. 상영관 + 날짜 선택 시 해당 상영관의 기존 스케줄 타임라인 표시
 *  2. 마지막 스케줄 종료시간 기준으로 시작시간 자동 입력
 *  3. 영화 런타임 + 상영관 정리시간 = 종료시간 미리보기
 *  4. 스케줄 상태 표시 (정상 / 만료 / 만료처리됨)
 *  5. 만료처리 → 되돌리기 (undo 지원)
 *  6. 체크박스로 다중 선택 후 일괄 만료처리 / 일괄 되돌리기
 *
 * TODO: GET/POST/DELETE /api/admin/schedules 연동
 */
import { useState, useMemo, useEffect } from 'react'
import { MOCK_THEATERS } from '../../../api/mockData'
import axios from "axios";

/* ── 타입 정의 ── */
interface Schedule {
  id: number // 스케줄 PK
  no: number // 상영관 FK
  movieId: number // 영화 FK
  startTime: string // 시작일
  endTime: string // 종료일
  activation?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' // 만료여부

  date: string // 날짜 변수 해더 등등 (프론트)
  availableSeats: number // 활성화된 좌석 (프론트)
  totalSeats: number // 총 좌석 (프론트)
  movieTitle?: string   // 타임라인 표시용
}

interface Movie {
  movieId: number // 영화 PK
  actors: string // 배우
  createAt: string // 생성일
  director: string // 감독
  endAt: string // 상영 종료일
  genre: string // 장르
  rating:  'ALL' | '12' | '15' | '19' // 관람등급
  runtime: number // 영화 시간 (분)
  startAt: string // 상영 시작일
  title: string // 제목
}

/** 오늘 날짜 문자열 (YYYY-MM-DD) */
const TODAY = new Date().toISOString().slice(0, 10)

/** 'HH:MM' → 분 변환 */
function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** 분 → 'HH:MM' 변환 */
function minToTime(min: number): string {
  // 1440분(24시간)으로 나눈 나머지를 사용해 00:00~23:59 사이로 고정
  const totalMin = min % 1440;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 스케줄 상태 계산
 *  - cancelledIds 포함 → CANCELLED (만료처리됨)
 *  - 날짜가 오늘 이전 → EXPIRED (자동 만료)
 *  - 그 외 → ACTIVE
 */
function getScheduleStatus(
  date: string,
  scheduleId: number,
  cancelledIds: Set<number>,
): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' {
  if (cancelledIds.has(scheduleId)) return 'CANCELLED'
  if (date < TODAY) return 'EXPIRED'
  return 'ACTIVE'
}

function MovieManagePage() {
  // ── 선택된 영화 id ──
  const [selectedMovieId, setSelectedMovieId] = useState<number>(1)
  const [movies, setMovies] = useState<Movie[]>([])

  useEffect(() => {
    axios.get('http://localhost:8080/api/movie/readAll')
        .then(res => {
          console.log(res.data)
          const data: Movie[] = res.data;
          setMovies(data)

          // 첫 영화 자동 선택
          if (data.length > 0) {
            setSelectedMovieId(data[0].movieId)
          }
        })
  }, [])

  // ── 로컬 스케줄 상태 ──
  // const [schedules, setSchedules] = useState<Record<number, Schedule[]>>(
  //   Object.fromEntries(
  //     Object.entries(MOCK_SCHEDULES).map(([id, scheds]) => [
  //       Number(id),
  //       scheds.map((s) => ({ ...s })),
  //     ]),
  //   ),
  // )

  // 연결
  const [schedules, setSchedules] = useState<Record<number, Schedule[]>>({})

  useEffect(() => {
    axios.get('/api/admin/schedule/list')
        .then(res => {
          const data = res.data

          const mapped: Record<number, Schedule[]> = {}

          data.forEach((s: any) => {
            const newSched: Schedule = {
              id: s.id,
              date: s.startAt.slice(0, 10),
              startTime: s.startAt, // "2026-04-10T10:00:00"
              endTime: s.endAt,     // "2026-04-10T12:00:00"
              no: s.no,
              movieId: s.movieId,
              activation: s.activation ? 'ACTIVE' : 'CANCELLED',

              availableSeats: s.activation ? 100 : 0,
              totalSeats: 100
            }

            if (!mapped[s.movieId]) {
              mapped[s.movieId] = []
            }
            mapped[s.movieId].push(newSched)
          })

          setSchedules(mapped)
        })
  }, [])

  // ── 만료처리된 scheduleId Set (undo 지원) ──
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set())

  // ── 체크된 scheduleId Set (다중 선택) ──
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())

  // ── 새 스케줄 입력 ──
  const [newDate,    setNewDate]    = useState<string>(TODAY)
  const [newTime,    setNewTime]    = useState<string>('10:00')
  const [newTheater, setNewTheater] = useState<number>(MOCK_THEATERS[0]?.id ?? 1)

  const selectedMovie = movies.find((m) => m.movieId === selectedMovieId)
  const selectedTheater = MOCK_THEATERS.find((t) => t.id === newTheater)

  /** 선택된 상영관+날짜의 통합 스케줄 (타임라인용) */
  const theaterDaySchedules = useMemo((): (Schedule & { movieTitle: string })[] => {
    return Object.entries(schedules)
        .flatMap(([movieIdStr, scheds]) => {
          const numericMovieId = Number(movieIdStr);

          const targetMovie = movies.find((m) => m.movieId === numericMovieId);

          return scheds
              .filter((s) => s.no === newTheater && s.date === newDate)
              .map((s) => ({
                ...s,
                movieTitle: targetMovie?.title ?? '알 수 없음',
              }));
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, movies, newTheater, newDate]); // 의존성 배열에 'movies' 추가!

  /** 마지막 스케줄 종료시간 (자동입력용) */
  const lastEndTime = useMemo((): string | null => {
    const active = theaterDaySchedules.filter((s) => !cancelledIds.has(s.id))
    return active.length > 0 ? active[active.length - 1].endTime : null
  }, [theaterDaySchedules, cancelledIds])

  /** 상영관/날짜 변경 시 시작시간 자동갱신 */
  useEffect(() => {
    if (lastEndTime) {
      // 만약 lastEndTime이 "2026-04-10T12:00:00" 형태라면 11번째 글자부터 5글자 추출
      const formattedTime = lastEndTime.includes('T')
          ? lastEndTime.slice(11, 16)
          : lastEndTime;
      setNewTime(formattedTime);
    } else {
      setNewTime('10:00');
    }
  }, [newTheater, newDate, lastEndTime]);

  /** 종료시간 미리보기 */
  const previewEndTime = useMemo((): string => {
    const runtime = selectedMovie?.runtime ?? 120
    const cleanup = selectedTheater?.cleanupTime ?? 10
    return minToTime(timeToMin(newTime) + runtime + cleanup)
  }, [newTime, selectedMovie, selectedTheater])

  /* ── 스케줄 등록 ── */
  const handleAddSchedule = async () => {
    if (!newDate || !newTime) { alert('날짜와 시간을 선택해 주세요.'); return }
    if (newDate < TODAY) { alert('과거 날짜는 선택할 수 없습니다.'); return }

    const newStart = timeToMin(newTime)
    const newEnd   = timeToMin(previewEndTime)
    const startMin = timeToMin(newTime);
    const runtime = selectedMovie?.runtime ?? 120;
    const cleanup = selectedTheater?.cleanupTime ?? 10;
    const totalEndMin = startMin + runtime + cleanup;

    let endDate = newDate;
    if (totalEndMin >= 1440) {
      const d = new Date(newDate);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString().slice(0, 10);
    }

    const overlap  = theaterDaySchedules
      .filter((s) => !cancelledIds.has(s.id))
      .find((s) => newStart < timeToMin(s.endTime.slice(11, 16)) && newEnd > timeToMin(s.startTime.slice(11, 16)))

    if (overlap) {
      alert(
        `❗ 시간이 겹칩니다!\n\n` +
        `"${overlap.movieTitle}" (${overlap.startTime.slice(11, 16)} ~ ${overlap.endTime.slice(11, 16)})\n` +
        `와(과) 겹쳐서 등록할 수 없습니다.`,
      )
      return
    }

    try {
      const payload = {
        movieId: selectedMovieId,
        no: newTheater,
        startAt: `${newDate}T${newTime}:00`,
        endAt: `${endDate}T${previewEndTime}:00`,
      };

      const res = await axios.post('/api/admin/schedule', payload)
      console.log('스케줄 로그 ',res.data)

      if ((res.status === 200 || res.status === 201) && res.data?.id) {
        const s = res.data

        const savedSched: Schedule = {
          id: s.id,
          no: s.no,
          movieId: s.movieId,
          startTime: s.startAt, // "2026-04-10T10:00:00" 전체 저장
          endTime: s.endAt,     // "2026-04-10T12:10:00" 전체 저장
          date: s.startAt.slice(0, 10),
          movieTitle: movies.find(m => m.movieId === selectedMovieId)?.title || '제목 없음',


          availableSeats: 100, // TODO 이건 정의 해야할듯
          totalSeats: 100, // TODO 이것 또한
          // activation은 선택적(optional)이므로 필요 시 서버 데이터 매핑
          activation: s.activation ? 'ACTIVE' : 'CANCELLED'
        };

        setSchedules((prev) => ({
          ...prev,
          [selectedMovieId]: [...(prev[selectedMovieId] ?? []), savedSched],
        }));
        console.log('스케줄 등록완료')
      }
    } catch (e) {
      console.error('스케줄 등록 실패 : ', e)
      alert('스케줄 등록 중 오류 발생')
    }

  }

  // TODO 이미 지나간 스케줄은 변경이 안되도록 해놓음
  /* ── 상태 업데이트 공통 함수 ── */
  const updateActivationStatus = async (targetIds: number[], nextStatus: boolean) => {
    try {
      const payload = {
        ids: targetIds,
        activation: nextStatus // 👈 true면 활성화(복구), false면 비활성화(만료)
      };

      // 서버의 @PatchMapping("/activation") 호출
      await axios.patch('/api/admin/schedule/activation', payload);

      // UI 상태(cancelledIds) 동기화
      setCancelledIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach(id => {
          if (nextStatus) next.delete(id); // 활성화 시 만료 목록에서 제거
          else next.add(id);            // 비활성화 시 만료 목록에 추가
        });
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("상태 변경에 실패했습니다.");
    }
  };

  /* ── 버튼 연결 ── */
  const handleExpire = (id: number) => updateActivationStatus([id], false); // 만료시키기 (false 전달)
  const handleUndo   = (id: number) => updateActivationStatus([id], true);  // 되돌리기 (true 전달)

  // /* ── 단건 만료처리 ── */
  // const handleExpire = async (scheduleId: number) => {
  //   if (window.confirm('이 상영 일정을 만료처리하시겠습니까?')) {
  //     await updateActivationStatus([scheduleId], false);
  //   }
  // };
  //
  // /* ── 단건 되돌리기 ── */
  // const handleUndo = async (scheduleId: number) => {
  //   await updateActivationStatus([scheduleId], true);
  // };

  // /* ── 일괄 만료처리 (체크박스 선택된 것들) ── */
  // const handleBulkExpire = async () => {
  //   const targets = [...checkedIds].filter((id) => {
  //     const sched = movieSchedules.find((s) => s.id === id);
  //     return sched && getScheduleStatus(sched.date, id, cancelledIds) === 'ACTIVE';
  //   });
  //
  //   if (targets.length === 0) return;
  //   if (window.confirm(`선택된 ${targets.length}건을 일괄 만료처리하시겠습니까?`)) {
  //     const success = await updateActivationStatus(targets, false);
  //     if (success) setCheckedIds(new Set()); // 성공 시 체크 해제
  //   }
  // };
  //
  // /* ── 일괄 되돌리기 ── */
  // const handleBulkUndo = async () => {
  //   const targets = [...checkedIds].filter((id) => cancelledIds.has(id));
  //
  //   if (targets.length === 0) return;
  //   if (window.confirm(`선택된 ${targets.length}건을 일괄 되돌리시겠습니까?`)) {
  //     const success = await updateActivationStatus(targets, true);
  //     if (success) setCheckedIds(new Set());
  //   }
  // };

  // ── 선택된 영화의 전체 스케줄 & 날짜별 그룹핑 ──
  const movieSchedules = schedules[selectedMovieId] ?? []
  const grouped = movieSchedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    ;(acc[s.date] ??= []).push(s)
    return acc
  }, {})

  // 체크된 항목 중 ACTIVE / CANCELLED 개수 (일괄 버튼 활성화 판단)
  const checkedActiveCount = [...checkedIds].filter((id) => {
    const s = movieSchedules.find((x) => x.id === id)
    return s && getScheduleStatus(s.date, id, cancelledIds) === 'ACTIVE'
  }).length
  const checkedCancelledCount = [...checkedIds].filter((id) =>
    cancelledIds.has(id),
  ).length

  return (
    <div>
      <h2 style={pageTitle}>영화 상영 관리</h2>

      {/* ── 영화 선택 ── */}
      <div style={card}>
        <label style={sLabel}>영화 선택</label>
        <select
          value={selectedMovieId}
          onChange={(e) => {
            setSelectedMovieId(Number(e.target.value))
            setCheckedIds(new Set()) // 영화 전환 시 체크 초기화
          }}
          style={selectStyle}
        >
          {movies.map((m) => (
              <option key={m.movieId} value={m.movieId}>
                {m.title} ({m.runtime}분)
              </option>
          ))}
        </select>
        {selectedMovie && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            감독: {selectedMovie.director} · 런타임: {selectedMovie.runtime}분 · 등급:{' '}
            {selectedMovie.rating === 'ALL' ? '전체관람가' : `${selectedMovie.rating}세 이상`}
          </p>
        )}
      </div>

      {/* ── 상영 일정 추가 폼 ── */}
      <div style={card}>
        <p style={sLabel}>상영 일정 추가</p>
        <div style={addRow}>
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
        <div style={endTimePreview}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>종료 예상:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
            {newTime} + {selectedMovie?.runtime ?? 0}분(런타임) + {selectedTheater?.cleanupTime ?? 0}분(정리) ={' '}
            <span style={{ color: 'var(--color-brand-default)' }}>{previewEndTime}</span>
          </span>
        </div>
      </div>

      {/* ── 타임라인 ── */}
      <div style={card}>
        <p style={sLabel}>
          {selectedTheater?.name ?? '-'} · {newDate} 기존 스케줄
          {lastEndTime && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
              (마지막 종료: {lastEndTime.slice(11, 16)})
            </span>
          )}
        </p>
        {theaterDaySchedules.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>이 날짜에 등록된 스케줄이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {theaterDaySchedules.map((s) => {
              const isCancelled = cancelledIds.has(s.id)
              return (
                <div
                  key={s.id}
                  style={{
                    ...timelineChip,
                    opacity: isCancelled ? 0.4 : 1,
                    background: isCancelled ? 'var(--bg-base)' : 'var(--color-info-bg)',
                    borderColor: isCancelled ? 'var(--border-default)' : 'var(--color-info-text)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-info-dark)' }}>
                    {s.startTime.slice(11, 16)} ~ {s.endTime.slice(11, 16)}
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

      {/* ── 전체 등록 스케줄 목록 ── */}
      <div style={card}>
        {/* 헤더 + 일괄 액션 바 */}
        <div style={listHeader}>
          <p style={{ ...sLabel, margin: 0 }}>
            "{selectedMovie?.title}" 등록된 상영 일정 ({movieSchedules.length}건)
          </p>
          {/* 체크된 항목이 있을 때만 일괄 액션 버튼 노출 */}
          {checkedIds.size > 0 && (
            <div style={bulkActionBar}>
              <span style={bulkCount}>{checkedIds.size}건 선택됨</span>
              {checkedActiveCount > 0 && (
                <button onClick={handleBulkExpire} style={bulkExpireBtn}>
                  일괄 만료처리 ({checkedActiveCount})
                </button>
              )}
              {checkedCancelledCount > 0 && (
                <button onClick={handleBulkUndo} style={bulkUndoBtn}>
                  일괄 되돌리기 ({checkedCancelledCount})
                </button>
              )}
              <button onClick={() => setCheckedIds(new Set())} style={clearCheckBtn}>
                선택 해제
              </button>
            </div>
          )}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>등록된 상영 일정이 없습니다.</p>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => {
              const sortedItems = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime))
              const groupIds = sortedItems.map((s) => s.id)
              const allGroupChecked = groupIds.every((id) => checkedIds.has(id))

              const dateLabel =
                date < TODAY ? (
                  <span>
                    {date} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(과거)</span>
                  </span>
                ) : date === TODAY ? (
                  <span>
                    {date} <span style={{ fontSize: 11, color: 'var(--color-success-main)' }}>(오늘)</span>
                  </span>
                ) : (
                  date
                )

              return (
                <div key={date} style={{ marginBottom: 16 }}>
                  {/* 날짜 헤더 + 그룹 전체 선택 체크박스 */}
                  <div style={groupHeader}>
                    <label style={checkLabel}>
                      <input
                        type="checkbox"
                        checked={allGroupChecked}
                        onChange={() => toggleGroupCheck(groupIds, allGroupChecked)}
                        style={checkboxStyle}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                        {dateLabel}
                      </span>
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {sortedItems.length}건
                    </span>
                  </div>

                  {/* 스케줄 칩 목록 */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
                    {sortedItems.map((s) => {
                      const sStatus = getScheduleStatus(date, s.id, cancelledIds)
                      const isChecked = checkedIds.has(s.id)

                      // 상태별 스타일
                      const sc = {
                        ACTIVE:    { bg: 'var(--bg-base)',        border: 'var(--border-default)',   label: '정상',     labelColor: 'var(--color-success-main)' },
                        EXPIRED:   { bg: 'var(--bg-base)',        border: 'var(--border-subtle)',    label: '만료',     labelColor: 'var(--text-muted)' },
                        CANCELLED: { bg: 'var(--color-error-bg)', border: 'var(--color-error-text)', label: '만료처리됨', labelColor: 'var(--color-error-text)' },
                      }[sStatus]

                      return (
                        <div
                          key={s.id}
                          style={{
                            ...scheduleChip,
                            background: sc.bg,
                            borderColor: isChecked ? 'var(--color-brand-default)' : sc.border,
                            outline: isChecked ? '2px solid var(--color-brand-default)' : 'none',
                            outlineOffset: -1,
                            opacity: sStatus === 'EXPIRED' ? 0.55 : 1,
                          }}
                        >
                          {/* 체크박스 */}
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(s.id)}
                            style={{ ...checkboxStyle, flexShrink: 0 }}
                            disabled={sStatus === 'EXPIRED'} // 자동만료된 과거 항목은 선택 불가
                          />

                          {/* 상세 정보 */}
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>
                              {s.startTime.includes('T') ? s.startTime.slice(11, 16) : s.startTime} ~
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                               {s.endTime.includes('T') ? s.endTime.slice(11, 16) : s.endTime}
                            </span>
                            <br />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {s.no}관 · {s.availableSeats}/{s.totalSeats}석
                            </span>
                            <br />
                            <span style={{ fontSize: 11, fontWeight: 600, color: sc.labelColor }}>
                              {sc.label}
                            </span>
                          </div>

                          {/* 단건 액션 버튼 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* ACTIVE → 만료처리 버튼 */}
                            {sStatus === 'ACTIVE' && (
                              <button
                                onClick={() => handleExpire(s.id)}
                                style={expireBtn}
                                title="만료처리"
                              >
                                만료처리
                              </button>
                            )}
                            {/* CANCELLED → 되돌리기 버튼 (undo) */}
                            {sStatus === 'CANCELLED' && (
                              <button
                                onClick={() => handleUndo(s.id)}
                                style={undoBtn}
                                title="만료처리 되돌리기"
                              >
                                되돌리기
                              </button>
                            )}
                          </div>
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

/* ── 스타일 ── */
const pageTitle      = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const card           = { background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                         marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel         = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }
const selectStyle    = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                         fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: '100%' }
const addRow         = { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end' }
const fieldGroup     = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
const fieldLabel     = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }
const inputS         = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                         fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)' }
const addBtn         = { padding: '10px 18px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                         border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                         alignSelf: 'flex-end' as const }
const endTimePreview = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 12px',
                         background: 'var(--bg-base)', borderRadius: 8, flexWrap: 'wrap' as const }
const timelineChip   = { padding: '8px 12px', borderRadius: 8, border: '1px solid', minWidth: 120, transition: 'opacity 0.2s' }

// 스케줄 목록 헤더 (제목 + 일괄 액션 바 한 줄)
const listHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  flexWrap: 'wrap', gap: 8, marginBottom: 12,
}
const bulkActionBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
}
const bulkCount      = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const bulkExpireBtn: React.CSSProperties = {
  padding: '6px 12px', background: 'var(--color-error-bg)',
  border: '1px solid var(--color-error-text)', color: 'var(--color-error-text)',
  borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const bulkUndoBtn: React.CSSProperties = {
  padding: '6px 12px', background: 'var(--color-info-bg)',
  border: '1px solid var(--color-info-text)', color: 'var(--color-info-dark)',
  borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const clearCheckBtn: React.CSSProperties = {
  padding: '6px 10px', background: 'transparent',
  border: '1px solid var(--border-default)', color: 'var(--text-muted)',
  borderRadius: 6, fontSize: 12, cursor: 'pointer',
}

// 날짜 그룹 헤더 (전체 선택 체크박스 + 날짜)
const groupHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 8,
}
const checkLabel: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
}
const checkboxStyle: React.CSSProperties = {
  width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-brand-default)',
}

const scheduleChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 8,
  border: '1px solid', minWidth: 170, transition: 'outline 0.1s',
}
const expireBtn: React.CSSProperties = {
  background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
  color: 'var(--color-error-text)', borderRadius: 6, fontSize: 11, fontWeight: 600,
  padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
}
const undoBtn: React.CSSProperties = {
  background: 'var(--color-info-bg)', border: '1px solid var(--color-info-text)',
  color: 'var(--color-info-dark)', borderRadius: 6, fontSize: 11, fontWeight: 600,
  padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
}

export default MovieManagePage
