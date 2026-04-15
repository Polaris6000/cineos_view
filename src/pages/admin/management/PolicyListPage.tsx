/**
 * PolicyListPage.tsx — 가격 정책 목록
 *
 * 구성:
 *  1. 좌석 타입별 추가 요금 편집 (NORMAL / RECLINER)
 *     - PATCH /api/admin/seat-policy 연동
 *  2. 할인 정책 목록 테이블 (discount_policy 테이블 전체 컬럼 반영)
 *     - id, policy_name, discount_type, discount_value, condition_type, start_at, end_at, activation
 *     - 활성화 컬럼: 표시용 배지 (클릭 불가)
 *     - 관리 컬럼: 활성화 on/off 토글 버튼
 *  3. 적립 정책 목록 테이블 (bonus_policy 테이블 전체 컬럼 반영)
 *     - id, policy_name, give_value, start_at, end_at, activation
 *     - 활성화 컬럼: 표시용 배지 (클릭 불가)
 *     - 관리 컬럼: 활성화 on/off 토글 버튼
 *     - 등록: 별도 페이지(/admin/management/policy/bonus-form)로 이동
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../../api/apiClient.ts'
import { SEAT_PRICES, SEAT_TYPE_LABEL } from '../../../api/mockData'

type SeatType = keyof typeof SEAT_PRICES

/** 좌석 타입별 색상 (NORMAL / RECLINER만) */
const SEAT_TYPE_COLOR: Record<SeatType, string> = {
  NORMAL:   '#2563eb',
  RECLINER: '#7c3aed',
}

/** discount_policy 테이블 전체 컬럼 대응 타입 */
export interface DiscountPolicy {
  id: number             // 할인 정책 인덱스
  policyName: string     // 정책 이름
  conditionType: 'TIME' | 'AGE' | 'JOB' | 'COUPON'  // 할인 유형
  discountType: 'RATIO' | 'WON'                       // 할인 방식 (비율/정액)
  discountValue: number  // 할인 값
  startAt: string        // 시작일 (DATETIME → YYYY-MM-DD)
  endAt: string | null   // 만료일 (DATETIME NULL)
  activation: boolean    // 활성화 여부
}

/** bonus_policy 테이블 전체 컬럼 대응 타입 */
interface BonusPolicy {
  id: number             // 적립 정책 인덱스
  policyName: string     // 정책 이름
  giveValue: number      // 적립 비율 (%, BIGINT UNSIGNED)
  startAt: string        // 시작일 (DATETIME)
  endAt: string | null   // 만료일 (DATETIME NULL)
  activation: boolean    // 활성화 여부
}

function PolicyListPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  /* ──────────────────────────────────────────
     페이지네이션 상태 (할인 / 적립 정책 각각)
     - /log 엔드포인트는 Page<T> 형태로 반환
     - page 파라미터는 1-based (백엔드 defaultValue="1")
  ────────────────────────────────────────── */
  const [discountPage,       setDiscountPage]       = useState(1)
  const [discountTotalPages, setDiscountTotalPages] = useState(1)
  const [bonusPage,          setBonusPage]          = useState(1)
  const [bonusTotalPages,    setBonusTotalPages]    = useState(1)

  /* ──────────────────────────────────────────
     공통: 초기 데이터 로딩 (좌석 / 할인 / 적립)
     - 할인·적립 정책은 /log (페이징) 엔드포인트 사용
     - 좌석 정책은 비페이징 /list 그대로 사용
  ────────────────────────────────────────── */
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        const [seatRes, discountRes, bonusRes] = await Promise.all([
          // 좌석 정책: 페이징 없는 단순 배열 반환
          apiClient.get('/admin/seat-policy/list'),
          // 할인 정책: Page<DiscountPolicyDTO> 반환 (백엔드 /log 엔드포인트)
          apiClient.get('/admin/discount-policy/log', { params: { page: 1 } }),
          // 적립 정책: Page<BonusPolicyDTO> 반환 (백엔드 /log 엔드포인트)
          apiClient.get('/admin/bonus-policy/log', { params: { page: 1 } }),
        ])

        // 좌석 정책: { name: '일반'|'리클라이너', cost: number } 배열 → Record로 변환
        const seatMap: Record<string, number> = {}
        seatRes.data.forEach((item: any) => {
          if (item.name === '일반')      seatMap['NORMAL']   = item.cost
          if (item.name === '리클라이너') seatMap['RECLINER'] = item.cost
        })

        setPrices(seatMap as Record<SeatType, number>)
        setEditPrices(seatMap as Record<SeatType, number>)

        // Page<T> 응답 구조: { content: [...], totalPages: N, ... }
        // content가 없으면 배열 그대로 사용 (이전 버전 호환)
        setDiscountPolicies(discountRes.data.content ?? discountRes.data)
        setDiscountTotalPages(discountRes.data.totalPages ?? 1)

        setBonusPolicies(bonusRes.data.content ?? bonusRes.data)
        setBonusTotalPages(bonusRes.data.totalPages ?? 1)
      } catch (e) {
        console.error('데이터 로딩 중 에러 발생:', e)
      } finally {
        setLoading(false)
      }
    }
    void fetchAllData()
  }, [])

  /**
   * 할인 정책 페이지 변경 핸들러
   * 새 페이지 번호로 /log 재요청
   */
  const fetchDiscountPage = async (page: number) => {
    try {
      const res = await apiClient.get('/admin/discount-policy/log', { params: { page } })
      setDiscountPolicies(res.data.content ?? res.data)
      setDiscountTotalPages(res.data.totalPages ?? 1)
      setDiscountPage(page)
    } catch (e) {
      console.error('[PolicyListPage] 할인 정책 페이지 로드 실패:', e)
    }
  }

  /**
   * 적립 정책 페이지 변경 핸들러
   * 새 페이지 번호로 /log 재요청
   */
  const fetchBonusPage = async (page: number) => {
    try {
      const res = await apiClient.get('/admin/bonus-policy/log', { params: { page } })
      setBonusPolicies(res.data.content ?? res.data)
      setBonusTotalPages(res.data.totalPages ?? 1)
      setBonusPage(page)
    } catch (e) {
      console.error('[PolicyListPage] 적립 정책 페이지 로드 실패:', e)
    }
  }

  /* ══════════════════════════════
     1. 좌석 타입별 추가 요금
  ══════════════════════════════ */
  const [prices,     setPrices]     = useState<Record<SeatType, number>>({ NORMAL: 0, RECLINER: 0 })
  const [editPrices, setEditPrices] = useState<Record<SeatType, number>>({ NORMAL: 0, RECLINER: 0 })
  const [seatEditing, setSeatEditing] = useState(false)
  const [seatSaving,  setSeatSaving]  = useState(false)
  const [seatMsg,     setSeatMsg]     = useState('')

  const handleSeatEdit   = () => { setEditPrices({ ...prices }); setSeatEditing(true); setSeatMsg('') }
  const handleSeatCancel = () => { setSeatEditing(false); setEditPrices({ ...prices }) }

  const handleSeatSave = async () => {
    // 실제로 변경된 좌석 유형만 필터링하여 요청
    const changedTargets: { name: string; cost: number }[] = []
    if (prices.NORMAL   !== editPrices.NORMAL)   changedTargets.push({ name: '일반',      cost: editPrices.NORMAL })
    if (prices.RECLINER !== editPrices.RECLINER) changedTargets.push({ name: '리클라이너', cost: editPrices.RECLINER })

    if (changedTargets.length === 0) { setSeatEditing(false); return }

    setSeatSaving(true)
    try {
      for (const data of changedTargets) {
        await apiClient.patch('/admin/seat-policy', data)
      }
      setPrices({ ...editPrices })
      setSeatEditing(false)
      setSeatMsg('좌석 추가 요금이 저장되었습니다.')
    } catch (e) {
      console.error('좌석 요금 저장 실패:', e)
    } finally {
      setSeatSaving(false)
      setTimeout(() => setSeatMsg(''), 3000)
    }
  }

  /* ══════════════════════════════
     2. 할인 정책
  ══════════════════════════════ */
  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([])
  const [discountMsg,      setDiscountMsg]      = useState('')

  /**
   * 할인 정책 종료지정
   * PATCH /api/admin/discount-policy/{id}/finish
   * → endAt 을 오늘 23:59:59 로 설정 (서비스단에서 처리)
   */
  const finishDiscountPolicy = async (id: number) => {
    if (!window.confirm('이 정책의 만료일을 오늘 23:59:59로 지정하시겠습니까?\n경고: 해당 작업은 돌이킬 수 없습니다.')) return
    try {
      // apiClient 사용 (axios 직접 사용 금지 — baseURL '/api' + 인증 헤더 자동 포함)
      await apiClient.patch(`/admin/discount-policy/${id}/finish`)
      // 종료 성공 시 현재 페이지 재조회 (/log 페이징 엔드포인트 사용)
      const res = await apiClient.get('/admin/discount-policy/log', { params: { page: discountPage } })
      setDiscountPolicies(res.data.content ?? res.data)
      setDiscountTotalPages(res.data.totalPages ?? 1)
      setDiscountMsg('종료일이 오늘 23:59:59로 지정되었습니다.')
    } catch (e) {
      console.error('할인 정책 종료지정 실패:', e)
      alert('종료지정에 실패했습니다. (이미 만료됐거나 비활성 상태일 수 있습니다.)')
    } finally {
      setTimeout(() => setDiscountMsg(''), 3000)
    }
  }

  /**
   * 할인 정책 활성화 토글
   * PATCH /api/admin/discount-policy/activation { ids, activation }
   */
  const toggleDiscountActivation = async (id: number) => {
    const target = discountPolicies.find((p) => p.id === id)
    if (!target) return

    const nextActivation = !target.activation
    try {
      // 백엔드: PATCH /api/admin/discount-policy/activation
      // ActivationRequest: { ids: Long[], activation: boolean }
      await apiClient.patch('/admin/discount-policy/activation', {
        ids: [id],
        activation: nextActivation,
      })
      // 서버 성공 시 UI 즉시 반영
      setDiscountPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, activation: nextActivation } : p))
      )
      setDiscountMsg(`정책이 ${nextActivation ? '활성' : '비활성'} 상태로 변경되었습니다.`)
    } catch (e) {
      console.error('할인 정책 상태 변경 실패:', e)
      alert('할인 정책 상태 변경에 실패했습니다.')
    } finally {
      setTimeout(() => setDiscountMsg(''), 3000)
    }
  }

  /* ══════════════════════════════
     3. 적립 정책
  ══════════════════════════════ */
  const [bonusPolicies, setBonusPolicies] = useState<BonusPolicy[]>([])
  const [bonusMsg,      setBonusMsg]      = useState('')

  /**
   * 적립 정책 종료지정
   * PATCH /api/admin/bonus-policy/{id}/finish
   * → endAt 을 오늘 23:59:59 로 설정 (서비스단에서 처리)
   */
  const finishBonusPolicy = async (id: number) => {
    if (!window.confirm('이 정책의 만료일을 오늘 23:59:59로 지정하시겠습니까?\n경고: 해당 작업은 돌이킬 수 없습니다.')) return
    try {
      // apiClient 사용 (axios 직접 사용 금지 — baseURL '/api' + 인증 헤더 자동 포함)
      await apiClient.patch(`/admin/bonus-policy/${id}/finish`)
      // 종료 성공 시 현재 페이지 재조회 (/log 페이징 엔드포인트 사용)
      const res = await apiClient.get('/admin/bonus-policy/log', { params: { page: bonusPage } })
      setBonusPolicies(res.data.content ?? res.data)
      setBonusTotalPages(res.data.totalPages ?? 1)
      setBonusMsg('종료일이 오늘 23:59:59로 지정되었습니다.')
    } catch (e) {
      console.error('적립 정책 종료지정 실패:', e)
      alert('종료지정에 실패했습니다. (이미 만료됐거나 비활성 상태일 수 있습니다.)')
    } finally {
      setTimeout(() => setBonusMsg(''), 3000)
    }
  }

  /**
   * 적립 정책 활성화 토글
   * PATCH /api/admin/bonus-policy/finish-btn { ids, activation }
   */
  const toggleBonusActivation = async (id: number) => {
    const target = bonusPolicies.find((p) => p.id === id)
    if (!target) return

    const nextActivation = !target.activation
    try {
      await apiClient.patch('/admin/bonus-policy/finish-btn', {
        ids: [id],
        activation: nextActivation,
      })
      // 서버 성공 시 UI 즉시 반영
      setBonusPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, activation: nextActivation } : p))
      )
      setBonusMsg(`정책이 ${nextActivation ? '활성' : '비활성'} 상태로 변경되었습니다.`)
    } catch (e) {
      console.error('적립 정책 상태 변경 실패:', e)
      alert('적립 정책 상태 변경에 실패했습니다.')
    } finally {
      setTimeout(() => setBonusMsg(''), 3000)
    }
  }

  /* ══════════════════════════════
     렌더
  ══════════════════════════════ */
  return (
    <div>

      {/* ── 1. 좌석 타입별 추가 요금 ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>상영관 좌석 타입별 추가 요금</h2>
            <p style={sectionDesc}>상영관의 좌석 유형 별로 지정되는 기본 금액입니다.</p>
          </div>
          {!seatEditing ? (
            <button onClick={handleSeatEdit} style={editActionBtn}>수정</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSeatCancel} disabled={seatSaving} style={cancelBtn}>취소</button>
              <button onClick={handleSeatSave}   disabled={seatSaving} style={saveBtn}>
                {seatSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        {seatMsg && <div style={saveMsgBox}>{seatMsg}</div>}

        <div style={priceGrid}>
          {(['NORMAL', 'RECLINER'] as SeatType[]).map((type) => (
            <div key={type} style={priceCard}>
              <div style={{ ...typeBar, background: SEAT_TYPE_COLOR[type] }} />
              <div style={priceCardInner}>
                <p style={priceTypeLabel}>{SEAT_TYPE_LABEL[type]}</p>
                {seatEditing ? (
                  <div style={inputWrap}>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={editPrices[type] ?? 0}
                      onChange={(e) =>
                        setEditPrices((prev) => ({ ...prev, [type]: Number(e.target.value) }))
                      }
                      style={priceInput}
                    />
                    <span style={unitLabel}>원</span>
                  </div>
                ) : (
                  <p style={{ ...priceValue, color: SEAT_TYPE_COLOR[type] }}>
                    +{(prices[type] ?? 0).toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. 할인 정책 ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>할인 정책</h2>
            <p style={sectionDesc}>
              시간대·연령·직업·쿠폰 등 조건별 할인 정책을 관리합니다.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/management/policy/form')}
            style={addBtn}
          >
            + 정책 등록
          </button>
        </div>

        {discountMsg && <div style={saveMsgBox}>{discountMsg}</div>}

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>ID</th>
                <th style={th}>정책명</th>
                <th style={{ ...th, textAlign: 'center' }}>조건</th>
                <th style={{ ...th, textAlign: 'center' }}>할인 방식</th>
                <th style={{ ...th, textAlign: 'right' }}>할인 값</th>
                {/* DB: start_at — 시작일 */}
                <th style={{ ...th, textAlign: 'center' }}>시작일</th>
                {/* DB: end_at — 만료일 (NULL 허용) */}
                <th style={{ ...th, textAlign: 'center' }}>만료일</th>
                {/* activation 컬럼: 표시만, 클릭 불가 */}
                <th style={{ ...th, textAlign: 'center' }}>활성화</th>
                {/* 관리 컬럼: 활성화 on/off 토글 */}
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>로딩 중...</td>
                </tr>
              ) : discountPolicies.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>등록된 정책이 없습니다.</td>
                </tr>
              ) : (
                discountPolicies.map((p: DiscountPolicy) => (
                  <tr key={p.id} style={tr}>
                    <td style={td}>{p.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{p.policyName}</td>

                    {/* 조건 유형 배지 */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ ...typeBadge, ...conditionBadgeStyle(p.conditionType) }}>
                        {CONDITION_TYPE_LABEL[p.conditionType]}
                      </span>
                    </td>

                    {/* 할인 방식 배지 */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={typeBadge}>
                        {p.discountType === 'RATIO' ? '비율 (%)' : '정액 (원)'}
                      </span>
                    </td>

                    {/* 할인 값 */}
                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-success-main)', fontWeight: 700 }}>
                      {p.discountType === 'RATIO'
                        ? `${p.discountValue} %`
                        : `-${p.discountValue?.toLocaleString() ?? 0} 원`}
                    </td>

                    {/* 시작일 (DB: start_at) */}
                    <td style={{ ...td, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {p.startAt ? p.startAt.slice(0, 10) : '—'}
                    </td>

                    {/* 만료일 (DB: end_at, NULL 허용) */}
                    <td style={{ ...td, textAlign: 'center', fontSize: 13,
                      color: p.endAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {p.endAt ? p.endAt.slice(0, 10) : '—'}
                    </td>

                    {/* 활성화 상태: 표시용 배지 (클릭 불가) */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: p.activation ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        color:      p.activation ? 'var(--color-success-text)' : 'var(--color-error-text)',
                      }}>
                        {p.activation ? '활성' : '비활성'}
                      </span>
                    </td>

                    {/* 관리 컬럼: 종료지정 + 활성화 on/off 토글 버튼 */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {/* 활성 상태일 때만 종료지정 버튼 표시 */}
                        {p.activation && (
                          <button
                            onClick={() => finishDiscountPolicy(p.id)}
                            style={finishBtn}
                            title="오늘 23:59:59로 만료일 지정"
                          >
                            종료지정
                          </button>
                        )}
                        <button
                          onClick={() => toggleDiscountActivation(p.id)}
                          style={p.activation ? deactivateBtn : activateBtn}
                        >
                          {p.activation ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── 할인 정책 페이지네이션 ── */}
        {/* discountTotalPages > 1 일 때만 표시 (단일 페이지면 불필요) */}
        {discountTotalPages > 1 && (
          <div style={paginationRow}>
            <button
              onClick={() => fetchDiscountPage(discountPage - 1)}
              disabled={discountPage <= 1}
              style={pageBtn}
            >
              ‹ 이전
            </button>
            <span style={pageInfo}>{discountPage} / {discountTotalPages}</span>
            <button
              onClick={() => fetchDiscountPage(discountPage + 1)}
              disabled={discountPage >= discountTotalPages}
              style={pageBtn}
            >
              다음 ›
            </button>
          </div>
        )}
      </div>

      {/* ── 3. 적립 정책 ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>적립 정책</h2>
            <p style={sectionDesc}>
              결제 금액 대비 자동 적립되는 포인트 비율(%)을 관리합니다.
            </p>
          </div>
          {/* 별도 페이지로 이동하여 등록 (할인 정책과 동일한 패턴) */}
          <button
            onClick={() => navigate('/admin/management/policy/bonus-form')}
            style={addBtn}
          >
            + 정책 등록
          </button>
        </div>

        {bonusMsg && <div style={saveMsgBox}>{bonusMsg}</div>}

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>ID</th>
                <th style={th}>정책명</th>
                {/* DB: give_value — 적립률 */}
                <th style={{ ...th, textAlign: 'right' }}>적립률</th>
                {/* DB: start_at — 시작일 */}
                <th style={{ ...th, textAlign: 'center' }}>시작일</th>
                {/* DB: end_at — 만료일 (NULL 허용) */}
                <th style={{ ...th, textAlign: 'center' }}>만료일</th>
                {/* activation 컬럼: 표시만, 클릭 불가 */}
                <th style={{ ...th, textAlign: 'center' }}>활성화</th>
                {/* 관리 컬럼: 활성화 on/off 토글 */}
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>로딩 중...</td>
                </tr>
              ) : bonusPolicies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                    등록된 적립 정책이 없습니다.
                  </td>
                </tr>
              ) : (
                bonusPolicies.map((p) => (
                  <tr key={p.id} style={tr}>
                    <td style={td}>{p.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{p.policyName}</td>

                    {/* 적립률 */}
                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-success-main)', fontWeight: 700 }}>
                      {p.giveValue} %
                    </td>

                    {/* 시작일 */}
                    <td style={{ ...td, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {p.startAt ? p.startAt.slice(0, 10) : '—'}
                    </td>

                    {/* 만료일 (NULL이면 '—') */}
                    <td style={{ ...td, textAlign: 'center', fontSize: 13,
                      color: p.endAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {p.endAt ? p.endAt.slice(0, 10) : '—'}
                    </td>

                    {/* 활성화 상태: 표시용 배지 (클릭 불가) */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: p.activation ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        color:      p.activation ? 'var(--color-success-text)' : 'var(--color-error-text)',
                      }}>
                        {p.activation ? '활성' : '비활성'}
                      </span>
                    </td>

                    {/* 관리 컬럼: 종료지정 + 활성화 on/off 토글 버튼 */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {/* 활성 상태일 때만 종료지정 버튼 표시 */}
                        {p.activation && (
                          <button
                            onClick={() => finishBonusPolicy(p.id)}
                            style={finishBtn}
                            title="오늘 23:59:59로 만료일 지정"
                          >
                            종료지정
                          </button>
                        )}
                        <button
                          onClick={() => toggleBonusActivation(p.id)}
                          style={p.activation ? deactivateBtn : activateBtn}
                        >
                          {p.activation ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── 적립 정책 페이지네이션 ── */}
        {bonusTotalPages > 1 && (
          <div style={paginationRow}>
            <button
              onClick={() => fetchBonusPage(bonusPage - 1)}
              disabled={bonusPage <= 1}
              style={pageBtn}
            >
              ‹ 이전
            </button>
            <span style={pageInfo}>{bonusPage} / {bonusTotalPages}</span>
            <button
              onClick={() => fetchBonusPage(bonusPage + 1)}
              disabled={bonusPage >= bonusTotalPages}
              style={pageBtn}
            >
              다음 ›
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

/* ── 할인 조건 유형 레이블 매핑 ── */
const CONDITION_TYPE_LABEL: Record<'TIME' | 'AGE' | 'JOB' | 'COUPON', string> = {
  TIME:   '시간대',
  AGE:    '연령',
  JOB:    '직업',
  COUPON: '쿠폰',
}

/** 조건 유형별 배지 색상 */
function conditionBadgeStyle(type: 'TIME' | 'AGE' | 'JOB' | 'COUPON'): React.CSSProperties {
  const colorMap: Record<string, { bg: string; color: string }> = {
    TIME:   { bg: '#eff6ff', color: '#1d4ed8' }, // 파랑
    AGE:    { bg: '#f0fdf4', color: '#15803d' }, // 초록
    JOB:    { bg: '#fdf4ff', color: '#7e22ce' }, // 보라
    COUPON: { bg: '#fff7ed', color: '#c2410c' }, // 주황
  }
  return { background: colorMap[type]?.bg, color: colorMap[type]?.color }
}

/* ── 스타일 ── */
const sectionCard: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 12,
  padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24,
}
const sectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16,
}
const sectionTitle = { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }
const sectionDesc  = { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }

const editActionBtn: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
}
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
}
const saveBtn: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const saveMsgBox: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--color-success-bg)',
  border: '1px solid var(--color-success-main)', borderRadius: 8,
  color: 'var(--color-success-main)', fontSize: 13, fontWeight: 600, marginBottom: 16,
}

const priceGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
}
const priceCard: React.CSSProperties = {
  background: 'var(--bg-base)', borderRadius: 10, overflow: 'hidden',
  border: '1px solid var(--border-subtle)',
}
const typeBar: React.CSSProperties    = { height: 4 }
const priceCardInner: React.CSSProperties = { padding: '14px 16px' }
const priceTypeLabel = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }
const priceValue     = { fontSize: 22, fontWeight: 800, margin: '8px 0 0' }
const inputWrap: React.CSSProperties  = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }
const priceInput: React.CSSProperties = {
  width: '90px', padding: '6px 8px', border: '1px solid var(--border-default)',
  borderRadius: 6, fontSize: 16, fontWeight: 700,
  color: 'var(--text-primary)', background: 'var(--input-bg)', outline: 'none', textAlign: 'right',
}
const unitLabel = { fontSize: 14, color: 'var(--text-secondary)' }

const addBtn: React.CSSProperties = {
  padding: '10px 20px', background: 'var(--color-brand-default)',
  color: 'var(--btn-primary-text)', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
}
const tableWrap = { borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thead = { background: 'var(--bg-base)' }
const th: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
  color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)',
}
const tr   = { borderBottom: '1px solid var(--border-subtle)' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)' }
const typeBadge: React.CSSProperties = {
  padding: '2px 8px', background: 'var(--bg-base)', borderRadius: 4,
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
}

/** 관리 컬럼: 활성화 버튼 (현재 비활성 → 클릭하면 활성으로) */
const activateBtn: React.CSSProperties = {
  padding: '6px 14px', background: 'var(--color-success-bg)', color: 'var(--color-success-text)',
  border: '1px solid var(--color-success-main)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}
/** 관리 컬럼: 비활성화 버튼 (현재 활성 → 클릭하면 비활성으로) */
const deactivateBtn: React.CSSProperties = {
  padding: '6px 14px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)',
  border: '1px solid var(--color-error-main)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}
/** 관리 컬럼: 종료지정 버튼 (활성 정책에만 표시 — 오늘 23:59:59로 endAt 지정) */
const finishBtn: React.CSSProperties = {
  padding: '6px 14px', background: '#fff7ed', color: '#c2410c',
  border: '1px solid #c2410c', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}

/** 페이지네이션 컨테이너 — 테이블 하단에 중앙 정렬 */
const paginationRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 12, marginTop: 14,
}
/** 이전/다음 버튼 */
const pageBtn: React.CSSProperties = {
  padding: '6px 16px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 6,
  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
  cursor: 'pointer',
}
/** 페이지 번호 표시 텍스트 */
const pageInfo = { fontSize: 13, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' as const }

export default PolicyListPage