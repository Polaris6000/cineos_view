/**
 * MemberListPage.tsx — 회원 정보 조회 및 관리 (SUPER_ADMIN 전용)
 *
 * 변경사항:
 *  - '상세' 버튼 제거 (테이블에서 이미 모든 정보 확인 가능)
 *  - '포인트 내역' 버튼 추가 → 클릭 시 해당 회원의 포인트 적립/사용 전체 내역 모달
 *  - '전체 활동 로그' 버튼 추가 (상단) → 전체 회원의 최근 활동 로그 모달
 *
 * TODO: GET /api/admin/members?keyword=&page= 연동
 * TODO: GET /api/admin/members/:id/point-history 연동
 * TODO: GET /api/admin/activity-log 연동
 */
import { useState, useEffect } from 'react'
import { Search, Star, Activity } from 'lucide-react'

/* ── 타입 ──────────────────────────────────────────── */
interface Member {
  id: number
  name: string
  email: string
  phone: string
  point: number
  joinedAt: string       // 'YYYY-MM-DD'
  bookingCount: number
  isActive: boolean
}

interface PointLog {
  id: number
  date: string           // 'YYYY-MM-DD HH:mm'
  type: 'EARN' | 'USE' | 'EXPIRE'
  amount: number         // 적립(+) or 사용(-)
  description: string    // 예: "영화 예매 (BK20260401001)"
  balance: number        // 처리 후 잔액
}

interface ActivityLog {
  id: number
  memberName: string
  date: string
  action: string         // 예: "예매", "포인트 사용", "회원가입"
  detail: string
}

/* ── 더미 데이터 ────────────────────────────────────── */
const MOCK_MEMBERS: Member[] = [
  { id: 1,  name: '김민준', email: 'minjun@example.com',  phone: '010-1234-5678', point: 4200,  joinedAt: '2024-01-15', bookingCount: 12, isActive: true },
  { id: 2,  name: '이서연', email: 'seoyeon@example.com', phone: '010-2345-6789', point: 1800,  joinedAt: '2024-03-22', bookingCount: 5,  isActive: true },
  { id: 3,  name: '박지호', email: 'jiho@example.com',    phone: '010-3456-7890', point: 350,   joinedAt: '2024-05-08', bookingCount: 2,  isActive: true },
  { id: 4,  name: '최유나', email: 'yuna@example.com',    phone: '010-4567-8901', point: 9600,  joinedAt: '2023-11-30', bookingCount: 28, isActive: true },
  { id: 5,  name: '정다은', email: 'daeun@example.com',   phone: '010-5678-9012', point: 0,     joinedAt: '2025-01-03', bookingCount: 0,  isActive: false },
  { id: 6,  name: '한승우', email: 'seungwoo@example.com',phone: '010-6789-0123', point: 2700,  joinedAt: '2023-08-17', bookingCount: 9,  isActive: true },
  { id: 7,  name: '윤미래', email: 'mirae@example.com',   phone: '010-7890-1234', point: 550,   joinedAt: '2024-09-25', bookingCount: 3,  isActive: true },
  { id: 8,  name: '임재원', email: 'jaewon@example.com',  phone: '010-8901-2345', point: 12000, joinedAt: '2023-04-11', bookingCount: 41, isActive: true },
]

/**
 * 회원별 포인트 내역 더미 (TODO: 백엔드 연동 시 API로 교체)
 * memberId → PointLog[]
 */
