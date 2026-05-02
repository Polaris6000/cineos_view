/**
 * SeatListPage.tsx — 좌석 현황 (관리자)
 *
 * 기능:
 *  1. 상영관 선택 — THEATER_CONFIG 기반 (1~4관)
 *  2. 스케줄 선택 — GET /api/admin/schedule/list 전체 조회 후 선택 상영관으로 필터
 *  3. 실시간 좌석 현황 — useWebSocket read-only (sendToggle 미사용)
 *     - reserved (DB 예약확정) → 매진
 *     - occupied (임시점유)    → 점유 중
 *     - empty                 → 빈자리
 *  4. 좌석 배치도 — SeatPage(고객)와 동일 레이아웃 (통로, 행 라벨 포함)
 *
 * 데이터 흐름:
 *  1. THEATER_CONFIG → 상영관 드롭다운 (1/2/3/4관)
 *  2. GET /api/admin/schedule/list → 전체 스케줄 → 선택 관(no) 필터 → 스케줄 드롭다운
 *  3. 스케줄 선택 → useWebSocket(scheduleId) 연결
 *     - REST GET /api/reservation/seatCount/schedule/{id} → reserved Set
 *     - WS UPDATE_OCCUPANCY → occupied Map (관리자는 RESERVE 안 하므로 전부 'other')
 *  4. generateSeats(theaterNo) → seatUtils 좌석 배치 (SeatPage와 동일 로직)
 *
 * !!! 관리자는 좌석 클릭 불가 (read-only 뷰어)
 */
import {useEffect, useMemo, useState} from 'react'
import {Loader2, Wifi, WifiOff} from 'lucide-react'
import apiClient, {type MovieDTO, type ScheduleDTO} from '../../../api/apiClient'
import {useWebSocket} from '../../../hooks/useWebSocket'
import {generateSeats, type SeatItem, splitRowByAisle} from '../../../utils/seatUtils'
import {THEATER_CONFIG} from '../../../config/theaterConfig'

/* ── 상수 ────────────────────────────────────────────────────── */

/** 좌석 타입 → 표시 레이블 */
const SEAT_TYPE_LABEL: Record<SeatItem['seatType'], string> = {
    NORMAL: '일반',
    RECLINER: '리클라이너',
}

/**
 * 좌석 상태 표시 색상 — SeatPage(고객)의 getSeatStyle과 동일한 색상 사용
 * tokens.css의 시맨틱 변수를 통해 관리
 */
const STATUS_COLOR = {
    sold_out:      {bg: 'var(--color-seat-sold-out)',       border: 'transparent',                          label: '매진'},
    occupied:      {bg: 'var(--color-seat-occupied-bg)',    border: 'var(--color-seat-occupied-border)',    label: '점유 중'},
    empty_normal:  {bg: 'var(--color-seat-empty)',          border: 'var(--color-seat-empty-border)',       label: '일반 빈자리'},
    empty_recliner:{bg: 'var(--color-seat-recliner-bg)',   border: 'var(--color-seat-recliner-border)',    label: '리클라이너 빈자리'},
}

/* ── 유틸: 스케줄 드롭다운 레이블 포맷 ──────────────────────── */
/**
 * 스케줄 드롭다운 옵션 텍스트 생성
 * '영화제목 · 4/19(토) 14:30' 형식으로 표시
 *
 * @param schedule      - ScheduleDTO
 * @param movieTitleMap - movieId → 영화 제목 매핑 (API 조회 후 전달)
 */
function formatScheduleLabel(schedule: ScheduleDTO, movieTitleMap: Record<number, string>): string {
    const d = new Date(schedule.startAt)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const month = d.getMonth() + 1
    const day = d.getDate()
    const dow = days[d.getDay()]
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const title = movieTitleMap[schedule.movieId] ?? `영화 #${schedule.movieId}`
    return `${title} · ${month}/${day}(${dow}) ${hh}:${mm}${!schedule.activation ? ' [비활성]' : ''}`
}

/* ── 컴포넌트 ───────────────────────────────────────────────── */

