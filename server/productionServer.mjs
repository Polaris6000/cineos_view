/**
 * 프론트 단독 배포용 (백엔드와 다른 서버)
 * - 정적 파일(dist) 서빙
 * - POST /uploads/movie-poster 로 포스터 저장
 * - GET /uploads/** 로 저장 파일 제공
 */
import express from 'express'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import fs from 'node:fs'
import {getUploadsDir, handlePosterUpload} from './posterStorage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const uploadsDir = getUploadsDir(rootDir)
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT) || 3000

fs.mkdirSync(uploadsDir, {recursive: true})

const app = express()

app.post('/uploads/movie-poster', async (req, res) => {
    // 프로덕션: uploads 저장 API
    try {
        const result = await handlePosterUpload(req, uploadsDir)
        res.json({posterPath: result.posterPath})
    } catch (err) {
        res.status(400).json({
            message: err instanceof Error ? err.message : '포스터 저장 실패',
        })
    }
})

app.use('/uploads', express.static(uploadsDir)) // 프로덕션: uploads 정적 서빙

if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get(/^(?!\/uploads).*/, (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'))
    })
}

app.listen(port, () => {
    console.log(`[cineos_view] http://localhost:${port}`)
    console.log(`[uploads] ${uploadsDir}`)
})
