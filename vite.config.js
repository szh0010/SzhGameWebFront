import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 强制 Vite 监听 127.0.0.1，避免某些环境下解析成 localhost 导致的跨域问题
    host: '127.0.0.1', 
    port: 5173,
    // 确保端口固定，方便 Django 的 CSRF_TRUSTED_ORIGINS 识别
    strictPort: true, 
    
    proxy: {
      // 1. 转发普通 API 请求 (解决 ENOTFOUND base.invalid 错误)
      '/api': {
        // ✨ 核心修复：填入你本地 Django 后端的完整地址
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        // 如果你的 Django 路由本身就包含 /api（如 path('api/login/', ...）），则无需 rewrite
        // 如果后端不带 /api，则需要取消下面这一行的注释：
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
      
      // 2. 转发 WebSocket 请求 (用于五子棋实时对战)
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})