function SeatListPage() {

    /* ── 상영관 선택 ── */
    // THEATER_CONFIG 키(1~4)를 상영관 번호로 사용. 정적 상수이므로 API 불필요.
    const theaterNos = Object.keys(THEATER_CONFIG).map(Number).sort((a, b) => a - b)
    const [selectedTheaterNo, setSelectedTheaterNo] = useState<number>(theaterNos[0])

    /* ── 영화 제목 맵 ── */
    // movieId → 영화 제목 매핑. 스케줄 드롭다운 레이블에 #1 대신 제목 표시용.
    const [movieTitleMap, setMovieTitleMap] = useState<Record<number, string>>({})

    /* ── 스케줄 목록 ── */
    // 전체 스케줄을 한 번 조회 후 클라이언트에서 상영관 번호로 필터링
    const [allSchedules, setAllSchedules] = useState<ScheduleDTO[]>([])
    const [schedulesLoading, setSchedulesLoading] = useState(true)
    const [schedulesError, setSchedulesError] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setSchedulesLoading(true)
            setSchedulesError('')
            try {
                // 영화 목록과 스케줄 목록을 병렬 조회
                const [movieRes, scheduleRes] = await Promise.all([
                    apiClient.get<MovieDTO[]>('/admin/movie/readAll'),
                    apiClient.get<ScheduleDTO[]>('/admin/schedule/list'),
                ])

                // movieId → title 맵 구성
                const titleMap: Record<number, string> = {}
                for (const movie of movieRes.data) {
                    titleMap[movie.movieId] = movie.title
                }
                setMovieTitleMap(titleMap)

                // startAt 내림차순 정렬 (최신 스케줄이 위에)
                const sorted = [...scheduleRes.data].sort(
                    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
                )
                setAllSchedules(sorted)
            } catch (e) {
                console.error('[SeatListPage] 데이터 조회 실패', e)
                setSchedulesError('스케줄 정보를 불러오지 못했습니다.')
            } finally {
                setSchedulesLoading(false)
            }
        }
        void fetchData()
    }, [])

    /* ── 선택 상영관의 스케줄 필터 ── */
    // allSchedules에서 선택된 상영관 번호(no)와 일치하는 것만 추출
    const filteredSchedules = useMemo(
        () => allSchedules.filter((s) => s.no === selectedTheaterNo),
        [allSchedules, selectedTheaterNo],
    )

    /* ── 선택된 스케줄 ID ── */
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)

    // 상영관이 바뀌면 첫 번째 스케줄로 자동 선택
    useEffect(() => {
        setSelectedScheduleId(filteredSchedules.length > 0 ? filteredSchedules[0].id : null)
    }, [filteredSchedules])

    /* ── WebSocket 연결 (read-only) ── */
    /**
     * useWebSocket(scheduleId): selectedScheduleId가 바뀔 때마다 재연결
     *
     * 관리자는 RESERVE/RELEASE를 보내지 않으므로:
     *  - mySeatsRef가 항상 비어있음 → occupied Map의 모든 좌석이 'other'로 분류됨
     *  - 즉, 임시점유 좌석을 모두 "점유 중"으로 올바르게 표시
     *
     * sendToggle은 사용하지 않음 (read-only)
     */
    const {wsState} = useWebSocket(selectedScheduleId)

    /* ── 좌석 배치 ── */
    // seatUtils.generateSeats → SeatPage(고객)와 완전히 동일한 배치 생성
    const seats = useMemo(() => generateSeats(selectedTheaterNo), [selectedTheaterNo])
    const rows = useMemo(() => [...new Set(seats.map((s) => s.row))], [seats])

    /* ── 통로 sideCount ── */
    // 첫 번째 행 열 수 기준 (모든 행 동일)
    const colNumbers = useMemo(() => {
        if (rows.length === 0) return []
        return seats
            .filter((s) => s.row === rows[0])
            .sort((a, b) => a.col - b.col)
            .map((s) => s.col)
    }, [seats, rows])

    // seatUtils.splitRowByAisle와 동일 규칙: 열 수 > 6이면 2 고정, 이하면 0
    const sideCount = colNumbers.length > 6 ? 2 : 0

    /* ── 좌석 상태 결정 ── */
    /**
     * 관리자 뷰의 좌석 상태는 3가지 (고객의 'selected' 없음)
     * 우선순위: DB 예약완료 > 임시점유 > 빈자리
     */
    const getSeatStatus = (seatId: string): 'sold_out' | 'occupied' | 'empty' => {
        if (wsState.reserved.has(seatId)) return 'sold_out'
        if (wsState.occupied.has(seatId)) return 'occupied'
        return 'empty'
    }

    /* ── 통계 계산 ── */
    const stats = useMemo(() => {
        let sold = 0, occupied = 0, empty = 0
        for (const seat of seats) {
            const s = getSeatStatus(seat.id)
            if (s === 'sold_out') sold++
            else if (s === 'occupied') occupied++
            else empty++
        }
        return {sold, occupied, empty, total: seats.length}
        // wsState 변경 시 재계산
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seats, wsState.reserved, wsState.occupied])

    /* ── 로딩 / 에러 ── */
    if (schedulesLoading) {
        return (
            <div>
                <h2 style={pageTitle}>좌석 현황</h2>
                <p style={{color: 'var(--text-muted)', fontSize: 14}}>스케줄 불러오는 중...</p>
            </div>
        )
    }
    if (schedulesError) {
        return (
            <div>
                <h2 style={pageTitle}>좌석 현황</h2>
                <div style={errorBanner}>{schedulesError}</div>
            </div>
        )
    }

    /* ── 메인 렌더 ─────────────────────────────────────────────── */
    return (
        <div>
            <h2 style={pageTitle}>좌석 현황</h2>

            {/* ── 상영관 / 스케줄 선택 ── */}
            <div style={controlRow}>

                {/* 상영관 드롭다운 */}
                <div style={controlGroup}>
                    <label style={controlLabel}>상영관</label>
                    <select
                        value={selectedTheaterNo}
                        onChange={(e) => setSelectedTheaterNo(Number(e.target.value))}
                        style={selectStyle}
                    >
                        {theaterNos.map((no) => {
                            const cfg = THEATER_CONFIG[no]
                            return (
                                <option key={no} value={no}>
                                    {no}관 · {cfg.rows}×{cfg.cols} ({cfg.rows * cfg.cols}석
                                    {cfg.hasRecliner ? ' · 리클라이너' : ''})
                                </option>
                            )
                        })}
                    </select>
                </div>

                {/* 스케줄 드롭다운 */}
                <div style={controlGroup}>
                    <label style={controlLabel}>상영 일정</label>
                    {filteredSchedules.length === 0 ? (
                        <p style={{fontSize: 13, color: 'var(--text-muted)', margin: 0, paddingTop: 6}}>
                            해당 상영관의 상영 일정이 없습니다.
                        </p>
                    ) : (
                        <select
                            value={selectedScheduleId ?? ''}
                            onChange={(e) => setSelectedScheduleId(Number(e.target.value))}
                            style={selectStyle}
                        >
                            {filteredSchedules.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {formatScheduleLabel(s, movieTitleMap)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* WebSocket 연결 상태 */}
                {selectedScheduleId !== null && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 2,
                        fontSize: 13,
                        color: wsState.connected ? 'var(--color-success-main)' : 'var(--color-error-text)',
                    }}>
                        {wsState.connected
                            ? <><Wifi size={14}/> 실시간 연결됨</>
                            : <><WifiOff size={14}/> 연결 중...</>}
                    </div>
                )}
            </div>

            {/* ── 스케줄 미선택 시 안내 ── */}
            {selectedScheduleId === null && (
                <p style={{color: 'var(--text-muted)', fontSize: 14, marginTop: 24}}>
                    상영관과 상영 일정을 선택하면 실시간 좌석 현황이 표시됩니다.
                </p>
            )}

            {selectedScheduleId !== null && (
                <>
                    {/* ── 좌석 데이터 로딩 중 표시 ──
               WebSocket이 아직 연결되지 않은 상태 (스케줄 선택 직후 ~ 연결 완료 전)
               SeatPage(고객)의 apiLoading 패턴을 참조해 관리자 버전으로 구현.
               wsState.connected가 false인 동안 좌석 배치도 대신 스피너를 표시해
               빈 좌석 배치도가 잠깐 깜빡이며 보이는 현상을 방지. */}
                    {!wsState.connected && (
                        <div style={loadingBox}>
                            {/* Loader2는 lucide-react 내장 스피너 아이콘 — CSS animation으로 회전 */}
                            <Loader2
                                size={32}
                                style={{animation: 'spin 1s linear infinite', color: 'var(--color-brand-default)'}}
                            />
                            <p style={{marginTop: 12, color: 'var(--text-secondary)', fontSize: 14}}>
                                좌석 현황을 불러오는 중...
                            </p>
                            {/* spin keyframe: 전역 CSS가 없으므로 인라인 style 태그로 주입 */}
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* ── 연결 완료 후 실제 좌석 화면 표시 ── */}
                    {wsState.connected && (
                        <>
                            {/* ── 통계 카드 ── */}
                            <div style={statsRow}>
                                {[
                                    {label: '전체', value: stats.total, color: 'var(--text-primary)'},
                                    {label: '매진', value: stats.sold, color: 'var(--text-secondary)'},
                                    {label: '점유 중', value: stats.occupied, color: 'var(--color-seat-occupied-border)'},
                                    {label: '빈자리', value: stats.empty, color: 'var(--color-brand-default)'},
                                ].map(({label, value, color}) => (
                                    <div key={label} style={statCard}>
                                        <p style={statLabel}>{label}</p>
                                        <p style={{...statValue, color}}>{value}석</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── 범례 ── */}
                            <div style={legend}>
                                {[
                                    {
                                        key: 'sold_out',
                                        label: '매진',
                                        bg: STATUS_COLOR.sold_out.bg,
                                        border: STATUS_COLOR.sold_out.border
                                    },
                                    {
                                        key: 'occupied',
                                        label: '점유 중 (임시)',
                                        bg: STATUS_COLOR.occupied.bg,
                                        border: STATUS_COLOR.occupied.border
                                    },
                                    {
                                        key: 'empty_normal',
                                        label: '일반 빈자리',
                                        bg: STATUS_COLOR.empty_normal.bg,
                                        border: STATUS_COLOR.empty_normal.border
                                    },
                                    {
                                        key: 'empty_recliner',
                                        label: '리클라이너',
                                        bg: STATUS_COLOR.empty_recliner.bg,
                                        border: STATUS_COLOR.empty_recliner.border
                                    },
                                ].map(({key, label, bg, border}) => (
                                    <div key={key} style={legendItem}>
                                        <div style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            background: bg,
                                            border: `1px solid ${border}`
                                        }}/>
                                        <span style={legendText}>{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* ── 좌석 배치도 ── */}
                            <div style={seatWrap}>

                                {/* 스크린 */}
                                <div style={screenBar}>SCREEN</div>

                                <div style={{overflowX: 'auto', display: 'flex', justifyContent: 'center'}}>
                                    <div style={{display: 'inline-flex', flexDirection: 'column', gap: 5}}>

                                        {/* 열 번호 헤더 — sideCount 기반 통로 위치 */}
                                        <div style={colHeaderRow}>
                                            <span style={rowLabelStyle}/>
                                            {/* 왼쪽 그룹 */}
                                            {colNumbers.slice(0, sideCount || colNumbers.length).map((n) => (
                                                <span key={n} style={colNumLabel}>{n}</span>
                                            ))}
                                            {sideCount > 0 && <span style={aisleGap}/>}
                                            {/* 중앙 그룹 */}
                                            {sideCount > 0 && colNumbers.slice(sideCount, colNumbers.length - sideCount).map((n) => (
                                                <span key={n} style={colNumLabel}>{n}</span>
                                            ))}
                                            {sideCount > 0 && <span style={aisleGap}/>}
                                            {/* 오른쪽 그룹 */}
                                            {sideCount > 0 && colNumbers.slice(colNumbers.length - sideCount).map((n) => (
                                                <span key={n} style={colNumLabel}>{n}</span>
                                            ))}
                                            <span style={rowLabelStyle}/>
                                        </div>

                                        {/* 좌석 행 */}
                                        {rows.map((row) => {
                                            const rowSeats = seats.filter((s) => s.row === row)
                                            // splitRowByAisle: SeatPage와 동일 함수 사용 → 통로 위치 완전 일치
                                            const {left, middle, right} = splitRowByAisle(rowSeats)

                                            /** 좌석 셀 렌더 헬퍼 */
                                            const renderSeat = (seat: SeatItem) => {
                                                const status = getSeatStatus(seat.id)

                                                // 좌석 색상 결정
                                                let bg: string
                                                let border: string
                                                if (status === 'sold_out') {
                                                    bg = STATUS_COLOR.sold_out.bg;
                                                    border = STATUS_COLOR.sold_out.border
                                                } else if (status === 'occupied') {
                                                    bg = STATUS_COLOR.occupied.bg;
                                                    border = STATUS_COLOR.occupied.border
                                                } else if (seat.seatType === 'RECLINER') {
                                                    bg = STATUS_COLOR.empty_recliner.bg;
                                                    border = STATUS_COLOR.empty_recliner.border
                                                } else {
                                                    bg = STATUS_COLOR.empty_normal.bg;
                                                    border = STATUS_COLOR.empty_normal.border
                                                }

                                                return (
                                                    <div
                                                        key={seat.id}
                                                        title={`${seat.id} · ${SEAT_TYPE_LABEL[seat.seatType]} · ${STATUS_COLOR[status === 'empty' ? (seat.seatType === 'RECLINER' ? 'empty_recliner' : 'empty_normal') : status].label}`}
                                                        style={{
                                                            ...seatStyle,
                                                            background: bg,
                                                            border: `1px solid ${border}`,
                                                            // 매진 좌석에 X 표시
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {/* 매진: X 표시 */}
                                                        {status === 'sold_out' && (
                                                            <span style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 10,
                                                                fontWeight: 900,
                                                                color: 'rgba(255,255,255,0.5)',
                                                                pointerEvents: 'none',
                                                            }}>✕</span>
                                                        )}
                                                        {/* 점유 중: 작은 원 표시 — SeatPage(고객)와 동일한 색상 사용 */}
                                                        {status === 'occupied' && (
                                                            <span style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 10,
                                                                color: 'var(--color-error-text)',
                                                                pointerEvents: 'none',
                                                            }}>●</span>
                                                        )}
                                                    </div>
                                                )
                                            }

                                            return (
                                                <div key={row} style={rowStyle}>
                                                    {/* 행 라벨 (왼쪽) */}
                                                    <span style={rowLabelStyle}>{row}</span>
                                                    {/* 왼쪽 그룹 */}
                                                    <div style={colWrap}>{left.map(renderSeat)}</div>
                                                    {/* 왼쪽 통로 */}
                                                    {sideCount > 0 && <span style={aisleGap}/>}
                                                    {/* 중앙 그룹 */}
                                                    {middle.length > 0 &&
                                                        <div style={colWrap}>{middle.map(renderSeat)}</div>}
                                                    {/* 오른쪽 통로 */}
                                                    {sideCount > 0 && <span style={aisleGap}/>}
                                                    {/* 오른쪽 그룹 */}
                                                    {right.length > 0 &&
                                                        <div style={colWrap}>{right.map(renderSeat)}</div>}
                                                    {/* 행 라벨 (오른쪽) */}
                                                    <span style={rowLabelStyle}>{row}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </> /* wsState.connected 블록 닫기 */
                    )}
                </>
            )}
        </div>
    )
}

/* ── 스타일 ─────────────────────────────────────────────────── */
const pageTitle: React.CSSProperties = {
    fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20,
}

// 상영관/스케줄 선택 컨트롤 행
const controlRow: React.CSSProperties = {
    display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24,
}
const controlGroup: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 6,
}
const controlLabel: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
}
const selectStyle: React.CSSProperties = {
    padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)',
    minWidth: 200,
}

// 통계 카드
const statsRow: React.CSSProperties = {display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap'}
const statCard: React.CSSProperties = {
    flex: 1, minWidth: 80, background: 'var(--bg-surface)', borderRadius: 10,
    padding: '12px 16px', border: '1px solid var(--border-subtle)',
}
const statLabel: React.CSSProperties = {fontSize: 12, color: 'var(--text-muted)', margin: 0, marginBottom: 4}
const statValue: React.CSSProperties = {fontSize: 20, fontWeight: 700, margin: 0}

// 범례
const legend: React.CSSProperties = {display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center'}
const legendItem: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 6}
const legendText: React.CSSProperties = {fontSize: 12, color: 'var(--text-secondary)'}

// 좌석 배치도 래퍼
// 관리자 화면(라이트 테마) 안에서도 고객 SeatPage와 동일한 다크 배경 유지를 위해
// 테마 적응 시맨틱 토큰 대신 primitive 토큰(고정값) 직접 사용
const seatWrap: React.CSSProperties = {
    background: 'var(--primitive-neutral-900)', borderRadius: 12, padding: '20px 16px 24px',
}
const screenBar: React.CSSProperties = {
    textAlign: 'center', padding: '6px', background: 'var(--primitive-neutral-700)',
    color: 'var(--primitive-neutral-300)', fontSize: 12, letterSpacing: 4,
    marginBottom: 16, borderRadius: 4,
}

// 열 번호 헤더 행
const colHeaderRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2,
}
const colNumLabel: React.CSSProperties = {
    width: 28, textAlign: 'center', fontSize: 10, color: 'var(--primitive-neutral-400)', flexShrink: 0,
}

// 좌석 행
const rowStyle: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 4}
const rowLabelStyle: React.CSSProperties = {
    width: 18, fontSize: 11, color: 'var(--primitive-neutral-300)', textAlign: 'center', flexShrink: 0, fontWeight: 600,
}
const colWrap: React.CSSProperties = {display: 'flex', gap: 4}
const aisleGap: React.CSSProperties = {display: 'inline-block', width: 12}
/** 좌석 로딩 스피너 래퍼 — WS 연결 전 좌석 배치도 대신 표시 */
const loadingBox: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 0', background: 'var(--bg-surface)', borderRadius: 12,
    border: '1px solid var(--border-subtle)', marginBottom: 20,
}

const errorBanner: React.CSSProperties = {
    padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-main)',
    borderRadius: 8, color: 'var(--color-error-text)', fontSize: 14, marginBottom: 16,
}
const seatStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 600, cursor: 'default', flexShrink: 0,
}

export default SeatListPage
