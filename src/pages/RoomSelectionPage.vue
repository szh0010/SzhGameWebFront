<template>
  <div class="room-selection-wrapper">
    <div class="header">
      <button @click="goBack" class="btn-back">← 返回</button>
      <h2>选择房间</h2>
      <button @click="logout" class="btn-logout">退出登录</button>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">加载房间中...</div>

      <div v-else-if="rooms.length === 0" class="empty-state">
        <p>暂无可用房间</p>
        <button @click="createRoom" class="btn-create">创建房间</button>
      </div>

      <div v-else class="rooms-container">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          :class="{ 'room-full': room.playerCount >= 2 }"
          @click="room.playerCount < 2 ? joinRoom(room.id) : null"
        >
          <div class="room-info">
            <h3>房间 #{{ room.id }}</h3>
            <p class="room-status" :class="{ 'text-danger': room.playerCount >= 2 }">
              玩家：{{ room.playerCount }}/2 {{ room.playerCount >= 2 ? '(满员)' : '' }}
            </p>
            <p class="room-game-status">状态：{{ room.status }}</p>
          </div>
          
          <button 
            :class="room.playerCount >= 2 ? 'btn-full' : 'btn-join'"
            :disabled="room.playerCount >= 2"
          >
            {{ room.playerCount >= 2 ? '已满' : '加入' }}
          </button>
        </div>

        <div class="create-room-card" @click="createRoom">
          <div class="plus-icon">+</div>
          <p>创建新房间</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const rooms = ref([])
const gameId = ref(route.params.gameId || 'gomoku')
let refreshInterval = null

onMounted(() => {
  fetchRooms()
  // 设置定时刷新房间列表（每 2 秒刷新一次）
  refreshInterval = setInterval(fetchRooms, 2000)
})

onUnmounted(() => {
  // 页面卸载时清除定时器
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// --- 修改点 1：获取房间列表使用相对路径 ---
const fetchRooms = async () => {
  try {
    const res = await axios.get(`/api/rooms/?game=${gameId.value}`)
    console.log('获取房间列表:', res.data)
    rooms.value = res.data.rooms
  } catch (err) {
    console.error('获取房间失败:', err)
  }
}

const joinRoom = (roomId) => {
  router.push({
    name: 'game',
    params: { gameId: gameId.value, roomId: String(roomId) }
  })
}

// --- 修改点 2：创建房间使用相对路径 ---
const createRoom = async () => {
  // 生成房间号
  const newRoomId = String(Math.floor(Math.random() * 10000))
  const username = localStorage.getItem('username')
  
  console.log('正在创建房间，roomId:', newRoomId, 'username:', username)

  try {
    // 先调用后端 API 创建房间
    const res = await axios.post('/api/create-room/', {
      room_id: newRoomId,
      game: gameId.value,
      username: username  // 传递当前登录用户的用户名
    })

    console.log('房间创建响应:', res.data)

    if (res.data.status === 'success') {
      console.log('房间创建成功')
      console.log('新房间 ID:', newRoomId)
      
      // 立即刷新一次房间列表
      await fetchRooms()

      // 跳转到游戏页面
      router.push({
        name: 'game',
        params: { gameId: gameId.value, roomId: newRoomId }
      })
    } else {
      alert('创建房间失败：' + (res.data.message || '未知错误'))
    }
  } catch (err) {
    console.error('创建房间失败:', err)
    alert('创建房间失败：' + (err.response?.data?.message || err.message || '网络错误'))
  }
}

const goBack = () => {
  router.push('/game-selection')
}

const logout = () => {
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
/* 样式部分保持不变 */
.room-selection-wrapper {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 20px;
  font-family: 'Microsoft YaHei', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 900px;
  margin: 0 auto 40px;
  gap: 20px;
}

.header h2 {
  margin: 0;
  flex: 1;
  text-align: center;
  font-size: 28px;
  color: #333;
}

.btn-back {
  padding: 10px 15px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover {
  background: #e6e6e6;
}

.btn-logout {
  padding: 10px 20px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-logout:hover {
  opacity: 0.8;
}

.content {
  max-width: 900px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-state p {
  font-size: 18px;
  color: #666;
  margin-bottom: 30px;
}

.btn-create {
  padding: 12px 30px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.btn-create:hover {
  background: #40a9ff;
}

.rooms-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.room-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.room-card.room-full {
  opacity: 0.7;
  cursor: not-allowed;
}

.room-card.room-full:hover {
  transform: none;
}

.room-info h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.room-status {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}

.room-status.text-danger {
  color: #ff4d4f;
  font-weight: bold;
}

.room-game-status {
  margin: 5px 0;
  color: #1890ff;
  font-size: 14px;
}

.btn-join {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.btn-join:hover {
  background: #40a9ff;
}

.btn-full {
  padding: 8px 16px;
  background: #bfbfbf;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: not-allowed;
  font-size: 14px;
  white-space: nowrap;
}

.create-room-card {
  background: white;
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.create-room-card:hover {
  border-color: #1890ff;
  background: #f5f9ff;
}

.plus-icon {
  font-size: 40px;
  color: #1890ff;
  margin-bottom: 10px;
}

.create-room-card p {
  margin: 0;
  color: #1890ff;
  font-size: 16px;
}
</style>