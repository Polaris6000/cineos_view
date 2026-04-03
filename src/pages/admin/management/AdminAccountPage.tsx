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
import { MOCK_ADMIN_ACCOUNTS, ROLE_PERMISSIONS } from '../../../types/auth'
import { useAuth } from '../../../context/AuthContext'

/**
 * 각 권한의 표시명과 설명
 * SUPER_ADMIN 전용 권한은 label 에 (최고관리자 전용) 표시
 */
const PERMISSION_META: Record<Permission, { label: string; desc: string; superOnly?: boolean }> = {
  'refund':         { label: '환불 처리',       desc: '예매 취소 및 환불 처리' },
  'movie.view':     { label: '영화 목록 조회',   desc: '영화 목록 조회' },
  'movie.create':   { label: '영화 등록',        desc: '새 영화 등록' },
  'movie.edit':     { label: '영화 수정',        desc: '기존 영화 정보/상영 시간 수정' },
  'movie.delete':   { label: '영화 삭제',        desc: '영화 및 상영 일정 삭제' },
  'theater.view':   { label: '상영관 조회',       desc: '상영관/좌석 정보 조회' },
  'theater.edit':   { label: '상영관 수정',       desc: '상영관 및 좌석 구성 수정' },
  'policy.view':    { label: '정책 조회',         desc: '요금 정책 조회', superOnly: true },
  'policy.edit':    { label: '정책 수정',         desc: '요금/할인 정책 수정', superOnly: true },
  'statistics':     { label: '통계 조회',         desc: '모든 통계 페이지 접근', superOnly: true },
  'member.view':    { label: '회원 정보 관리',    desc: '회원 목록 조회 및 상세 확인', superOnly: true },
  'account.manage': { label: '계정 및 권한 관리', desc: '관리자 계정 생성/권한 설정', superOnly: true },
}

/**
 * 권한 그룹 (화면에서 그룹별로 카드를 나눔)
 * MANAGER가 가질 수 있는 권한과 SUPER_ADMIN 전용 권한을 분리
 */
const PERMISSION_GROUPS = [
  {
    groupLabel: '운영 권한 (일반관리자 부여 가능)',
    permissions: ['refund', 'movie.view', 'movie.create', 'movie.edit', 'movie.delete', 'theater.view', 'theater.edit'] as Permission[],
  },
  {
    groupLabel: '최고관리자 전용 권한',
    permissions: ['policy.view', 'policy.edit', 'statistics', 'member.view', 'account.manage'] as Permission[],
    superOnly: true,
  },
]

