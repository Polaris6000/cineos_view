/**
 * 프론트 단독 배포용 (백엔드와 다른 서버)
 * - /api, /ws 요청 → Spring Boot(8080)로 역방향 프록시
 * - 그 외 모든 경로 → dist/index.html (SPA 라우팅)
 */
import express from 'express'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import fs from 'node:fs'
import {createProxyMiddleware} from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT) || 5173

const BACKEND = process.env.BACKEND_URL || 'http://cineos-server.duckdns.org:8080'

const app = express()

// /api 역방향 프록시
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

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`[cineos_view] http://localhost:${port}`)
  console.log(`[backend]     ${BACKEND}`)
})
