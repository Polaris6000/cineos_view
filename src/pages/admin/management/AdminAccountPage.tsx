/**
 * AdminAccountPage.tsx — 관리자 계정 및 권한 관리
 *
 * 접근 권한 분리:
 *  - SUPER_ADMIN: 모든 계정 권한 조회 및 수정 가능
 *  - MANAGER: 본인 계정만 조회 가능 (읽기 전용, 수정 불가)
 *
 * TODO: GET /api/admin/accounts 연동
 * TODO: PUT /api/admin/accounts/:id/permissions 연동
 */
import { useState, useCallback } from 'react'
import { ShieldCheck, ShieldOff, Lock, Save, RotateCcw, Eye } from 'lucide-react'
import type { AdminUser, Permission } from '../../../types/auth'
import { ROLE_PERMISSIONS } from '../../../types/auth'
import { useAuth } from '../../../context/AuthContext'

const PERMISSION_META: Record<Permission, { label: string; desc: string; superOnly?: boolean }> = {
  'ROLE_REFUND':            { label: '환불 처리',        desc: '예매 취소 및 환불 처리' },
  'ROLE_MOVIE_LIST':        { label: '영화 목록 조회',    desc: '영화 목록 조회' },
  'ROLE_MOVIE_REGISTER':    { label: '영화 등록',         desc: '새 영화 등록' },
  'ROLE_MOVIE_EDIT':        { label: '영화 수정',         desc: '기존 영화 정보 수정' },
  'ROLE_MOVIE_DELETE':      { label: '영화 삭제',         desc: '영화 및 상영 일정 삭제' },
  'ROLE_THEATER_LIST':      { label: '상영관 조회',        desc: '상영관/좌석 정보 조회' },
  'ROLE_THEATER_EDIT':      { label: '상영관 수정',        desc: '상영관 및 좌석 구성 수정' },
  'ROLE_POLICY_LIST':       { label: '정책 조회',          desc: '요금 정책 조회', superOnly: true },
  'ROLE_POLICY_EDIT':       { label: '정책 수정',          desc: '요금/할인 정책 수정', superOnly: true },
  'ROLE_STATISTICS':        { label: '통계 조회',          desc: '모든 통계 페이지 접근', superOnly: true },
  'ROLE_MEMBER_MANAGEMENT': { label: '회원 정보 관리',     desc: '회원 목록 조회 및 상세 확인', superOnly: true },
  'ROLE_ADMIN_MANAGEMENT':  { label: '계정 및 권한 관리',  desc: '관리자 계정 생성/권한 설정', superOnly: true },
}

const PERMISSION_GROUPS = [
  {
    groupLabel: '운영 권한 (일반관리자 부여 가능)',
    permissions: [
      'ROLE_REFUND',
      'ROLE_MOVIE_LIST', 'ROLE_MOVIE_REGISTER', 'ROLE_MOVIE_EDIT', 'ROLE_MOVIE_DELETE',
      'ROLE_THEATER_LIST', 'ROLE_THEATER_EDIT',
    ] as Permission[],
  },
  {
    groupLabel: '최고관리자 전용 권한',
    permissions: [
      'ROLE_POLICY_LIST', 'ROLE_POLICY_EDIT',
      'ROLE_STATISTICS',
      'ROLE_MEMBER_MANAGEMENT',
      'ROLE_ADMIN_MANAGEMENT',
    ] as Permission[],
    superOnly: true,
  },
]

