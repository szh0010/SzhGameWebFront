<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2>五子棋联机对战</h2>
      <input v-model="form.username" placeholder="请输入用户名" />
      <input v-model="form.password" type="password" placeholder="请输入密码" />
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

const handleLogin = async () => {
  if (!form.username || !form.password) {
    alert('请填完整')
    return
  }

  loading.value = true
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/login/', form)
    if (res.data.status === 'success') {
      // 将用户名保存到 localStorage，供后续页面使用
      localStorage.setItem('username', res.data.user)
      router.push('/game-selection')
    }
  } catch (err) {
    alert('登录失败：' + (err.response?.data?.message || '网络错误'))
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

.login-card h2 {
  text-align: center;
  margin: 0 0 20px 0;
  color: #333;
}

.login-card input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.login-card input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 5px rgba(24, 144, 255, 0.2);
}

.login-card button {
  padding: 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 14px;
}

.login-card button:hover {
  background: #40a9ff;
}

.login-card button:disabled {
  background: #bfbfbf;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-top: 10px;
}

.register-link a {
  color: #1890ff;
  text-decoration: none;
  cursor: pointer;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>