function AdminAccountPage() {
  // 현재 로그인한 관리자 정보 및 최고관리자 여부
  const { currentAdmin, isSuperAdmin } = useAuth()

  // 더미 계정 목록으로 초기화
  // SUPER_ADMIN은 전체 계정, MANAGER는 본인 계정만 볼 수 있음
  const [accounts, setAccounts] = useState<AdminUser[]>(
    MOCK_ADMIN_ACCOUNTS
      .filter((a) => isSuperAdmin || a.id === currentAdmin?.id) // MANAGER는 본인만 필터링
      .map((a) => ({ ...a, permissions: [...a.permissions] }))
  )
  // 저장 중 상태 (계정 id → boolean)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  // 변경 알림 (계정 id → 메시지)
  const [savedMsg, setSavedMsg] = useState<Record<string, string>>({})

  /**
   * 권한 토글 핸들러
   * SUPER_ADMIN 계정은 수정 불가 (조건 처리)
   */
  const togglePermission = useCallback((accountId: string, perm: Permission) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a
        // SUPER_ADMIN 권한 수정 금지
        if (a.role === 'SUPER_ADMIN') return a
        const has = a.permissions.includes(perm)
        return {
          ...a,
          permissions: has
            ? a.permissions.filter((p) => p !== perm)   // 제거
            : [...a.permissions, perm],                  // 추가
        }
      })
    )
  }, [])

  /**
   * 권한 저장 핸들러
   * TODO: PUT /api/admin/accounts/:id/permissions { permissions: [...] } 연동
   */
  const handleSave = async (accountId: string) => {
    setSaving((s) => ({ ...s, [accountId]: true }))
    // 더미 딜레이
    await new Promise((r) => setTimeout(r, 600))
    setSaving((s) => ({ ...s, [accountId]: false }))
    setSavedMsg((m) => ({ ...m, [accountId]: '저장 완료!' }))
    setTimeout(() => setSavedMsg((m) => ({ ...m, [accountId]: '' })), 2000)
  }

  /**
   * 역할 기본값으로 리셋
   */
  const handleReset = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a
        return { ...a, permissions: [...ROLE_PERMISSIONS[a.role]] }
      })
    )
  }

  return (
    <div style={wrap}>
      {/* 페이지 헤더 */}
      <div style={pageHeader}>
        <h2 style={pageTitle}>계정 및 권한 관리</h2>
        {isSuperAdmin ? (
          <p style={pageDesc}>
            일반관리자 계정의 개별 권한을 추가하거나 제거할 수 있습니다.
            최고관리자 계정의 권한은 수정할 수 없습니다.
          </p>
        ) : (
          // MANAGER는 본인 권한 조회만 가능 — 수정 불가 안내
          <p style={{ ...pageDesc, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={14} color="var(--text-muted)" />
            내 권한을 조회할 수 있습니다. 권한 변경은 최고관리자에게 문의하세요.
          </p>
        )}
      </div>

      {/* 계정 카드 목록 */}
      <div style={cardList}>
        {accounts.map((account) => {
          // isAccountSuperAdmin: 이 카드가 최고관리자 계정인지 여부
          const isAccountSuperAdmin = account.role === 'SUPER_ADMIN'
          const isChanged = JSON.stringify(account.permissions.sort())
            !== JSON.stringify(ROLE_PERMISSIONS[account.role].slice().sort())

          return (
            <div key={account.id} style={{
              ...card,
              opacity: isAccountSuperAdmin ? 0.75 : 1,
            }}>
              {/* 계정 정보 헤더 */}
              <div style={cardHeader}>
                <div>
                  <p style={cardName}>{account.name}</p>
                  <p style={cardId}>@{account.id}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* 역할 뱃지 */}
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: isAccountSuperAdmin ? 'rgba(255,184,0,0.15)' : 'rgba(130,176,255,0.15)',
                    color: isAccountSuperAdmin ? '#ffb800' : '#82b0ff',
                  }}>
                    {isAccountSuperAdmin ? '최고관리자' : '일반관리자'}
                  </span>
                  {/* SUPER_ADMIN 계정 잠금 아이콘 */}
                  {isAccountSuperAdmin && <Lock size={14} color="var(--text-muted)" />}
                  {/* 현재 로그인 계정 표시 */}
                  {account.id === currentAdmin?.id && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                   background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                                   fontWeight: 600 }}>내 계정</span>
                  )}
                </div>
              </div>

              {/* 권한 그룹별 토글 */}
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.groupLabel} style={permGroup}>
                  <p style={permGroupLabel}>{group.groupLabel}</p>
                  <div style={permGrid}>
                    {group.permissions.map((perm) => {
                      const meta = PERMISSION_META[perm]
                      const has  = account.permissions.includes(perm)
                      /**
                       * 토글 잠금 조건:
                       *  1. 대상 계정이 SUPER_ADMIN이면 항상 잠금 (최고관리자 권한은 변경 불가)
                       *  2. 현재 로그인한 사용자가 MANAGER이면 항상 잠금 (읽기 전용)
                       */
                      const locked = isAccountSuperAdmin || !isSuperAdmin

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
                          onClick={() => !locked && togglePermission(account.id, perm)}
                          title={meta.desc}
                          disabled={locked}
                        >
                          {/* 권한 보유 여부 아이콘 */}
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

              {/* 저장/리셋 버튼 — 현재 로그인이 SUPER_ADMIN이고, 대상이 MANAGER인 경우만 표시 */}
              {isSuperAdmin && !isAccountSuperAdmin && (
                <div style={cardFooter}>
                  {savedMsg[account.id] && (
                    <span style={{ fontSize: 13, color: 'var(--color-success-text)', fontWeight: 600 }}>
                      ✓ {savedMsg[account.id]}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    {/* 역할 기본값 리셋 */}
                    <button
                      style={resetBtn}
                      onClick={() => handleReset(account.id)}
                      title="역할 기본 권한으로 초기화"
                    >
                      <RotateCcw size={13} />
                      초기화
                    </button>
                    {/* 저장 버튼 — 변경 사항 있을 때 강조 */}
                    <button
                      style={{
                        ...saveBtn,
                        background: isChanged
                          ? 'var(--btn-primary-bg)'
                          : 'var(--bg-surface)',
                        color: isChanged
                          ? 'var(--btn-primary-text)'
                          : 'var(--text-muted)',
                        borderColor: isChanged
                          ? 'var(--btn-primary-bg)'
                          : 'var(--border-default)',
                      }}
                      onClick={() => handleSave(account.id)}
                      disabled={saving[account.id]}
                    >
                      <Save size={13} />
                      {saving[account.id] ? '저장 중...' : '저장'}
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
