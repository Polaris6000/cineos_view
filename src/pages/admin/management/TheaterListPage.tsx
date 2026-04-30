import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCw } from 'lucide-react'
import apiClient from "../../../api/apiClient.ts";
import { useAuth } from '../../../context/AuthContext'

// 1. 인터페이스 정의
export interface Theater {
  no: number // PK
  cleanupTime: number // 정리시간
  policyId: number // 좌석정책 FK
  totalSeats: 100 // TODO 상영관에 좌석 (프론트에서 정하기로 했기때문에 수정하면 됨, MovieManagePage에 일정 추가칸에 상영관 칸에 현재는 좌석 수가 안나옴 이것도 수정해야함)
}

export interface SeatPolicy {
  policyId: number; // PK
  name: string; // 좌석 이름
  cost: number; // 가격
}

const RECLINER_POLICY_ID = 2

function TheaterListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  // ROLE_THEATER_EDIT 없으면 상영관 등록/수정 버튼 숨김
  const canEdit = hasPermission('ROLE_THEATER_EDIT')

  const [theaters,     setTheaters]     = useState<Theater[]>([])
  const [seatPolicies, setSeatPolicies] = useState<SeatPolicy[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // 헬퍼 함수들
  const getTheaterName = (no: number) => `${no}관`;

  const getPolicyName = (policyId: number) =>
      seatPolicies.find((p) => p.policyId === policyId)?.name ?? `정책 #${policyId}`

  const getPolicyCost = (policyId: number) =>
      seatPolicies.find((p) => p.policyId === policyId)?.cost ?? 0

  /**
   * 2. 데이터 조회 (우리가 정한 async/await 방식)
   */
  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // 상영관 목록 가져오기
      const theaterRes = await apiClient.get<Theater[]>('/admin/theater/list');
      console.log('상영관 ',theaterRes.data)
      // 좌석 정책 목록 가져오기
      const policyRes = await apiClient.get<SeatPolicy[]>('/admin/seat-policy/list');
      console.log('좌석 정책', policyRes.data)

      // 상태 업데이트 (정렬 포함)
      setTheaters([...theaterRes.data].sort((a, b) => a.no - b.no));
      setSeatPolicies(policyRes.data);

    } catch (e) {
      console.error('[TheaterListPage] 데이터 로드 실패', e);
      setError('상영관 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData()
    // seatPolicies 로드 후 addForm 기본 policyId 설정
  }, [])

  return (
      <div>
        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={pageTitle}>상영관 목록</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} disabled={loading} style={refreshBtn}>
              <RefreshCw size={14} style={{ marginRight: 5 }} />
              새로고침
            </button>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
            <div style={errorBanner}>
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
                    const tName = getTheaterName(t.no); // 변수로 추출

                    return (
                        <div key={t.no} style={card}>
                          <div style={{ marginBottom: 12 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                              {tName}
                            </h3>
                          </div>

                          <dl style={dl}>
                            <dt style={dt}>정리시간</dt>
                            <dd style={dd}>{t.cleanupTime}분</dd>

                            <dt style={dt}>좌석 정책</dt>
                            <dd style={dd}>
                              {getPolicyName(t.policyId)}
                              <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        ({getPolicyCost(t.policyId).toLocaleString()}원)
                      </span>
                            </dd>

                            <dt style={dt}>리클라이너</dt>
                            <dd style={dd}>
                              {isRecliner
                                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success-main)' }}>
                            <Check size={14} />있음
                          </span>
                                  : '없음'}
                            </dd>
                          </dl>

                          {/* ROLE_THEATER_EDIT 없으면 수정 버튼 숨김 */}
                          {canEdit && (
                            <button
                                onClick={() => navigate('/admin/management/theater/edit', {
                                  state: {
                                    theater: {
                                      no: t.no,
                                      policyId: t.policyId,
                                      cleanupTime: t.cleanupTime,
                                      name: tName,
                                      hasRecliner: isRecliner,
                                      policyName: getPolicyName(t.policyId),
                                    },
                                    seatPolicies,
                                  }
                                })}
                                style={editBtn}
                            >
                              수정
                            </button>
                          )}
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
const card       = { background: 'var(--bg-surface)', borderRadius: 12, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const dl: React.CSSProperties = { display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 10px', marginBottom: 16 }
const dt         = { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }
const dd: React.CSSProperties = { fontSize: 14, color: 'var(--text-primary)', margin: 0 }
const editBtn    = { width: '100%', padding: '10px 0', background: 'var(--color-info-bg)', border: '1px solid var(--color-brand-default)', borderRadius: 8, color: 'var(--color-brand-default)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const refreshBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }
const errorBanner: React.CSSProperties   = { padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-main)', borderRadius: 8, color: 'var(--color-error-text)', marginBottom: 16, fontSize: 14 }

export default TheaterListPage