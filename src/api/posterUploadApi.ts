import apiClient from './apiClient'
import {axiosParseResponse} from './parseResponse'

export interface UploadMoviePosterParams {
  title: string
  /** DB create_at 과 동일 (yyyy-MM-dd) */
  createAt: string
  file?: File
  imageUrl?: string
}

export async function uploadMoviePoster(
  params: UploadMoviePosterParams,
): Promise<string> {
  const {title, createAt, file, imageUrl} = params

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

  const res = await apiClient.post<{posterPath: string}>('/admin/movie/poster', fd, {
    headers: {'Content-Type': undefined as unknown as string},
    transformResponse: [axiosParseResponse],
  })

  if (!res.data.posterPath) {
    throw new Error('포스터 경로를 받지 못했습니다.')
  }
  return res.data.posterPath
}
