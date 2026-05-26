import {defineConfig, type Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import {posterUploadPlugin} from './server/posterUploadPlugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), posterUploadPlugin() as Plugin],
  server: {
    proxy: {
      // /api 로 시작하는 요청 → Spring Boot 백엔드(8080)로 프록시
      // 개발 중 CORS 없이 API 호출 가능
      '/api': {
        target: 'http://cineos-server.duckdns.org:8080/',
        changeOrigin: true,
      },
      // WebSocket 프록시 (좌석 실시간 동기화 STOMP/SockJS)
      '/ws': {
        target: 'http://cineos-server.duckdns.org:8080/',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