const MOCK_POINT_LOGS: Record<number, PointLog[]> = {
  1: [
    { id: 1, date: '2026-04-01 19:30', type: 'EARN',   amount: 500,   description: '영화 예매 (BK20260401001)',  balance: 4200 },
    { id: 2, date: '2026-03-20 14:00', type: 'USE',    amount: -2000, description: '영화 결제 포인트 사용',       balance: 3700 },
    { id: 3, date: '2026-03-15 11:00', type: 'EARN',   amount: 500,   description: '영화 예매 (BK20260315003)',  balance: 5700 },
    { id: 4, date: '2026-02-10 20:00', type: 'EARN',   amount: 1000,  description: '이벤트 포인트 지급',          balance: 5200 },
    { id: 5, date: '2026-01-05 15:30', type: 'EXPIRE', amount: -500,  description: '포인트 유효기간 만료',         balance: 4200 },
  ],
  4: [
    { id: 1, date: '2026-04-02 17:00', type: 'EARN',   amount: 700,   description: '영화 예매 (BK20260402007)',  balance: 9600 },
    { id: 2, date: '2026-03-28 12:30', type: 'USE',    amount: -3000, description: '영화 결제 포인트 사용',       balance: 8900 },
    { id: 3, date: '2026-03-15 09:00', type: 'EARN',   amount: 500,   description: '영화 예매 (BK20260315011)',  balance: 11900 },
  ],
  8: [
    { id: 1, date: '2026-04-01 21:00', type: 'EARN',   amount: 1400,  description: '영화 예매 (BK20260401020)',  balance: 12000 },
    { id: 2, date: '2026-03-25 14:00', type: 'USE',    amount: -5000, description: '영화 결제 포인트 사용',       balance: 10600 },
    { id: 3, date: '2026-03-10 18:30', type: 'EARN',   amount: 700,   description: '영화 예매 (BK20260310009)',  balance: 15600 },
    { id: 4, date: '2026-02-20 11:00', type: 'EXPIRE', amount: -2000, description: '포인트 유효기간 만료',         balance: 14900 },
  ],
}

/**
 * 전체 활동 로그 더미 (TODO: GET /api/admin/activity-log 연동)
 */
const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 1,  memberName: '임재원', date: '2026-04-01 21:00', action: '예매',       detail: '듄: 파트 2 / 1관 21:00 / A3, A4 (2석)' },
  { id: 2,  memberName: '김민준', date: '2026-04-01 19:30', action: '예매',       detail: '범죄도시 5 / 2관 19:30 / B5 (1석)' },
  { id: 3,  memberName: '최유나', date: '2026-04-02 17:00', action: '예매',       detail: '쿵푸팬더 4 / 2관 15:00 / D2, D3 (2석)' },
  { id: 4,  memberName: '이서연', date: '2026-03-28 12:30', action: '포인트 사용', detail: '영화 결제 시 2,000P 사용' },
  { id: 5,  memberName: '임재원', date: '2026-03-25 14:00', action: '포인트 사용', detail: '영화 결제 시 5,000P 사용' },
  { id: 6,  memberName: '박지호', date: '2026-03-20 11:00', action: '예매',       detail: '인사이드 아웃 3 / 4관 11:00 / F7 (1석)' },
  { id: 7,  memberName: '한승우', date: '2026-03-18 09:00', action: '환불',       detail: '예매 BK20260318005 환불 처리' },
  { id: 8,  memberName: '윤미래', date: '2026-03-15 15:00', action: '예매',       detail: '공조3 / 3관 15:00 / G9 (1석)' },
  { id: 9,  memberName: '김민준', date: '2026-03-10 14:00', action: '포인트 적립', detail: '영화 예매 완료 (+500P)' },
  { id: 10, memberName: '최유나', date: '2026-03-10 09:00', action: '예매',       detail: '가디언즈 오브 갤럭시 / 1관 19:00 / C1, C2 (2석)' },
]

