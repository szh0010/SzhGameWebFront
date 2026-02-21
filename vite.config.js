import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 1. 转发普通 API 请求 (登录、注册、房间列表等)
      '/api': {
        target: 'http://127.0.0.1:8000', // 你的本地 Django 后端地址
        changeOrigin: true,
        // 如果你的 Django 接口本身就带有 /api 前缀，则不需要 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '') 
      },
      // 2. 转发 WebSocket 请求 (对局逻辑)
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})