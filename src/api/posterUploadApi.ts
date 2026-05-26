/**
 * 백엔드 서버에 포스터를 저장한다.
 * TMDB URL은 브라우저에서 File로 변환 후 업로드한다.
 */
import {parseJsonResponse} from './parseResponse'

export interface UploadMoviePosterParams {
  title: string
  /** DB create_at 과 동일 (yyyy-MM-dd) */
  createAt: string
  file?: File
  imageUrl?: string
}

export interface UploadMoviePosterResult {
  posterPath: string
  message?: string
}

/** TMDB 등 외부 URL → File (브라우저에서 다운로드, 15초 타임아웃) */
async function imageUrlToFile(imageUrl: string): Promise<File> {
  const res = await fetch(imageUrl, {
    mode: 'cors',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`포스터 이미지 로드 실패 (HTTP ${res.status})`)
  }
  const blob = await res.blob()
  const ext =
    imageUrl.match(/\.(jpe?g|png|webp|gif)/i)?.[1]?.toLowerCase() ?? 'jpg'
  const mime = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
  return new File([blob], `poster.${ext}`, {type: mime})
}

function wrapFetchError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error('포스터 저장 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    if (msg.includes('fetch') || msg.includes('network')) {
      return new Error('포스터 서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인하세요.')
    }
  }
  if (err instanceof Error) {
    return err
  }
  return new Error('포스터 저장 중 알 수 없는 오류가 발생했습니다.')
}

export async function uploadMoviePoster(
  params: UploadMoviePosterParams,
): Promise<string> {
  // TMDB URL/파일 → 백엔드 저장, 접근 가능한 이미지 경로 반환
  const {title, createAt, file: uploadedFile, imageUrl} = params
  
  let file = uploadedFile
  if (!file && imageUrl) {
    try {
      file = await imageUrlToFile(imageUrl)
    } catch {
      // 브라우저 CORS 등으로 실패 시 백엔드에서 URL 다운로드
      console.warn('[poster] 브라우저 다운로드 실패, 서버에서 TMDB 이미지 저장 시도')
    }
  }
  
  if (!file && !imageUrl) {
    throw new Error('업로드할 포스터 파일 또는 이미지 URL이 없습니다.')
  }
  
  const fd = new FormData()
  fd.append('title', title)
  fd.append('createAt', createAt)
  if (file) {
    fd.append('file', file)
  } else if (imageUrl) {
    fd.append('imageUrl', imageUrl)
  }
  
  let res: Response
  try {
    res = await fetch('/api/admin/movie/poster', {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(60_000),
    })
  } catch (err) {
    throw wrapFetchError(err)
  }
  
  const data = await parseJsonResponse<UploadMoviePosterResult>(res)
  
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('포스터 저장 API를 찾을 수 없습니다. 백엔드 서버 상태를 확인하세요.')
    }
    throw new Error(data.message ?? `포스터 저장 실패 (HTTP ${res.status})`)
  }
  if (!data.posterPath) {
    throw new Error('포스터 경로를 받지 못했습니다.')
  }
  return data.posterPath
}