function MemberListPage() {
  const [members,  setMembers]  = useState<Member[]>(MOCK_MEMBERS)
  const [keyword,  setKeyword]  = useState('')
  const [loading,  setLoading]  = useState(false)

  // 포인트 내역 모달: 선택된 회원 (null이면 닫힘)
  const [pointMember, setPointMember] = useState<Member | null>(null)

  // 전체 활동 로그 모달
  const [showActivityLog, setShowActivityLog] = useState(false)

  /**
   * 검색 필터링
   * 이름, 이메일, 전화번호 중 하나라도 keyword를 포함하면 노출
   * TODO: 실제 API 연동 시 GET /api/admin/members?keyword=&page= 로 교체
   */
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      const kw = keyword.toLowerCase()
      setMembers(
        kw
          ? MOCK_MEMBERS.filter(
              (m) =>
                m.name.includes(kw) ||
                m.email.toLowerCase().includes(kw) ||
                m.phone.includes(kw)
            )
          : MOCK_MEMBERS
      )
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [keyword])

  return (
    <div style={wrap}>
      {/* 페이지 헤더 */}
      <div style={pageHeader}>
        <div>
          <h2 style={pageTitle}>회원 정보 관리</h2>
          <p style={pageDesc}>
            전체 회원 {MOCK_MEMBERS.length}명 · 현재 표시 {members.length}명
          </p>
        </div>
        {/* 전체 활동 로그 버튼 */}
        <button style={logBtn} onClick={() => setShowActivityLog(true)}>
          <Activity size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          전체 활동 로그
        </button>
      </div>

      {/* 검색 인풋 */}
      <div style={searchWrap}>
        <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          style={searchInput}
          type="text"
          placeholder="이름, 이메일, 전화번호로 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 회원 목록 테이블 */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={tHead}>
              <th style={th}>이름</th>
              <th style={th}>이메일</th>
              <th style={th}>전화번호</th>
              <th style={{ ...th, textAlign: 'right' }}>포인트</th>
              <th style={{ ...th, textAlign: 'right' }}>예매 횟수</th>
              <th style={{ ...th, textAlign: 'center' }}>가입일</th>
              <th style={{ ...th, textAlign: 'center' }}>상태</th>
              {/* 상세 버튼 제거 — 테이블에서 이미 모든 정보 확인 가능 */}
              <th style={{ ...th, textAlign: 'center' }}>포인트 내역</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                  검색 중...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} style={tRow}>
                  <td style={{ ...td, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{m.email}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 13 }}>{m.phone}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: 'var(--color-brand-default)' }}>
                    {m.point.toLocaleString()} P
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {m.bookingCount}회
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    {m.joinedAt}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 11, fontWeight: 700,
                      background: m.isActive ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                      color: m.isActive ? 'var(--color-success-text)' : 'var(--color-error-text)',
                    }}>
                      {m.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  {/* 포인트 내역 버튼 — 클릭 시 해당 회원의 포인트 전체 내역 모달 */}
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button style={pointBtn} onClick={() => setPointMember(m)}>
                      <Star size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      내역
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 포인트 내역 모달 */}
      {pointMember && (
        <PointHistoryModal
          member={pointMember}
          logs={MOCK_POINT_LOGS[pointMember.id] ?? []}
          onClose={() => setPointMember(null)}
        />
      )}

      {/* 전체 활동 로그 모달 */}
      {showActivityLog && (
        <ActivityLogModal
          logs={MOCK_ACTIVITY_LOGS}
          onClose={() => setShowActivityLog(false)}
        />
      )}
    </div>
  )
}

