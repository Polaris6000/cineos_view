import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 빌드 결과물을 Spring Boot static 폴더로 직접 출력
    // → npm run build 실행 시 ../src/main/resources/static 에 파일 생성
    // → Spring Boot가 classpath:/static/ 에서 자동으로 서빙
    outDir: '../src/main/resources/static',
    emptyOutDir: true, // 빌드 전 기존 파일 제거 (구 Thymeleaf 정적 파일 덮어씀)
  },
  server: {
    port: 3000, // 개발 서버 포트
    proxy: {
      // /api 로 시작하는 요청 → Spring Boot 백엔드(8080)로 프록시
      // 개발 중 CORS 없이 API 호출 가능
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket 프록시 (좌석 실시간 동기화 STOMP/SockJS)
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
