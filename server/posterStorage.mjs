import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import Busboy from 'busboy'

/**
 * 프론트 서버 루트(cineos_view) 기준 uploads 디렉터리
 */
export function getUploadsDir(rootDir = process.cwd()) {
    return path.join(rootDir, 'uploads')
}

export function sanitizeTitle(title) {
    const trimmed = (title ?? '').trim()
    if (!trimmed) return 'movie'
    const sanitized = trimmed
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
    return sanitized || 'movie'
}

/** DB create_at 과 동일한 yyyy-MM-dd */
export function normalizeCreateAt(createAt) {
    const value = (createAt ?? '').trim()
    if (value.length >= 10) {
        return value.slice(0, 10)
    }
    const now = new Date()
    return now.toLocaleDateString('en-CA', {timeZone: 'Asia/Seoul'})
}

export function buildBaseFileName(title, createAt) {
    return `${sanitizeTitle(title)}_${normalizeCreateAt(createAt)}`
}

export function extensionFromFilename(filename) {
    if (!filename) return 'jpg'
    const ext = path.extname(filename).replace('.', '').toLowerCase()
    return ext || 'jpg'
}

export function extensionFromUrl(url) {
    try {
        return extensionFromFilename(new URL(url).pathname)
    } catch {
        return 'jpg'
    }
}

/**
 * 중복 시 영화이름_등록시간(1).ext 형식으로 저장 경로 결정
 */
export function resolveUniqueFilePath(uploadsDir, baseName, ext) {
    const first = path.join(uploadsDir, `${baseName}.${ext}`)
    if (!fs.existsSync(first)) {
        return {filePath: first, fileName: `${baseName}.${ext}`}
    }

    let n = 1
    while (true) {
        const fileName = `${baseName}(${n}).${ext}`
        const filePath = path.join(uploadsDir, fileName)
        if (!fs.existsSync(filePath)) {
            return {filePath, fileName}
        }
        n++
    }
}

export async function saveBuffer(uploadsDir, title, createAt, buffer, ext) {
    fs.mkdirSync(uploadsDir, {recursive: true})
    const baseName = buildBaseFileName(title, createAt)
    const {filePath, fileName} = resolveUniqueFilePath(uploadsDir, baseName, ext)
    await fs.promises.writeFile(filePath, buffer)
    return {posterPath: `/uploads/${fileName}`, filePath, fileName} //  DB·API에 저장할 경로
}

const DOWNLOAD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; CinemaKiosk/1.0)',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
}

/**
 * Node fetch 대신 https 모듈 사용 (TMDB 등 외부 이미지 다운로드 안정화)
 */
export function downloadImageBuffer(imageUrl, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            reject(new Error('이미지 URL 리다이렉트가 너무 많습니다.'))
            return
        }

        let parsed
        try {
            parsed = new URL(imageUrl)
        } catch {
            reject(new Error('잘못된 이미지 URL입니다.'))
            return
        }

        const lib = parsed.protocol === 'https:' ? https : http
        const req = lib.get(
            imageUrl,
            {headers: DOWNLOAD_HEADERS, timeout: 30_000},
            (res) => {
                if (
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    const nextUrl = new URL(res.headers.location, imageUrl).href
                    res.resume()
                    downloadImageBuffer(nextUrl, redirectCount + 1)
                        .then(resolve)
                        .catch(reject)
                    return
                }

                if (res.statusCode !== 200) {
                    res.resume()
                    reject(
                        new Error(
                            `포스터 URL 다운로드 실패: HTTP ${res.statusCode}`,
                        ),
                    )
                    return
                }

                const chunks = []
                res.on('data', (chunk) => chunks.push(chunk))
                res.on('end', () => resolve(Buffer.concat(chunks)))
                res.on('error', reject)
            },
        )

        req.on('error', (err) => {
            reject(
                new Error(
                    `포스터 URL 다운로드 실패: ${err.message}`,
                ),
            )
        })
        req.on('timeout', () => {
            req.destroy()
            reject(new Error('포스터 URL 다운로드 시간 초과'))
        })
    })
}

export async function saveFromUrl(uploadsDir, title, createAt, imageUrl) {
    const buffer = await downloadImageBuffer(imageUrl)
    const ext = extensionFromUrl(imageUrl)
    return saveBuffer(uploadsDir, title, createAt, buffer, ext)
}

export function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const fields = {}
        let fileBuffer = null
        let fileName = null
        let fileWriteDone = Promise.resolve()

        const contentType = req.headers['content-type'] ?? ''
        if (!contentType.includes('multipart/form-data')) {
            reject(new Error('multipart/form-data 요청이 아닙니다.'))
            return
        }

        const busboy = Busboy({headers: req.headers})

        busboy.on('file', (name, stream, info) => {
            if (name === 'file') {
                fileName = info.filename
                const chunks = []
                fileWriteDone = new Promise((res, rej) => {
                    stream.on('data', (chunk) => chunks.push(chunk))
                    stream.on('end', () => {
                        fileBuffer = Buffer.concat(chunks)
                        res()
                    })
                    stream.on('error', rej)
                })
            } else {
                stream.resume()
            }
        })

        busboy.on('field', (name, value) => {
            fields[name] = value
        })

        busboy.on('finish', () => {
            fileWriteDone
                .then(() => resolve({fields, fileBuffer, fileName}))
                .catch(reject)
        })

        busboy.on('error', reject)
        req.pipe(busboy)
    })
}

export async function handlePosterUpload(req, uploadsDir) {
    // multipart 수신 → cineos_view/uploads/ 파일 저장
    const {fields, fileBuffer, fileName} = await parseMultipart(req)
    const title = fields.title
    const createAt = fields.createAt
    const imageUrl = fields.imageUrl

    if (!title?.trim()) {
        throw new Error('title은 필수입니다.')
    }

    if (fileBuffer && fileBuffer.length > 0) {
        const ext = extensionFromFilename(fileName)
        return saveBuffer(uploadsDir, title, createAt, fileBuffer, ext)
    }
    if (imageUrl?.startsWith('http')) {
        return saveFromUrl(uploadsDir, title, createAt, imageUrl)
    }
    throw new Error('file 또는 imageUrl이 필요합니다.')
}