/* ── 포인트 내역 모달 ─────────────────────────────── */
function PointHistoryModal({
  member,
  logs,
  onClose,
}: {
  member: Member
  logs: PointLog[]
  onClose: () => void
}) {
  // 타입별 색상/레이블
  const typeStyle: Record<PointLog['type'], { color: string; label: string; sign: string }> = {
    EARN:   { color: 'var(--color-success-main)',  label: '적립', sign: '+' },
    USE:    { color: 'var(--color-brand-default)', label: '사용', sign: ''  },
    EXPIRE: { color: 'var(--color-error-main)',    label: '만료', sign: ''  },
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={modalTitle}>{member.name} 포인트 내역</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              현재 잔액: <strong style={{ color: 'var(--color-brand-default)' }}>{member.point.toLocaleString()} P</strong>
            </p>
          </div>
          <button style={closeIconBtn} onClick={onClose}>✕</button>
        </div>

        {/* 포인트 로그 리스트 */}
        {logs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            포인트 내역이 없습니다.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {logs.map((log) => {
              const ts = typeStyle[log.type]
              return (
                <div key={log.id} style={logRow}>
                  {/* 날짜 + 설명 */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {log.description}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{log.date}</p>
                  </div>
                  {/* 금액 + 잔액 */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ts.color, margin: '0 0 2px' }}>
                      <span style={{ fontSize: 10, marginRight: 4,
                                     padding: '1px 5px', borderRadius: 4,
                                     background: 'var(--bg-base)', color: ts.color, border: `1px solid ${ts.color}` }}>
                        {ts.label}
                      </span>
                      {ts.sign}{Math.abs(log.amount).toLocaleString()}P
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      잔액 {log.balance.toLocaleString()}P
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button style={closeModalBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

/* ── 전체 활동 로그 모달 ──────────────────────────── */
function ActivityLogModal({
  logs,
  onClose,
}: {
  logs: ActivityLog[]
  onClose: () => void
}) {
  const actionColor: Record<string, string> = {
    '예매':       'var(--color-info-main)',
    '포인트 사용': 'var(--color-brand-default)',
    '포인트 적립': 'var(--color-success-main)',
    '환불':       'var(--color-error-main)',
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={modalTitle}>전체 활동 로그</h3>
          <button style={closeIconBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
          {logs.map((log) => (
            <div key={log.id} style={logRow}>
              <div style={{ flex: 1 }}>
                {/* 회원명 + 액션 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {log.memberName}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                    color: actionColor[log.action] ?? 'var(--text-muted)',
                    background: 'var(--bg-base)',
                    border: `1px solid ${actionColor[log.action] ?? 'var(--border-default)'}`,
                  }}>
                    {log.action}
                  </span>
                </div>
                {/* 상세 내용 */}
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{log.detail}</p>
              </div>
              {/* 날짜 */}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{log.date}</span>
            </div>
          ))}
        </div>

        <button style={closeModalBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

/* ── 스타일 ──────────────────────────────────────── */
const wrap: React.CSSProperties = { padding: 32, maxWidth: 1100 }
const pageHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
}
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px',
}
const pageDesc: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-muted)', margin: 0,
}
const logBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
}
const searchWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', marginBottom: 16,
  background: 'var(--input-bg)', border: '1px solid var(--border-default)',
  borderRadius: 8, maxWidth: 480,
}
const searchInput: React.CSSProperties = {
  flex: 1, border: 'none', background: 'transparent',
  fontSize: 14, color: 'var(--text-primary)', outline: 'none',
}
const tableWrap: React.CSSProperties = {
  overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)',
}
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const tHead: React.CSSProperties = { background: 'var(--bg-surface)' }
const th: React.CSSProperties = {
  padding: '12px 14px', textAlign: 'left',
  fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-subtle)',
}
const td: React.CSSProperties = {
  padding: '12px 14px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)',
}
const tRow: React.CSSProperties = { transition: 'background 0.1s' }
const pointBtn: React.CSSProperties = {
  padding: '4px 12px', background: 'var(--primitive-brand-50)',
  border: '1px solid var(--color-brand-default)', borderRadius: 6,
  color: 'var(--primitive-brand-700)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalBox: React.CSSProperties = {
  background: 'var(--bg-modal)', border: '1px solid var(--border-default)',
  borderRadius: 14, padding: '24px 28px',
  width: '100%', maxWidth: 480,
  display: 'flex', flexDirection: 'column', gap: 0,
  maxHeight: '85vh', overflowY: 'auto',
}
const modalTitle: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
}
const closeIconBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
  color: 'var(--text-muted)', padding: 4, flexShrink: 0,
}
const logRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', gap: 10,
}
const closeModalBtn: React.CSSProperties = {
  marginTop: 16, padding: '10px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

export default MemberListPage
