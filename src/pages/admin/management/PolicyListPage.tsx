/**
 * PolicyListPage.tsx — 가격 정책 목록
 *
 * 구성:
 *  1. 좌석 타입별 추가 요금 편집 (NORMAL / RECLINER)
 *     - TODO: PATCH /api/admin/seat-prices 연동
 *  2. 할인 정책 목록 테이블 (discount_policy 테이블 대응)
 *     - condition_type: TIME/AGE/JOB/COUPON
 *     - discount_type: RATIO(비율%) / WON(정액원)
 *  3. 적립 정책 (bonus_policy 테이블 대응)
 *     - id, policy_name, give_value(적립률 %), start_at, end_at, activation
 *     - TODO: GET/POST/PATCH/DELETE /api/admin/bonus-policy 연동
 *
 * 사용 좌석: 일반(NORMAL) / 리클라이너(RECLINER)
 * VIP·커플석 없음
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { SEAT_PRICES, SEAT_TYPE_LABEL } from '../../../api/mockData'

type SeatType = keyof typeof SEAT_PRICES

/** 좌석 타입별 색상 (NORMAL / RECLINER만) */
const SEAT_TYPE_COLOR: Record<SeatType, string> = {
  NORMAL:   '#2563eb',
  RECLINER: '#7c3aed',
}

export interface DiscountPolicy {
  id: number // 인덱스
  policyName: string // 정책 이름
  conditionType: 'TIME' | 'AGE' | 'JOB' | 'COUPON' // 할인대상
  discountType: 'RATIO' | 'WON' // 할인유형
  discountValue: number; // 할인값
  startAt: string // 시작일 (YYYY-MM-DD)
  endAt: string // 만료일 (YYYY-MM-DD)
  activation: boolean // 만료여부
}

/* ── bonus_policy 타입 정의 ── */
interface BonusPolicy {
  id: number
  /** 정책 이름 (예: '기본 적립', 'VIP 적립') */
  policyName: string
  /** 적립률 (%, 예: 5 → 결제금액의 5% 적립) — DB: BIGINT UNSIGNED COMMENT '적립 비율' */
  giveValue: number
  /** 정책 시작일 (YYYY-MM-DD) */
  startAt: string
  /** 정책 종료일 (YYYY-MM-DD), null = 기간 제한 없음 — DB: DATETIME NULL */
  endAt: string | null
  /** 활성화 여부 */
  activation: boolean
}

/**
 * bonus_policy 더미 데이터 (TODO: GET /api/admin/bonus-policy 연동)
 * give_value = 적립률(%) — data.sql 기준 (기본 5%, VIP 20%)
 */
// const MOCK_BONUS_POLICIES: BonusPolicy[] = [
//   { id: 1, policy_name: '기본 적립',    give_value: 5,  start_at: '2026-01-01', end_at: null,         activation: true  },
//   { id: 2, policy_name: 'VIP 적립',     give_value: 20, start_at: '2026-01-01', end_at: null,         activation: true  },
//   { id: 3, policy_name: '신규 가입 보너스', give_value: 10, start_at: '2026-01-01', end_at: '2026-12-31', activation: true  },
//   { id: 4, policy_name: '생일 이벤트',  give_value: 15, start_at: '2026-03-01', end_at: '2026-05-31', activation: false },
// ]

function PolicyListPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([])

  // 데이터 한번에 가져옴 (좌석, 할인, 적립)
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        const [seatRes, discountRes, bonusRes] = await Promise.all([
            axios.get('/api/admin/seat-policy/list'),
            axios.get('/api/admin/discount-policy/list'),
            axios.get('/api/admin/bonus-policy/list')
        ]);
        const seatMap: Record<string, number> = {};
        seatRes.data.forEach((item: any) => {
          if (item.name === '일반') seatMap['NORMAL'] = item.cost;
          if (item.name === '리클라이너') seatMap['RECLINER'] = item.cost;
        });

        console.log('좌석', seatRes.data);
        console.log('할인 ', discountRes.data);
        console.log('적립 ', bonusRes.data);

        setPrices(seatMap)
        setEditPrices(seatMap)
        setDiscountPolicies(discountRes.data)
        setBonusPolicies(bonusRes.data)
      } catch (e) {
        console.log('데이터 로딩중 에러 발생:', e)
      } finally {
        setLoading(false)
      }
    };
    void fetchAllData()
  }, []);

  /* ──────────────────────────────────────────
     1. 좌석 타입별 추가 요금 (NORMAL / RECLINER)
  ────────────────────────────────────────── */
  const [prices,     setPrices]     = useState<Record<SeatType, number>>({ NORMAL: 0, RECLINER: 0 })
  const [editPrices, setEditPrices] = useState<Record<SeatType, number>>({ NORMAL: 0, RECLINER: 0 })

  const [seatEditing,  setSeatEditing]  = useState(false)
  const [seatSaving,   setSeatSaving]   = useState(false)
  const [seatMsg,      setSeatMsg]      = useState('')

  // 좌석 정책 로직
  const handleSeatEdit   = () => {
    setEditPrices({ ...prices });
    setSeatEditing(true);
    setSeatMsg('')
  }


  const handleSeatCancel = () => { setSeatEditing(false); setEditPrices({ ...prices }) }

  const handleSeatSave = async () => {
    // 1. 실제로 변경된 항목만 필터링
    const changedTargets = [];

    if (prices.NORMAL !== editPrices.NORMAL) {
      changedTargets.push({ name: '일반', cost: editPrices.NORMAL });
    }
    if (prices.RECLINER !== editPrices.RECLINER) {
      changedTargets.push({ name: '리클라이너', cost: editPrices.RECLINER });
    }

    // 2. 변경된 게 하나도 없다면 바로 종료 (서버 요청 안 함)
    if (changedTargets.length === 0) {
      setSeatEditing(false);
      return;
    }

    setSeatSaving(true);
    try {
      // 3. 변경된 항목에 대해서만 요청 보냄
      for (const data of changedTargets) {
        await axios.patch('/api/admin/seat-policy', data);
      }

      setPrices({ ...editPrices })
      setSeatEditing(false)
      setSeatMsg('좌석 추가 요금이 저장되었습니다.')
    } catch (e) {
      console.error('저장 실패:', e)
    } finally {
      setSeatSaving(false)
      setTimeout(() => setSeatMsg(''), 3000)
    }
    // TODO: PATCH /api/admin/seat-prices
  }

  /* ──────────────────────────────────────────
     2. 적립 정책 (bonus_policy)
  ────────────────────────────────────────── */
  const [bonusPolicies, setBonusPolicies] = useState<BonusPolicy[]>([])
  // 새 정책 입력 폼 토글
  const [showBonusForm, setShowBonusForm] = useState(false)
  // 새 정책 입력 값 (end_at은 빈 문자열로 초기화, 제출 시 null 처리)
  const [bonusForm, setBonusForm] = useState<Omit<BonusPolicy, 'id'>>({
    policyName: '', giveValue: 0, startAt: '', endAt: null, activation: true,
  })
  const [bonusSaving, setBonusSaving] = useState(false)
  const [bonusMsg,    setBonusMsg]    = useState('')

  /** 적립 정책 활성화 토글 (TODO: PATCH /api/admin/bonus-policy/:id) */
  const toggleBonusActivation = async (id: number) => {
    // 1. 현재 리스트에서 해당 정책을 찾아 다음 상태(반전)를 결정합니다.
    const target = bonusPolicies.find((p) => p.id === id);
    if (!target) return;

    const nextActivation = !target.activation;

    try {
      await axios.patch('/api/admin/bonus-policy/finish-btn', {
        ids: [id],
        activation: nextActivation
      });

      // 3. 서버 성공 시 UI 상태 업데이트
      setBonusPolicies((prev) =>
          prev.map((p) => (p.id === id ? { ...p, activation: nextActivation } : p))
      );

      setBonusMsg(`정책이 ${nextActivation ? '활성' : '비활성'} 상태로 변경되었습니다.`);
    } catch (e) {
      console.error('상태변경 실패:', e);
      alert('적립 정책 상태 변경에 실패했습니다.');
    } finally {
      setTimeout(() => setBonusMsg(''), 3000);
    }
  };

  /** 적립 정책 삭제 (TODO: DELETE /api/admin/bonus-policy/:id)
   * TODO 바로 삭제 말고 정책시간 23:59:59 로 변경 (삭제(백서버에 구현돼있음)도 있긴함 필요하면 사용)*/
  const deleteBonusPolicy = async (id: number) => {
    if (!window.confirm('이 정책을 삭제하시겠습니까?')) return

    try {
      // 1. 서버에 삭제 요청
      await axios.patch(`/api/admin/bonus-policy/${id}/finish`);

      // 2. 서버 삭제가 성공하면 프론트엔드 리스트에서도 제거
      setBonusPolicies((prev) => prev.filter((p) => p.id !== id));

      // 3. 알림 메시지 (선택사항)
      setBonusMsg('정책이 삭제되었습니다.');
      setTimeout(() => setBonusMsg(''), 3000);

    } catch (e) {
      console.error('삭제 실패: ', e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  /** 적립 정책 등록 (TODO: POST /api/admin/bonus-policy) */
  const handleBonusSave = async () => {
    if (!bonusForm.policyName.trim())          { alert('정책 이름을 입력해주세요.'); return }
    if (bonusForm.giveValue <= 0 || bonusForm.giveValue > 100) {
      alert('적립률은 1~100 사이의 값이어야 합니다.'); return
    }
    if (!bonusForm.startAt)                    { alert('시작일을 입력해주세요.'); return }
    // end_at은 선택사항 (null 허용)
    if (bonusForm.endAt && bonusForm.startAt > bonusForm.endAt) {
      alert('종료일은 시작일 이후여야 합니다.'); return
    }

    setBonusSaving(true)
    try {
      const payload = {
        policyName: bonusForm.policyName,
        giveValue: Number(bonusForm.giveValue),
        startAt: bonusForm.startAt? `${bonusForm.startAt}T00:00:00` : null,
        endAt: bonusForm.endAt? `${bonusForm.endAt}T23:59:59` : null,
        // 명시적으로 값이 true/false인지 확인
        activation: bonusForm.activation
      };
      const res = await axios.post('/api/admin/bonus-policy', payload)

      console.log(res.data)

      if (res.status === 200 || res.status === 201) {
        if (res.data) {
          setBonusPolicies((prev) => [...prev, res.data]);
        }

        setBonusForm({ policyName: '', giveValue: 0, startAt: '', endAt: null, activation: true })
        setShowBonusForm(false)
        setBonusMsg('적립 정책이 등록되었습니다.')
      }
    } catch (e) {
      console.error('등록 실패: ', e)
      alert('적립 정책 등록 중 오류가 발생했습니다.')
    } finally {
      setBonusSaving(false)
      setTimeout(() => setBonusMsg(''), 3000)
    }
  }

  return (
    <div>

      {/* ══════════════════════════════
          1. 좌석 타입별 추가 요금 (NORMAL / RECLINER)
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>상영관 좌석 타입별 추가 요금</h2>
            <p style={sectionDesc}>
              상영관의 좌석 유형 별로 지정되는 기본 금액입니다.
            </p>
          </div>
          {!seatEditing ? (
            <button onClick={handleSeatEdit} style={editActionBtn}>수정</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSeatCancel} disabled={seatSaving} style={cancelBtn}>취소</button>
              <button onClick={handleSeatSave}  disabled={seatSaving} style={saveBtn}>
                {seatSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        {seatMsg && <div style={saveMsgBox}>✅ {seatMsg}</div>}

        <div style={priceGrid}>
          {(['NORMAL', 'RECLINER'] as SeatType[]).map((type) => (
            <div key={type} style={priceCard}>
              <div style={{ ...typeBar, background: SEAT_TYPE_COLOR[type] }} />
              <div style={priceCardInner}>

                {/* TODO 여기에 지정? 아니면 mock데이터에서 지정? */}
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

      {/* ══════════════════════════════
          2. 할인 정책 목록 (discount_policy)
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>할인 정책</h2>
            <p style={sectionDesc}>
              시간대·연령·직업·쿠폰 등 조건별 할인 정책을 관리합니다.
              (condition_type / discount_type 기준)
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/management/policy/form')}
            style={addBtn}
          >
            + 정책 등록
          </button>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>ID</th>
                <th style={th}>정책명</th>
                <th style={{ ...th, textAlign: 'center' }}>조건</th>
                <th style={{ ...th, textAlign: 'center' }}>할인 방식</th>
                <th style={{ ...th, textAlign: 'right' }}>할인 값</th>
                <th style={{ ...th, textAlign: 'center' }}>활성화</th>
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>로딩 중...</td></tr>
              ) : discountPolicies.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>등록된 정책이 없습니다.</td></tr>
              ) : (
              discountPolicies.map((p: DiscountPolicy) => (
                <tr key={p.id} style={tr}>
                  <td style={td}>{p.id}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.policyName}</td>
                  {/* 조건 유형 배지 */}
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ ...typeBadge, ...conditionBadgeStyle(p.conditionType ) }}>
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
                       : `-${p.discountValue?.toLocaleString() || 0} 원`}
                  </td>
                  {/* 활성화 상태 */}
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: p.activation ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                      color: p.activation ? 'var(--color-success-text)' : 'var(--color-error-text)',
                    }}>
                      {p.activation ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      onClick={() => navigate('/admin/management/policy/manage', { state: { policy: p } })}
                      style={rowEditBtn}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════
          3. 적립 정책 (bonus_policy)
      ══════════════════════════════ */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>적립 정책</h2>
            <p style={sectionDesc}>
              결제 금액 대비 자동 적립되는 포인트 비율(%)을 관리합니다.
              (기본 적립, VIP 적립, 이벤트 기간 추가 적립 등)
            </p>
          </div>
          {/* 등록 폼 토글 버튼 */}
          <button
            onClick={() => setShowBonusForm((v) => !v)}
            style={showBonusForm ? cancelBtn : addBtn}
          >
            {showBonusForm ? '취소' : '+ 정책 등록'}
          </button>
        </div>

        {bonusMsg && <div style={saveMsgBox}>✅ {bonusMsg}</div>}

        {/* ── 새 적립 정책 등록 폼 ── */}
        {showBonusForm && (
          <div style={bonusFormWrap}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
              새 적립 정책 등록
            </p>
            <div style={bonusFormGrid}>
              {/* 정책 이름 */}
              <div style={bonusFieldWrap}>
                <label style={bonusFieldLabel}>정책 이름</label>
                <input
                  type="text"
                  placeholder="예: 기본 적립"
                  value={bonusForm.policyName}
                  onChange={(e) => setBonusForm((p) => ({ ...p, policyName: e.target.value }))}
                  style={{ ...priceInput, width: '100%', textAlign: 'left' }}
                />
              </div>
              {/* 적립률 */}
              <div style={bonusFieldWrap}>
                <label style={bonusFieldLabel}>적립률 (%)</label>
                <div style={inputWrap}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={bonusForm.giveValue}
                    onChange={(e) => setBonusForm((p) => ({ ...p, giveValue: Number(e.target.value) }))}
                    style={priceInput}
                  />
                  <span style={unitLabel}>%</span>
                </div>
              </div>
              {/* 시작일 */}
              <div style={bonusFieldWrap}>
                <label style={bonusFieldLabel}>시작일</label>
                <input
                  type="date"
                  value={bonusForm.startAt}
                  onChange={(e) => setBonusForm((p) => ({ ...p, startAt: e.target.value }))}
                  style={{ ...priceInput, width: '130px', textAlign: 'left' }}
                />
              </div>
              {/* 종료일 (선택) */}
              <div style={bonusFieldWrap}>
                <label style={bonusFieldLabel}>종료일 (선택)</label>
                <input
                  type="date"
                  value={bonusForm.endAt ?? ''}
                  min={bonusForm.startAt}
                  onChange={(e) => setBonusForm((p) => ({ ...p, endAt: e.target.value || null }))}
                  style={{ ...priceInput, width: '130px', textAlign: 'left' }}
                />
              </div>
              {/* 활성화 */}
              <div style={{ ...bonusFieldWrap, justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                  <input
                    type="checkbox"
                    checked={bonusForm.activation}
                    onChange={(e) => setBonusForm((p) => ({ ...p, activation: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>즉시 활성화</span>
                </label>
              </div>
            </div>
            <button
              onClick={handleBonusSave}
              disabled={bonusSaving}
              style={{ ...saveBtn, marginTop: 12 }}
            >
              {bonusSaving ? '저장 중...' : '등록'}
            </button>
          </div>
        )}

        {/* ── 적립 정책 테이블 ── */}
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={thead}>
                <th style={th}>ID</th>
                <th style={th}>정책명</th>
                <th style={{ ...th, textAlign: 'right' }}>적립률</th>
                <th style={{ ...th, textAlign: 'center' }}>시작일</th>
                <th style={{ ...th, textAlign: 'center' }}>종료일</th>
                <th style={{ ...th, textAlign: 'center' }}>활성화</th>
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {bonusPolicies.length === 0 ? (
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
                    {/* 적립률: X % 표시 */}
                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-success-main)', fontWeight: 700 }}>
                      {p.giveValue} %
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{p.startAt}</td>
                    {/* end_at null이면 '기간 제한 없음' 표시 */}
                    <td style={{ ...td, textAlign: 'center', fontSize: 13, color: p.endAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {p.endAt ?? '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {/* 활성화 토글 버튼 */}
                      <button
                        onClick={() => toggleBonusActivation(p.id)}
                        style={{
                          padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          background: p.activation ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color: p.activation ? 'var(--color-success-text)' : 'var(--color-error-text)',
                        }}
                      >
                        {p.activation ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => deleteBonusPolicy(p.id)}
                        style={deleteBtn}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

/** 조건 유형별 배지 색상 (가독성 향상) */
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
const typeBar: React.CSSProperties = { height: 4 }
const priceCardInner: React.CSSProperties = { padding: '14px 16px' }
const priceTypeLabel = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }
const priceValue     = { fontSize: 22, fontWeight: 800, margin: '8px 0 0' }
const inputWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }
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
const rowEditBtn: React.CSSProperties = {
  padding: '6px 14px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)',
  border: '1px solid var(--color-info-text)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}
const deleteBtn: React.CSSProperties = {
  padding: '6px 14px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)',
  border: '1px solid var(--color-error-main)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
}

/** 보너스 정책 등록 폼 레이아웃 */
const bonusFormWrap: React.CSSProperties = {
  background: 'var(--bg-base)', borderRadius: 10, padding: '16px 18px',
  marginBottom: 16, border: '1px solid var(--border-default)',
}
const bonusFormGrid: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start',
}
const bonusFieldWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140,
}
const bonusFieldLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2,
}

export default PolicyListPage
