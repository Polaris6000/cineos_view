/**
 * TheaterListPage.tsx — 상영관 목록
 *
 * API 연동:
 *  - GET /api/admin/theater/list   → 상영관 목록 (no, policyId, cleanupTime)
 *  - GET /api/admin/seat-policy/list → 좌석 정책 목록 (policyId, name, cost)
 *
 * ⚠️ 백엔드 TheaterDTO 제한사항:
 *   - name, totalSeats, rows, cols, hasRecliner 필드 없음 (DB에는 있으나 DTO 미포함)
 *   - name은 no 값으로 "X관" 형식으로 표시 (예: no=1 → "1관")
 *   - hasRecliner는 policyId로 추론 (policyId=2 = 리클라이너 정책)
 *
 * TODO: 상영관 수정 (cleanupTime, policyId) → PATCH /api/admin/theater/cleantime, /theater/policy
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCw } from 'lucide-react'
import apiClient, { type TheaterDTO, type SeatPolicyDTO, theaterName } from '../../../api/apiClient'

/** 리클라이너 정책 policyId (seat_policy 테이블 기준: 2 = 리클라이너) */
const RECLINER_POLICY_ID = 2

function TheaterListPage() {
  const navigate = useNavigate()

  const [theaters,     setTheaters]     = useState<TheaterDTO[]>([])
  const [seatPolicies, setSeatPolicies] = useState<SeatPolicyDTO[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  /** 좌석 정책 조회 헬퍼 */
  const getPolicyName = (policyId: number) =>
    seatPolicies.find((p) => p.policyId === policyId)?.name ?? `정책 #${policyId}`

  const getPolicyCost = (policyId: number) =>
    seatPolicies.find((p) => p.policyId === policyId)?.cost ?? 0

  /**
   * 상영관 목록 + 좌석 정책 병렬 조회
   * GET /api/admin/theater/list
   * GET /api/admin/seat-policy/list
   */
  const fetchData = () => {
    setLoading(true)
    setError('')
    Promise.all([
      apiClient.get<TheaterDTO[]>('/admin/theater/list'),
      apiClient.get<SeatPolicyDTO[]>('/admin/seat-policy/list'),
    ])
      .then(([theaterRes, policyRes]) => {
        // no 기준 오름차순 정렬
        setTheaters([...theaterRes.data].sort((a, b) => a.no - b.no))
        setSeatPolicies(policyRes.data)
      })
      .catch((err) => {
        console.error('[TheaterListPage] 데이터 로드 실패', err)
        setError('상영관 정보를 불러오지 못했습니다.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={pageTitle}>상영관 목록</h2>
        <button onClick={fetchData} disabled={loading} style={refreshBtn}>
          <RefreshCw size={14} style={{ marginRight: 5 }} />
          새로고침
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-main)',
                      borderRadius: 8, color: 'var(--color-error-text)', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중...</p>
      )}

      {/* 상영관 카드 그리드 */}
      {!loading && !error && (
        <div style={grid}>
          {theaters.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>등록된 상영관이 없습니다.</p>
          ) : (
            theaters.map((t) => {
              const isRecliner = t.policyId === RECLINER_POLICY_ID
              return (
                <div key={t.no} style={card}>
                  {/* 상단: 상영관 이름 */}
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {theaterName(t.no)}
                    </h3>
                  </div>

                  {/* 정보 테이블 */}
                  <dl style={dl}>
                    {/* 정리시간 */}
                    <dt style={dt}>정리시간</dt>
                    <dd style={dd}>{t.cleanupTime}분</dd>

                    {/* 좌석 정책 */}
                    <dt style={dt}>좌석 정책</dt>
                    <dd style={dd}>
                      {getPolicyName(t.policyId)}
                      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        ({getPolicyCost(t.policyId).toLocaleString()}원)
                      </span>
                    </dd>

                    {/* 리클라이너 여부 (policyId로 추론) */}
                    <dt style={dt}>리클라이너</dt>
                    <dd style={dd}>
                      {isRecliner
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success-main)' }}>
                            <Check size={14} />있음
                          </span>
                        : '없음'}
                    </dd>
                  </dl>

                  {/* 수정 버튼 → TheaterEditPage로 이동 */}
                  <button
                    onClick={() => navigate('/admin/management/theater/edit', {
                      state: {
                        theater: {
                          // 백엔드에서 받은 실제 데이터
                          no:          t.no,
                          policyId:    t.policyId,
                          cleanupTime: t.cleanupTime,
                          // 화면 표시용 파생값
                          name:        theaterName(t.no),
                          hasRecliner: isRecliner,
                          policyName:  getPolicyName(t.policyId),
                        },
                        seatPolicies,
                      }
                    })}
                    style={editBtn}
                  >
                    수정
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle  = { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }
const grid       = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }
const card       = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const dl: React.CSSProperties = { display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 10px', marginBottom: 16 }
const dt         = { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }
const dd: React.CSSProperties = { fontSize: 14, color: 'var(--text-primary)', margin: 0 }
const editBtn    = { width: '100%', padding: '10px 0', background: 'var(--color-info-bg)',
                     border: '1px solid var(--color-brand-default)', borderRadius: 8,
                     color: 'var(--color-brand-default)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const refreshBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '8px 14px',
  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
}

export default TheaterListPage
