import axios from 'axios'

// 백엔드 DiscountPolicyDTO 응답 중 필요한 필드만 정의
export interface DiscountPolicyDTO {
    id: number
    policyName: string
    discountType: 'RATIO' | 'WON'
    discountValue: number
    conditionType: 'AGE' | 'TIME' | 'JOB' | 'COUPON'
    activation: boolean
}

// SchedulePage / SeatPage에서 공용으로 쓰는 인원 타입 형태
export interface PersonType {
    type: string    // persons 상태의 key (예: 'adult', 'teen', 'senior')
    label: string   // 화면 표시용 한글 이름
    discount: number // 해당 타입의 1인당 할인 금액(원)
}

// DB policyName → 프론트 type key / 표시 label 매핑
// init.sql의 policyName 값과 반드시 일치해야 함
const POLICY_MAPPING: Record<string, { type: string; label: string }> = {
    '청소년 할인': { type: 'teen',   label: '청소년' },
    '경로 할인':   { type: 'senior', label: '경로' },
}

/**
 * GET /api/discount/age
 * AGE 타입 할인 정책을 PersonType[] 형태로 변환해 반환
 * 성인(adult)은 DB에 없으므로 항상 첫 번째로 고정 추가
 */
export async function fetchPersonTypes(): Promise<PersonType[]> {
    const { data } = await axios.get<DiscountPolicyDTO[]>('/api/discount/age')

    const fromDB: PersonType[] = data
        .filter(d => d.discountType === 'WON') // RATIO 타입은 인원 할인에 미지원, WON만 처리
        .map(d => {
            const mapping = POLICY_MAPPING[d.policyName]
            return {
                type:     mapping?.type  ?? d.policyName,
                label:    mapping?.label ?? d.policyName,
                discount: Number(d.discountValue),
            }
        })

    return [{ type: 'adult', label: '성인', discount: 0 }, ...fromDB]
}

/**
 * GET /api/discount/time
 * TIME 타입 중 WON 방식 정책의 1인당 할인액을 반환
 * 현재는 조조 할인(1000원) 단일 정책 기준
 * 해당 정책이 없으면 0 반환
 */
export async function fetchEarlyBirdAmount(): Promise<number> {
    const { data } = await axios.get<DiscountPolicyDTO[]>('/api/discount/time')

    const policy = data.find(d => d.discountType === 'WON')
    return policy ? Number(policy.discountValue) : 0
}

/**
 * 선택된 상영 시작 시간이 조조 할인 기준(오전 10시) 이전인지 판단
 * @param startTime "HH:mm" 형식 문자열 (예: "09:30")
 */
export function isEarlyBirdTime(startTime: string): boolean {
    const [hour] = startTime.split(':').map(Number)
    return hour < 10
}
