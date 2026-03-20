<template>
  <div class="register-wrapper">
    <div class="register-card">
      <h2>用户注册</h2>
      <input v-model="form.username" placeholder="请输入用户名" />
      <input v-model="form.password" type="password" placeholder="请输入密码" />
      <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" @keyup.enter="handleRegister" />
      <button @click="handleRegister" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
      <div class="login-link">
        已有账号？<router-link to="/login">立即登录</router-link>
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
const form = reactive({ username: '', password: '', confirmPassword: '' })

// 后端基础路径
const API_BASE_URL = ''

const handleRegister = async () => {
  if (!form.username || !form.password || !form.confirmPassword) {
    alert('请填完整')
    return
  }
  if (form.password !== form.confirmPassword) {
    alert('两次密码输入不一致')
    return
  }
  if (form.password.length < 6) {
    alert('密码长度至少为 6 位')
    return
  }

  loading.value = true
  try {
    // 关键修改：使用完整 URL 并开启凭据
    const res = await axios.post(`${API_BASE_URL}/api/register/`, {
      username: form.username,
      password: form.password
    }, {
      withCredentials: true 
    })
    
    // DRF 的 APIView 成功创建资源通常返回 201 状态码
    if (res.status === 201 || res.data.status === 'success') {
      alert('注册成功，请登录您的新账号')
      router.push('/login')
    }
  } catch (err) {
    // 获取后端返回的详细错误（如：用户名已存在）
    const errorDetail = err.response?.data?.error || err.response?.data?.message || '服务器连接异常'
    alert('注册失败：' + errorDetail)
    console.error('Register error detail:', err.response)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-wrapper {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; background: #f0f2f5; font-family: 'Microsoft YaHei', sans-serif;
}
.register-card {
  background: white; padding: 40px; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); display: flex;
  flex-direction: column; gap: 15px; width: 320px;
}
.register-card h2 { text-align: center; margin: 0 0 20px 0; color: #333; }
.register-card input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.register-card input:focus { outline: none; border-color: #1890ff; box-shadow: 0 0 5px rgba(24, 144, 255, 0.2); }
.register-card button {
  padding: 12px; background: #1890ff; color: white; border: none; border-radius: 6px;
  cursor: pointer; transition: background 0.3s; font-size: 14px;
}
.register-card button:hover { background: #40a9ff; }
.register-card button:disabled { background: #bfbfbf; cursor: not-allowed; }
.login-link { text-align: center; font-size: 14px; color: #666; margin-top: 10px; }
.login-link a { color: #1890ff; text-decoration: none; cursor: pointer; }
.login-link a:hover { text-decoration: underline; }
</style>