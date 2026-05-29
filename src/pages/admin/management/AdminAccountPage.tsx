/**
 * AdminAccountPage.tsx — 관리자 계정 및 권한 관리
 *
 * 접근 권한 분리:
 *  - SUPER_ADMIN(isMaster=true): 모든 계정 권한 조회 및 수정 가능
 *  - STAFF(isMaster=false):      본인 계정만 조회, 읽기 전용
 *
 * 권한 목록 및 그룹 정보는 GET /api/admin/role/list 에서 동적으로 가져옴.
 * → DB의 admin_role.group_name 컬럼이 사이드바 섹션과 동기화되어 있음.
 * → 하드코딩된 PERMISSION_META / PERMISSION_GROUPS 완전 제거.
 */
import {useCallback, useEffect, useState} from 'react'
import {Eye, Lock, RotateCcw, Save, ShieldCheck, ShieldOff} from 'lucide-react'
import type {AdminUser} from '../../../types/auth'
import {useAuth} from '../../../context/AuthContext'
import apiClient from '../../../api/apiClient.ts'

// ── 백엔드 GET /api/admin/role/list 응답 타입 ──────────────────────────
interface RoleItem {
    id: number        // DB admin_role.id — 권한 저장 시 숫자 배열로 전송
    roleName: string  // Spring Security 권한 키 (예: ROLE_REFUND)
    roleDesc: string  // 뷰에 보여줄 권한 설명 (예: 환불 처리)
    groupName: string // 사이드바 섹션명 (예: 영화 관리, 상영관/좌석)
}

