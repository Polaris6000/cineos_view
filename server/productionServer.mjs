/**
 * 프론트 단독 배포용 (백엔드와 다른 서버)
 * - /api, /ws 요청 → Spring Boot(8080)로 역방향 프록시
 * - POST /uploads/movie-poster 포스터 저장
 * - GET  /uploads/**           저장 파일 서빙
 * - 그 외 모든 경로            dist/index.html (SPA 라우팅)
 */
import express from 'express'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import fs from 'node:fs'
import {createProxyMiddleware} from 'http-proxy-middleware'
import {getUploadsDir, handlePosterUpload} from './posterStorage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const uploadsDir = getUploadsDir(rootDir)
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT) || 5173

// 백엔드 주소 — 환경변수로 주입 가능, 없으면 기본값 사용
const BACKEND = process.env.BACKEND_URL || 'http://cineos.duckdns.org:8080'

fs.mkdirSync(uploadsDir, {recursive: true})

const app = express()

// /api 역방향 프록시 — 개발 서버 proxy 설정과 동일한 역할
app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
}))

// /ws WebSocket 역방향 프록시
app.use('/ws', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  ws: true,
}))

app.post('/uploads/movie-poster', async (req, res) => {
  try {
    const result = await handlePosterUpload(req, uploadsDir)
    res.json({posterPath: result.posterPath})
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : '포스터 저장 실패',
    })
  }
})

app.use('/uploads', express.static(uploadsDir))

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA 폴백 — /uploads 제외한 모든 경로에서 index.html 반환
  app.get(/^(?!\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`[cineos_view] http://localhost:${port}`)
  console.log(`[backend]     ${BACKEND}`)
  console.log(`[uploads]     ${uploadsDir}`)
})
