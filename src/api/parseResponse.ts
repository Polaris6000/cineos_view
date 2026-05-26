/**
 * 빈 본문·비 JSON 응답 파싱 오류 방지 (백엔드 ResponseEntity<Void> 등)
 */
export async function parseJsonResponse<T extends object = object>(
    res: Response,
): Promise<T> {
    const text = await res.text()
    if (!text.trim()) {
        return {} as T
    }
    try {
        return JSON.parse(text) as T
    } catch {
        throw new Error(
            `서버 응답을 JSON으로 해석할 수 없습니다 (HTTP ${res.status}).`,
        )
    }
}

/** axios transformResponse — 본문 없는 200 OK 허용 */
export function axiosParseResponse(data: unknown): unknown {
    if (data === '' || data == null) {
        return null
    }
    if (typeof data === 'object') {
        return data
    }
    try {
        return JSON.parse(data as string)
    } catch {
        return data
    }
}