function AdminAccountPage() {
    const {currentAdmin, isMaster} = useAuth()

    // 전체 관리자 계정 목록 (GET /api/admin/list)
    const [accounts, setAccounts] = useState<AdminUser[]>([])

    // 전체 권한 목록 (GET /api/admin/role/list) — 그룹핑/저장 모두 이걸 기준으로 함
    const [roleList, setRoleList] = useState<RoleItem[]>([])

    // 저장 중 로딩 상태와 저장 완료 메시지 (계정 loginId별로 관리)
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [savedMsg, setSavedMsg] = useState<Record<string, string>>({})

    // ── 데이터 초기 로딩 ─────────────────────────────────────────────────
    useEffect(() => {
        // 1) 전체 권한 목록 조회 — DB의 group_name 포함
        apiClient.get<RoleItem[]>('/admin/role/list')
            .then(res => setRoleList(res.data))
            .catch(err => console.error('권한 목록 조회 실패:', err))

        // 2) 전체 관리자 계정 + 현재 보유 권한 조회
        apiClient.get<AdminUser[]>('/admin/list')
            .then(res => {
                const sanitized = res.data.map(user => ({
                    ...user,
                    // 서버에서 온 [{id:1, roleName:'ROLE_REFUND'}] → ['ROLE_REFUND'] 로 평탄화
                    permissions: (user.permissions as any[] || []).map(p => p.roleName ?? p),
                }))
                setAccounts(sanitized)
            })
            .catch(err => console.error('계정 목록 조회 실패:', err))
    }, [])

    // ── roleList를 groupName 기준으로 묶기 ──────────────────────────────
    // 결과: [{ groupName: '영화 관리', roles: [RoleItem, ...] }, ...]
    // Map을 쓰면 insertion order(삽입 순서)가 유지되어 DB 등록 순서대로 노출됨.
    const groupedRoles = roleList.reduce<Map<string, RoleItem[]>>((map, role) => {
        const group = role.groupName ?? '기타'
        if (!map.has(group)) map.set(group, [])
        map.get(group)!.push(role)
        return map
    }, new Map())

    // ── 권한 토글 ────────────────────────────────────────────────────────
    const togglePermission = useCallback((loginId: string, roleName: string) => {
        setAccounts(prev =>
            prev.map(a => {
                if (a.loginId !== loginId) return a
                if (!a.level) return a // MASTER(level=false)는 수정 불가

                const perms = a.permissions ?? []
                const has = perms.includes(roleName)
                return {
                    ...a,
                    permissions: has
                        ? perms.filter(p => p !== roleName)
                        : [...perms, roleName],
                }
            })
        )
    }, [])

    // ── 권한 저장 ────────────────────────────────────────────────────────
    const handleSave = async (loginId: string) => {
        const account = accounts.find(a => a.loginId === loginId)
        if (!account) return

        setSaving(s => ({...s, [loginId]: true}))
        try {
            // roleName → id 변환: roleList에서 찾아서 숫자 배열로 전송
            const roleIds = (account.permissions ?? [])
                .map(name => roleList.find(r => r.roleName === name)?.id)
                .filter((id): id is number => id !== undefined)

            await apiClient.post('/admin/role', {
                adminId: account.adminId,
                roles: roleIds,
            })

            setSavedMsg(m => ({...m, [loginId]: '저장 완료!'}))
            setTimeout(() => setSavedMsg(m => ({...m, [loginId]: ''})), 2000)
        } catch (err) {
            console.error('권한 저장 실패:', err)
            alert('권한 저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(s => ({...s, [loginId]: false}))
        }
    }

    // ── 권한 초기화 ──────────────────────────────────────────────────────
    // STAFF: 빈 배열로 초기화 (DB 기본값 없음)
    const handleReset = (loginId: string) => {
        setAccounts(prev =>
            prev.map(a => {
                if (a.loginId !== loginId) return a
                return {...a, permissions: []}
            })
        )
    }

    // ── 렌더링 ───────────────────────────────────────────────────────────
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
                    <p style={{...pageDesc, display: 'flex', alignItems: 'center', gap: 6}}>
                        <Eye size={14} color="var(--text-muted)"/>
                        내 권한을 조회할 수 있습니다. 권한 변경은 최고관리자에게 문의하세요.
                    </p>
                )}
            </div>

            <div style={cardList}>
                {accounts.map(account => {
                    const isAccountMaster = account.level === false
                    const permissions = account.permissions ?? []

                    // 현재 DB 저장 상태(초기 로딩값)와 비교해 변경됐는지 확인 → 저장 버튼 활성화 여부
                    // 주의: 서버에서 받은 초기값을 별도 저장하면 더 정확하지만,
                    //       여기서는 빈배열(초기화)과의 비교로 단순화
                    const isChanged = permissions.length > 0

                    return (
                        <div key={account.loginId} style={{...card, opacity: isAccountMaster ? 0.75 : 1}}>

                            {/* 계정 헤더 — 이름, 아이디, 역할 뱃지 */}
                            <div style={cardHeader}>
                                <div>
                                    <p style={cardName}>{account.name}</p>
                                    <p style={cardId}>@{account.loginId}</p>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: isAccountMaster ? 'rgba(255,184,0,0.15)' : 'rgba(130,176,255,0.15)',
                      color: isAccountMaster ? '#ffb800' : '#82b0ff',
                  }}>
                    {isAccountMaster ? '최고관리자' : '일반관리자'}
                  </span>
                                    {isAccountMaster && <Lock size={14} color="var(--text-muted)"/>}
                                    {account.loginId === currentAdmin?.loginId && (
                                        <span style={{
                                            fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                            background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
                                            fontWeight: 600,
                                        }}>내 계정</span>
                                    )}
                                </div>
                            </div>

                            {/*
                권한 버튼 — DB의 group_name 기준으로 동적 그룹핑.
                groupedRoles: Map<groupName, RoleItem[]>을 순회하여 섹션 렌더링.
              */}
                            {Array.from(groupedRoles.entries()).map(([groupName, roles]) => (
                                <div key={groupName} style={permGroup}>
                                    <p style={permGroupLabel}>{groupName}</p>
                                    <div style={permGrid}>
                                        {roles.map(role => {
                                            const has = permissions.includes(role.roleName)
                                            // MASTER 계정이거나 현재 로그인이 STAFF면 수정 불가
                                            const locked = isAccountMaster || !isMaster

                                            return (
                                                <button
                                                    key={role.roleName}
                                                    style={{
                                                        ...permBtn,
                                                        background: has ? 'var(--color-success-bg)' : 'var(--bg-surface)',
                                                        borderColor: has ? 'var(--color-success-main)' : 'var(--border-default)',
                                                        color: has ? 'var(--color-success-text)' : 'var(--text-muted)',
                                                        cursor: locked ? 'not-allowed' : 'pointer',
                                                    }}
                                                    onClick={() => !locked && togglePermission(account.loginId, role.roleName)}
                                                    title={role.roleDesc}
                                                    disabled={locked}
                                                >
                                                    {has
                                                        ? <ShieldCheck size={13} style={{flexShrink: 0}}/>
                                                        : <ShieldOff size={13} style={{flexShrink: 0}}/>
                                                    }
                                                    {role.roleDesc}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* 저장/초기화 버튼 — MASTER만 노출, 대상이 MASTER 계정이면 숨김 */}
                            {isMaster && !isAccountMaster && (
                                <div style={cardFooter}>
                                    {savedMsg[account.loginId] && (
                                        <span
                                            style={{fontSize: 13, color: 'var(--color-success-text)', fontWeight: 600}}>
                      ✓ {savedMsg[account.loginId]}
                    </span>
                                    )}
                                    <div style={{display: 'flex', gap: 8, marginLeft: 'auto'}}>
                                        <button style={resetBtn} onClick={() => handleReset(account.loginId)}>
                                            <RotateCcw size={13}/>
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
                                            <Save size={13}/>
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

/* ── 스타일 상수 ────────────────────────────────────────────────────── */
const wrap: React.CSSProperties = {padding: 32, maxWidth: 900}
const pageHeader: React.CSSProperties = {marginBottom: 24}
const pageTitle: React.CSSProperties = {fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px'}
const pageDesc: React.CSSProperties = {fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6}
const cardList: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 20}
const card: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
}
const cardHeader: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}
const cardName: React.CSSProperties = {fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px'}
const cardId: React.CSSProperties = {fontSize: 12, color: 'var(--text-muted)', margin: 0}
const permGroup: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 8}
const permGroupLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
}
const permGrid: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: 8}
const permBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', border: '1px solid', borderRadius: 8,
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
}
const cardFooter: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
}
const resetBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', background: 'var(--bg-base)',
    border: '1px solid var(--border-default)', borderRadius: 7,
    color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
}
const saveBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 16px', border: '1px solid', borderRadius: 7,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
}

export default AdminAccountPage
