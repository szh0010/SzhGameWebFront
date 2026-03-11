import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // ✨ 核心修改：强制 Vite 监听 127.0.0.1
    host: '127.0.0.1', 
    port: 5173,
    // 确保端口固定，方便 Django 跨域白名单识别
    strictPort: true, 
    
    proxy: {
      // 1. 转发普通 API 请求
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // 如果你的 Django 接口本身就带有 /api 前缀，则不需要 rewrite
      },
      // 2. 转发 WebSocket 请求
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})