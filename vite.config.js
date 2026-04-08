import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 强制 Vite 监听 127.0.0.1，确保与后端在同一 Localhost 环境下
    host: '127.0.0.1', 
    port: 5173,
    strictPort: true, 
    
    proxy: {
      // 1. 转发普通 API 请求
      // 当你访问 /api/board/my_friends/ 时，Vite 会自动代理到 http://127.0.0.1:8000/api/board/my_friends/
      '/api': {
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        secure: false, // 如果后端是 http 而非 https，建议设为 false
        // 不需要 rewrite，因为你的后端路径本身就带 /api
      },
      
      // 2. 转发 WebSocket 请求 (解决“实时连接已断开”的关键)
      // 注意：前端建立连接时应使用 ws://127.0.0.1:5173/ws/... 而非直接连 8000
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        secure: false,
      }
    }
  }
})