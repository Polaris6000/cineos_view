/**
 * PaymentLogPage.tsx — 전체 결제 로그 조회 (목록)
 *
 * 기능:
 *  1. GET /api/payment/list — 전체 결제내역 조회
 *  2. 상태별 필터링 (PAY / RETURN / FAIL)
 *  3. 영화명·전화번호·예매번호 클라이언트 검색
 *  4. 상세 버튼 클릭 → /admin/management/payment-log/:id 상세 페이지로 이동
 *     (이전: 모달 → 변경: 별도 페이지)
 */
import { useState, useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../../api/apiClient'
import { PaymentDTO } from '../../../api/typeData'

/** 상태 배지 */
function StatusBadge({ status }: { status: string }) {
  const cfg = {
    PAY:    { bg: 'var(--color-info-bg)',    color: 'var(--color-info-text)',    label: '결제완료' },
    RETURN: { bg: 'var(--color-success-bg)', color: 'var(--color-success-main)', label: '환불완료' },
    FAIL:   { bg: 'var(--color-error-bg)',   color: 'var(--color-error-text)',   label: '결제실패' },
  }[status] ?? { bg: '#eee', color: '#666', label: status }

  return (
    /* className="badge" → global.css .badge { white-space: nowrap } 적용 */
    <span className="badge" style={{
      padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

type FilterStatus = 'ALL' | 'PAY' | 'RETURN' | 'FAIL'

function PaymentLogPage() {
  const navigate = useNavigate()

  /* ── 페이지네이션 상태 ── */
  const [currentPage,  setCurrentPage]  = useState(1)   // 현재 페이지 (1-based)
  const [totalPages,   setTotalPages]   = useState(1)   // 전체 페이지 수
  const [totalItems,   setTotalItems]   = useState(0)   // 전체 건수

  /* ── 현재 페이지 데이터 ── */
  const [paymentList, setPaymentList] = useState<PaymentDTO[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  /* ── 필터 / 검색 (현재 페이지 내 클라이언트 필터) ── */
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [keyword,      setKeyword]      = useState('')

  /**
   * 결제내역 페이지 조회 — GET /api/payment/list?page={page}
   * 백엔드가 Page<PaymentDetailsDTO> 형태로 반환
   * (content / totalPages / totalElements 필드 포함)
   */
  const loadList = async (page: number) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/payment/list', { params: { page } })

      // Page<T> 응답 구조 파싱
      const content: PaymentDTO[]  = data.content       ?? []
      const tp:      number        = data.totalPages     ?? 1
      const te:      number        = data.totalElements  ?? 0

      // 현재 페이지 내 최신순 정렬
      content.sort((a, b) => (b.createAt ?? '').localeCompare(a.createAt ?? ''))

      setPaymentList(content)
      setTotalPages(tp)
      setTotalItems(te)
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setError('백엔드에 GET /api/payment/list 엔드포인트가 없습니다.')
      } else {
        setError('결제내역을 불러오지 못했습니다.')
      }
      console.error('결제 로그 로드 실패:', e)
    }
    setLoading(false)
  }

  // 페이지 변경 시 재조회
  useEffect(() => { loadList(currentPage) }, [currentPage])

  /** 필터 + 검색 적용 */
  const filtered = useMemo(() => {
    return paymentList.filter((p) => {
      // 상태 필터
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false
      // 키워드 검색 (영화명·전화번호·예매번호)
      if (keyword) {
        const kw         = keyword.toLowerCase()
        const movieTitle = (p.reservation?.schedule?.movie?.title ?? '').toLowerCase()
        const phone      = (p.reservation?.phone?.phone ?? '').toLowerCase()
        if (!movieTitle.includes(kw) && !phone.includes(kw) && !p.id.toLowerCase().includes(kw)) return false
      }
      return true
    })
  }, [paymentList, filterStatus, keyword])

  /* ── 집계 통계 (현재 페이지 기준) ── */
  const payCount    = paymentList.filter((p) => p.status === 'PAY').length
  const returnCount = paymentList.filter((p) => p.status === 'RETURN').length
  const totalSales  = paymentList
    .filter((p) => p.status === 'PAY')
    .reduce((s, p) => s + (p.cost ?? 0), 0)

  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={pageTitle}>전체 결제 로그</h2>

      {/* ── 집계 카드 ── */}
      <div style={statsRow}>
        {[
          { label: '전체 결제 (누적)',  value: totalItems  + '건', color: 'var(--text-primary)'          },
          { label: '결제완료 (현재 페이지)',      value: payCount    + '건', color: 'var(--color-info-text)'        },
          { label: '환불완료 (현재 페이지)',      value: returnCount + '건', color: 'var(--color-success-main)'     },
          { label: '결제금액 합계 (현재 페이지)', value: totalSales.toLocaleString() + '원', color: 'var(--color-brand-default)' },
        ].map((s) => (
          <div key={s.label} style={statCard}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── 필터 + 검색 + 새로고침 ── */}
      <div style={toolbar}>
        {/* 상태 필터 탭 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'PAY', 'RETURN', 'FAIL'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                ...filterTab,
                background: filterStatus === s ? 'var(--color-brand-default)' : 'var(--bg-base)',
                color:      filterStatus === s ? 'var(--btn-primary-text)'    : 'var(--text-secondary)',
              }}
            >
              {{ ALL: '전체', PAY: '결제완료', RETURN: '환불', FAIL: '실패' }[s]}
            </button>
          ))}
        </div>

        {/* 키워드 검색 */}
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="영화명 · 전화번호 · 예매번호 검색"
          style={searchInput}
        />

        {/* 새로고침 — 현재 페이지 재조회 */}
        <button onClick={() => loadList(currentPage)} disabled={loading} style={refreshBtn}>
          <RefreshCw size={14} style={{ marginRight: 4 }} />
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* ── 에러 ── */}
      {error && <div style={errorBox}>{error}</div>}

      {/* ── 페이지네이션 (상단) ── */}
      {!loading && totalPages > 1 && (
        <div style={paginationWrap}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ ...pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          {/* 페이지 번호: 최대 5개 슬라이딩 윈도우 표시 */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n >= Math.max(1, currentPage - 2) && n <= Math.min(totalPages, currentPage + 2))
            .map(n => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                style={{
                  ...pageNumBtn,
                  background: currentPage === n ? 'var(--color-brand-default)' : 'transparent',
                  color:      currentPage === n ? '#fff' : 'var(--text-secondary)',
                  border:     currentPage === n ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {n}
              </button>
            ))
          }
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ ...pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      )}

      {/* ── 로딩 ── */}
      {loading && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
          불러오는 중...
        </p>
      )}

      {/* ── 테이블 ── */}
      {!loading && !error && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {filtered.length}건 표시 / 현재 페이지 {paymentList.length}건 · 전체 {totalItems}건 ({currentPage}/{totalPages} 페이지)
          </p>
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  {['예매번호', '영화명', '고객전화', '결제금액', '포인트사용', '상태', '결제일시', '상세'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      조건에 맞는 결제내역이 없습니다.
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} style={trStyle}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }} title={p.id}>
                        {p.id.length > 14 ? p.id.slice(0, 14) + '…' : p.id}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.reservation?.schedule?.movie?.title ?? '-'}</td>
                    <td style={tdStyle}>{p.reservation?.phone?.phone ?? '-'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {(p.cost ?? 0).toLocaleString()}원
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      {p.usePoint ? p.usePoint.toLocaleString() + 'P' : '-'}
                    </td>
                    <td style={tdStyle}><StatusBadge status={p.status} /></td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>
                      {p.createAt ? p.createAt.replace('T', ' ').slice(0, 16) : '-'}
                    </td>
                    <td style={tdStyle}>
                      {/*
                        상세 버튼: 클릭 시 /admin/management/payment-log/:id 로 이동
                        이전에는 모달 openDetail(p.id) 호출이었으나 별도 페이지로 분리
                      */}
                      <button
                        onClick={() => navigate(`/admin/management/payment-log/${p.id}`)}
                        style={detailBtn}
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── 스타일 ── */
const pageTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20,
}
const statsRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
}
const statCard: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 10, padding: '14px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const toolbar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const,
}
const filterTab: React.CSSProperties = {
  padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 6,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const searchInput: React.CSSProperties = {
  flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)',
  outline: 'none',
}
const refreshBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '7px 12px',
  background: 'var(--bg-base)', border: '1px solid var(--border-default)',
  borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  cursor: 'pointer', whiteSpace: 'nowrap' as const,
}
const errorBox: React.CSSProperties = {
  padding: '14px 18px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-text)',
  borderRadius: 8, color: 'var(--color-error-text)', fontSize: 13, marginBottom: 12,
  whiteSpace: 'pre-wrap' as const,
}
const tableWrapper: React.CSSProperties = {
  overflowX: 'auto' as const, background: 'var(--bg-surface)',
  borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const table: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
}
const thStyle: React.CSSProperties = {
  padding: '10px 12px', background: 'var(--bg-base)', color: 'var(--text-secondary)',
  fontWeight: 700, fontSize: 12, textAlign: 'left' as const,
  borderBottom: '2px solid var(--border-default)', position: 'sticky' as const, top: 0,
}
const trStyle: React.CSSProperties = { borderBottom: '1px solid var(--border-default)' }
const tdStyle: React.CSSProperties = {
  padding: '9px 12px', color: 'var(--text-primary)', verticalAlign: 'middle' as const,
}
/* 페이지네이션 */
const paginationWrap: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  gap: 6, marginBottom: 12,
}
const pageBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)',
}
const pageNumBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'all 0.15s',
}
const detailBtn: React.CSSProperties = {
  padding: '5px 12px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 6,
  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

export default PaymentLogPage