function AdminAccountPage() {
  const { currentAdmin, isMaster } = useAuth()

  // 빈 배열로 시작 → 나중에 API 연동
  const [accounts, setAccounts] = useState<AdminUser[]>([])
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedMsg, setSavedMsg] = useState<Record<string, string>>({})

  // TODO: API 연동 시 여기서 데이터 가져오기
  // useEffect(() => {
  //   api.get('/admin/list').then(res => setAccounts(res.data))
  // }, [])

  const togglePermission = useCallback((loginId: string, perm: Permission) => {
    setAccounts((prev) =>
        prev.map((a) => {
          if (a.loginId !== loginId) return a
          if (!a.level) return a  // MASTER(level=false)는 수정 불가
          const has = a.permissions.includes(perm)
          return {
            ...a,
            permissions: has
                ? a.permissions.filter((p) => p !== perm)
                : [...a.permissions, perm],
          }
        })
    )
  }, [])

  const handleSave = async (loginId: string) => {
    setSaving((s) => ({ ...s, [loginId]: true }))
    await new Promise((r) => setTimeout(r, 600))
    setSaving((s) => ({ ...s, [loginId]: false }))
    setSavedMsg((m) => ({ ...m, [loginId]: '저장 완료!' }))
    setTimeout(() => setSavedMsg((m) => ({ ...m, [loginId]: '' })), 2000)
  }

  const handleReset = (loginId: string) => {
    setAccounts((prev) =>
        prev.map((a) => {
          if (a.loginId !== loginId) return a
          // MASTER면 전체권한, STAFF면 빈배열 (자동로그인 구현 후 DB에서)
          return { ...a, permissions: [...ROLE_PERMISSIONS[a.level ? 'STAFF' : 'MASTER']] }
        })
    )
  }

  return (
      <div style={wrap}>
        <div style={pageHeader}>
          <h2 style={pageTitle}>계정 및 권한 관리</h2>
          {isMaster ? (
              <p style={pageDesc}>
                일반관리자 계정의 개별 권한을 추가하거나 제거할 수 있습니다.
                최고관리자 계정의 권한은 수정할 수 없습니다.
              </p>
          ) : (
              <p style={{ ...pageDesc, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} color="var(--text-muted)" />
                내 권한을 조회할 수 있습니다. 권한 변경은 최고관리자에게 문의하세요.
              </p>
          )}
        </div>

        <div style={cardList}>
          {accounts.map((account) => {
            const isAccountMaster = account.level === false
            const isChanged = JSON.stringify(account.permissions.slice().sort())
                !== JSON.stringify(ROLE_PERMISSIONS[account.level ? 'STAFF' : 'MASTER'].slice().sort())

            return (
                <div key={account.loginId} style={{ ...card, opacity: isAccountMaster ? 0.75 : 1 }}>
                  <div style={cardHeader}>
                    <div>
                      <p style={cardName}>{account.name}</p>
                      <p style={cardId}>@{account.loginId}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: isAccountMaster ? 'rgba(255,184,0,0.15)' : 'rgba(130,176,255,0.15)',
                    color: isAccountMaster ? '#ffb800' : '#82b0ff',
                  }}>
                    {isAccountMaster ? '최고관리자' : '일반관리자'}
                  </span>
                      {isAccountMaster && <Lock size={14} color="var(--text-muted)" />}
                      {account.loginId === currentAdmin?.loginId && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                            background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                            fontWeight: 600 }}>내 계정</span>
                      )}
                    </div>
                  </div>

                  {PERMISSION_GROUPS.map((group) => (
                      <div key={group.groupLabel} style={permGroup}>
                        <p style={permGroupLabel}>{group.groupLabel}</p>
                        <div style={permGrid}>
                          {group.permissions.map((perm) => {
                            const meta = PERMISSION_META[perm]
                            const has = account.permissions.includes(perm)
                            const locked = isAccountMaster || !isMaster

                            return (
                                <button
                                    key={perm}
                                    style={{
                                      ...permBtn,
                                      background: has ? 'var(--color-success-bg)' : 'var(--bg-surface)',
                                      borderColor: has ? 'var(--color-success-main)' : 'var(--border-default)',
                                      color: has ? 'var(--color-success-text)' : 'var(--text-muted)',
                                      cursor: locked ? 'not-allowed' : 'pointer',
                                    }}
                                    onClick={() => !locked && togglePermission(account.loginId, perm)}
                                    title={meta.desc}
                                    disabled={locked}
                                >
                                  {has
                                      ? <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                                      : <ShieldOff   size={13} style={{ flexShrink: 0 }} />
                                  }
                                  {meta.label}
                                </button>
                            )
                          })}
                        </div>
                      </div>
                  ))}

                  {isMaster && !isAccountMaster && (
                      <div style={cardFooter}>
                        {savedMsg[account.loginId] && (
                            <span style={{ fontSize: 13, color: 'var(--color-success-text)', fontWeight: 600 }}>
                      ✓ {savedMsg[account.loginId]}
                    </span>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                          <button style={resetBtn} onClick={() => handleReset(account.loginId)}>
                            <RotateCcw size={13} />
                            초기화
                          </button>
                          <button
                              style={{
                                ...saveBtn,
                                background: isChanged ? 'var(--btn-primary-bg)' : 'var(--bg-surface)',
                                color: isChanged ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                                borderColor: isChanged ? 'var(--btn-primary-bg)' : 'var(--border-default)',
                              }}
                              onClick={() => handleSave(account.loginId)}
                              disabled={saving[account.loginId]}
                          >
                            <Save size={13} />
                            {saving[account.loginId] ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>
                  )}
                </div>
            )
          })}
        </div>
      </div>
  )
}

/* ── 스타일 ── */
const wrap: React.CSSProperties = { padding: 32, maxWidth: 900 }
const pageHeader: React.CSSProperties = { marginBottom: 24 }
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px',
}
const pageDesc: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6,
}
const cardList: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 20,
}
const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}
const cardHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
}
const cardName: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px',
}
const cardId: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', margin: 0,
}
const permGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
}
const permGroupLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
}
const permGrid: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 8,
}
const permBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 12px',
  border: '1px solid',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'all 0.15s',
}
const cardFooter: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  paddingTop: 12,
  borderTop: '1px solid var(--border-subtle)',
}
const resetBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '7px 14px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 7,
  color: 'var(--text-muted)',
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const saveBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '7px 16px',
  border: '1px solid',
  borderRadius: 7,
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
}

export default AdminAccountPage
