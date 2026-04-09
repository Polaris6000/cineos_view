import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCw } from 'lucide-react'
import axios from "axios";

// 1. 인터페이스 정의
interface Theater {
  no: number
  cleanupTime: number
  policyId: number
}

export interface SeatPolicy {
  policyId: number;
  name: string;
  cost: number;
}

const RECLINER_POLICY_ID = 2

function TheaterListPage() {
  const navigate = useNavigate()

  const [theaters,     setTheaters]     = useState<Theater[]>([])
  const [seatPolicies, setSeatPolicies] = useState<SeatPolicy[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  /* ── 상영관 등록 폼 상태 ── */
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [addForm,      setAddForm]      = useState({ policyId: 0, cleanupTime: 10 })
  const [addSaving,    setAddSaving]    = useState(false)
  const [addMsg,       setAddMsg]       = useState('')

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
      const theaterRes = await axios.get<Theater[]>('/api/admin/theater/list');
      console.log('상영관 ',theaterRes.data)
      // 좌석 정책 목록 가져오기
      const policyRes = await axios.get<SeatPolicy[]>('/api/admin/seat-policy/list');
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

  // seatPolicies가 로드됐을 때 등록 폼 기본값 설정
  useEffect(() => {
    if (seatPolicies.length > 0 && addForm.policyId === 0) {
      setAddForm((prev) => ({ ...prev, policyId: seatPolicies[0].policyId }))
    }
  }, [seatPolicies])

  /**
   * 상영관 등록
   * POST /api/admin/theater { policyId, cleanupTime }
   * 성공 시 목록 새로고침
   */
  const handleAddTheater = async () => {
    if (!addForm.policyId) { alert('좌석 정책을 선택해 주세요.'); return }
    if (addForm.cleanupTime < 0 || addForm.cleanupTime > 60) {
      alert('정리시간은 0~60분 사이여야 합니다.'); return
    }

    setAddSaving(true)
    try {
      await axios.post('/api/admin/theater', {
        policyId:    addForm.policyId,
        cleanupTime: addForm.cleanupTime,
      })
      setAddMsg('상영관이 등록되었습니다.')
      setShowAddForm(false)
      // 목록 새로고침으로 새 상영관 반영
      await fetchData()
    } catch (e) {
      console.error('[TheaterListPage] 상영관 등록 실패', e)
      alert('상영관 등록에 실패했습니다.')
    } finally {
      setAddSaving(false)
      setTimeout(() => setAddMsg(''), 3000)
    }
  }

  return (
      <div>
        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={pageTitle}>상영관 목록</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              style={showAddForm ? cancelAddBtn : addBtn}
            >
              {showAddForm ? '취소' : '+ 상영관 등록'}
            </button>
            <button onClick={fetchData} disabled={loading} style={refreshBtn}>
              <RefreshCw size={14} style={{ marginRight: 5 }} />
              새로고침
            </button>
          </div>
        </div>

        {/* ── 상영관 등록 폼 ── */}
        {showAddForm && (
          <div style={addFormBox}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
              새 상영관 등록
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* 좌석 정책 선택 */}
              <div style={addField}>
                <label style={addLabel}>좌석 정책</label>
                <select
                  value={addForm.policyId}
                  onChange={(e) => setAddForm((p) => ({ ...p, policyId: Number(e.target.value) }))}
                  style={addSelect}
                >
                  {seatPolicies.map((p) => (
                    <option key={p.policyId} value={p.policyId}>
                      {p.name} ({p.cost.toLocaleString()}원)
                    </option>
                  ))}
                </select>
              </div>
              {/* 정리시간 */}
              <div style={addField}>
                <label style={addLabel}>정리시간 (분)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={5}
                  value={addForm.cleanupTime}
                  onChange={(e) => setAddForm((p) => ({ ...p, cleanupTime: Number(e.target.value) }))}
                  style={addInput}
                />
              </div>
              <button
                onClick={handleAddTheater}
                disabled={addSaving}
                style={{ ...saveBtn, opacity: addSaving ? 0.7 : 1 }}
              >
                {addSaving ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}

        {/* 등록 성공 메시지 */}
        {addMsg && <div style={successBanner}>{addMsg}</div>}

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
const successBanner: React.CSSProperties = { padding: '10px 14px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-main)', borderRadius: 8, color: 'var(--color-success-main)', fontSize: 13, fontWeight: 600, marginBottom: 16 }
const addBtn: React.CSSProperties        = { padding: '8px 18px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const cancelAddBtn: React.CSSProperties  = { padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }
const saveBtn: React.CSSProperties       = { padding: '10px 22px', background: 'var(--color-brand-default)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const addFormBox: React.CSSProperties    = { background: 'var(--bg-surface)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, border: '1px solid var(--border-default)' }
const addField: React.CSSProperties      = { display: 'flex', flexDirection: 'column', gap: 4 }
const addLabel                           = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }
const addSelect: React.CSSProperties     = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', cursor: 'pointer', minWidth: 200 }
const addInput: React.CSSProperties      = { padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 14, color: 'var(--text-primary)', background: 'var(--input-bg)', width: 100 }

export default TheaterListPage