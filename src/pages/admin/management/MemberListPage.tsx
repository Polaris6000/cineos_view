/**
 * MemberListPage.tsx — 회원 정보 조회 및 관리 (SUPER_ADMIN 전용)
 *
 * 기능:
 *  - 회원 목록 조회 (이름/이메일/전화번호 검색)
 *  - 회원 상세 정보 모달 (포인트, 예매 내역 등)
 *  - 더미 데이터로 구현 — 백엔드 연동 시 memberApi.js 교체
 *
 * TODO: GET /api/admin/members?keyword=&page= 연동
 * TODO: GET /api/admin/members/:id 연동
 */
import { useState, useEffect } from 'react'
import { Search, User, Phone, Mail, Star, Calendar } from 'lucide-react'

/* ── 타입 ── */
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

/* ── 더미 데이터 (TODO: 백엔드 API 연동 시 제거) ── */
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

function MemberListPage() {
  const [members,  setMembers]  = useState<Member[]>(MOCK_MEMBERS)
  const [keyword,  setKeyword]  = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  const [loading,  setLoading]  = useState(false)

  /**
   * 검색 필터링
   * 이름, 이메일, 전화번호 중 하나라도 keyword를 포함하면 노출
   *
   * TODO: 실제 API 연동 시 여기서 fetch 호출로 교체
   * GET /api/admin/members?keyword=${keyword}&page=0
   */
  useEffect(() => {
    setLoading(true)
    // 더미 딜레이 시뮬레이션
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
        <h2 style={pageTitle}>회원 정보 관리</h2>
        <p style={pageDesc}>
          전체 회원 {MOCK_MEMBERS.length}명 · 현재 표시 {members.length}명
        </p>
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
              <th style={{ ...th, textAlign: 'center' }}>상세</th>
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
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      background: m.isActive ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                      color: m.isActive ? 'var(--color-success-text)' : 'var(--color-error-text)',
                    }}>
                      {m.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      style={detailBtn}
                      onClick={() => setSelected(m)}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 상세 모달 */}
      {selected && (
        <MemberDetailModal member={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

/* ── 회원 상세 모달 ── */
function MemberDetailModal({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    // 배경 오버레이 — 클릭 시 닫기
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalTitle}>회원 상세 정보</h3>

        <div style={infoGrid}>
          <InfoRow icon={<User size={14} />}    label="이름"   value={member.name} />
          <InfoRow icon={<Mail size={14} />}    label="이메일" value={member.email} />
          <InfoRow icon={<Phone size={14} />}   label="전화번호" value={member.phone} />
          <InfoRow icon={<Star size={14} />}    label="보유 포인트" value={`${member.point.toLocaleString()} P`} />
          <InfoRow icon={<Calendar size={14} />} label="가입일" value={member.joinedAt} />
          <InfoRow icon={<Calendar size={14} />} label="예매 횟수" value={`${member.bookingCount}회`} />
        </div>

        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            background: member.isActive ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            color: member.isActive ? 'var(--color-success-text)' : 'var(--color-error-text)',
          }}>
            {member.isActive ? '활성 계정' : '비활성 계정'}
          </span>
        </div>

        <button style={closeModalBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

/* 모달 내 정보 한 줄 */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>
        {icon}
        {label}
      </span>
      <span style={infoValue}>{value}</span>
    </div>
  )
}

/* ── 스타일 ── */
const wrap: React.CSSProperties = {
  padding: 32, maxWidth: 1100,
}
const pageHeader: React.CSSProperties = {
  marginBottom: 20,
}
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px',
}
const pageDesc: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-muted)', margin: 0,
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
  overflowX: 'auto',
  borderRadius: 10,
  border: '1px solid var(--border-subtle)',
}
const table: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 14,
}
const tHead: React.CSSProperties = {
  background: 'var(--bg-surface)',
}
const th: React.CSSProperties = {
  padding: '12px 14px', textAlign: 'left',
  fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-subtle)',
}
const td: React.CSSProperties = {
  padding: '12px 14px', color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-subtle)',
}
const tRow: React.CSSProperties = {
  transition: 'background 0.1s',
}
const detailBtn: React.CSSProperties = {
  padding: '4px 12px', background: 'transparent',
  border: '1px solid var(--border-default)', borderRadius: 6,
  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
}
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'var(--bg-overlay)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
}
const modalBox: React.CSSProperties = {
  background: 'var(--bg-modal)',
  border: '1px solid var(--border-default)',
  borderRadius: 14,
  padding: '28px 32px',
  width: '100%', maxWidth: 440,
  display: 'flex', flexDirection: 'column', gap: 16,
}
const modalTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
}
const infoGrid: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10,
}
const infoRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const infoLabel: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 13, color: 'var(--text-muted)', fontWeight: 600,
}
const infoValue: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-primary)', fontWeight: 500,
}
const closeModalBtn: React.CSSProperties = {
  marginTop: 4, padding: '10px 0',
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

export default MemberListPage
