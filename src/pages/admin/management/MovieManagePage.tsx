/**
 * MovieManagePage.jsx — 영화 상영 관리
 * 특정 영화의 상영 일정(스케줄) 추가/삭제 관리
 * TODO: GET/POST/DELETE /api/admin/schedules 연동
 */
import { useState } from 'react'
import { MOCK_MOVIES, MOCK_SCHEDULES, MOCK_THEATERS } from '../../../api/mockData'

function MovieManagePage() {
  const [selectedMovieId, setSelectedMovieId] = useState(MOCK_MOVIES[0]?.id ?? 1)
  const [schedules, setSchedules]  = useState({ ...MOCK_SCHEDULES })
  const [newDate,   setNewDate]    = useState('')
  const [newTime,   setNewTime]    = useState('10:00')
  const [newTheater,setNewTheater] = useState(MOCK_THEATERS[0]?.id ?? 1)

  const movieSchedules = schedules[selectedMovieId] ?? []
  const selectedMovie  = MOCK_MOVIES.find((m) => m.id === selectedMovieId)
  const theater        = MOCK_THEATERS.find((t) => t.id === Number(newTheater))

  /** 런타임 기반 종료 시간 계산 */
  const calcEndTime = (startTime, runtimeMin) => {
    const [h, m] = startTime.split(':').map(Number)
    const totalMin = h * 60 + m + Number(runtimeMin)
    return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
  }

  const handleAddSchedule = () => {
    if (!newDate || !newTime) { alert('날짜와 시간을 선택해 주세요.'); return }
    if (!newDate || newDate < new Date().toISOString().slice(0, 10)) {
      alert('과거 날짜는 선택할 수 없습니다.'); return
    }
    const endTime = calcEndTime(newTime, selectedMovie?.runtime ?? 120)
    const newSched = {
      scheduleId: Date.now(),
      date: newDate, startTime: newTime, endTime,
      theaterId: Number(newTheater),
      theaterName: theater?.name ?? '-',
      availableSeats: theater?.totalSeats ?? 100,
      totalSeats: theater?.totalSeats ?? 100,
    }
    setSchedules((prev) => ({
      ...prev,
      [selectedMovieId]: [...(prev[selectedMovieId] ?? []), newSched],
    }))
  }

  const handleDelete = (scheduleId) => {
    const ok = window.confirm('이 상영 일정을 삭제하시겠습니까?')
    if (ok) {
      setSchedules((prev) => ({
        ...prev,
        [selectedMovieId]: prev[selectedMovieId].filter((s) => s.scheduleId !== scheduleId),
      }))
    }
  }

  // 날짜별 그룹핑
  const grouped = movieSchedules.reduce((acc, s) => {
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
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {/* 상영 추가 */}
      <div style={card}>
        <p style={sLabel}>상영 일정 추가</p>
        <div style={addRow}>
          <input type="date" value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            style={inputS} />
          <input type="time" value={newTime}
            onChange={(e) => setNewTime(e.target.value)} style={inputS} />
          <select value={newTheater}
            onChange={(e) => setNewTheater(e.target.value)} style={inputS}>
            {MOCK_THEATERS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={handleAddSchedule} style={addBtn}>+ 추가</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          선택 상영관: {theater?.name} — {theater?.totalSeats}석, 기본요금 {theater?.basePrice?.toLocaleString()}원
        </p>
      </div>

      {/* 상영 일정 목록 */}
      <div style={card}>
        <p style={sLabel}>등록된 상영 일정 ({movieSchedules.length}건)</p>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{date}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {items.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                <div key={s.scheduleId} style={scheduleChip}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{s.startTime}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}> ~ {s.endTime}</span>
                    <br/>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.theaterName} · {s.availableSeats}석</span>
                  </div>
                  <button onClick={() => handleDelete(s.scheduleId)} style={delBtn}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p style={{ color: '#b6a999', fontSize: 14 }}>등록된 상영 일정이 없습니다.</p>
        )}
      </div>
    </div>
  )
}

const pageTitle   = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }
const card        = { background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 20px',
                      marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sLabel      = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }
const selectStyle = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                      fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: '100%' }
const addRow      = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
const inputS      = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
                      fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)' }
const addBtn      = { padding: '10px 18px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)',
                      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const scheduleChip= { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8,
                      border: '1px solid var(--border-default)', minWidth: 160 }
const delBtn      = { background: 'none', border: 'none', color: 'var(--color-error-main)', cursor: 'pointer',
                      fontSize: 16, padding: 4, flexShrink: 0 }

export default MovieManagePage
