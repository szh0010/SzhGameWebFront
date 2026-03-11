<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2>QIALO</h2>
      <input v-model="form.username" placeholder="请输入用户名" />
      <input v-model="form.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" />
      <button @click="handleLogin" :disabled="loading">{{ loading ? '登录中...' : '进入游戏' }}</button>
      <div class="register-link">
        没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

// 定义后端基础路径
const API_BASE_URL = 'http://127.0.0.1:8000'

const handleLogin = async () => {
  if (!form.username || !form.password) {
    alert('请填写完整信息')
    return
  }

  loading.value = true
  try {
    // 关键：开启凭据 (withCredentials) 以确保 Session 正常工作
    const res = await axios.post(`${API_BASE_URL}/api/login/`, form, {
      withCredentials: true 
    })
    
    if (res.data.status === 'success') {
      // 1. 持久化用户名
      localStorage.setItem('username', res.data.user)
      
      // 2. 核心修改：将后端返回的 5 位靓号 ID (如 10001) 存入本地
      if (res.data.id) {
        localStorage.setItem('user_id', res.data.id)
      }

      alert('欢迎回来，' + res.data.user)
      router.push('/game-selection')
    } else {
      alert('登录失败：' + (res.data.message || '未知错误'))
    }
  } catch (err) {
    // 捕获 401 (密码错误) 或其他后端返回的错误
    const msg = err.response?.data?.message || err.response?.data?.error || '网络连接失败，请检查后端服务'
    alert('登录失败：' + msg)
    console.error('Login error detail:', err.response)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f0f2f5;
  font-family: 'Microsoft YaHei', sans-serif;
}
.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 320px;
}
.login-card h2 { text-align: center; margin: 0 0 20px 0; color: #333; }
.login-card input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.login-card input:focus { outline: none; border-color: #1890ff; box-shadow: 0 0 5px rgba(24, 144, 255, 0.2); }
.login-card button {
  padding: 12px; background: #1890ff; color: white; border: none; border-radius: 6px;
  cursor: pointer; transition: background 0.3s; font-size: 14px;
}
.login-card button:hover { background: #40a9ff; }
.login-card button:disabled { background: #bfbfbf; cursor: not-allowed; }
.register-link { text-align: center; font-size: 14px; color: #666; margin-top: 10px; }
.register-link a { color: #1890ff; text-decoration: none; cursor: pointer; }
.register-link a:hover { text-decoration: underline; }
</style>