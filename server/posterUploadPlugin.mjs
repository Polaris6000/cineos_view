import fs from 'node:fs'
import path from 'node:path'
import sirv from 'sirv'
import {getUploadsDir, handlePosterUpload} from './posterStorage.mjs'

function sendJson(res, statusCode, body) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
}

function attachPosterRoutes(server, rootDir) {
    const uploadsDir = getUploadsDir(rootDir)
    fs.mkdirSync(uploadsDir, {recursive: true})

    // POST 업로드 — async 미들웨어 대신 Promise 체인 (연결 끊김 방지)
    // POST /uploads/movie-poster (저장 API)
    server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (req.method !== 'POST' || pathname !== '/uploads/movie-poster') {
            return next()
        }

        handlePosterUpload(req, uploadsDir)
            .then((result) => {
                sendJson(res, 200, {posterPath: result.posterPath})
            })
            .catch((err) => {
                const message =
                    err instanceof Error ? err.message : '포스터 저장 실패'
                sendJson(res, 400, {message})
            })
    })

    // GET 정적 파일
    // GET /uploads/** 정적 파일 서빙 (저장된 포스터 읽기)
    server.middlewares.use(
        '/uploads',
        sirv(uploadsDir, {dev: true, etag: true, single: false}),
    )
}

/**
 * Vite dev / preview — 프론트 서버에서 uploads 저장·서빙 (백엔드와 분리)
 */
export function posterUploadPlugin(rootDir = process.cwd()) {
    return {
        name: 'poster-upload',
        enforce: 'pre',
        configureServer(server) {
            attachPosterRoutes(server, rootDir)
        },
        configurePreviewServer(server) {
            attachPosterRoutes(server, rootDir)
        },
    }
}
