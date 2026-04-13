<template>
  <div class="room-selection-wrapper">
    <div class="header">
      <button @click="goBack" class="btn-back">← 返回</button>
      <h2>选择房间</h2>
      <button @click="logout" class="btn-logout">退出登录</button>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">加载房间中...</div>

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

        <div class="ai-room-card" @click="showAIModal = true">
          <div class="ai-icon">🤖</div>
          <div class="ai-info">
            <h3>人机对局</h3>
            <p>挑战 DeepSeek 棋圣</p>
          </div>
          <button class="btn-ai">挑战</button>
        </div>

        <div class="create-room-card" @click="createRoom">
          <div class="plus-icon">+</div>
          <p>创建新房间</p>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showAIModal" class="modal-overlay" @click.self="showAIModal = false">
        <div class="ai-config-modal">
          <div class="modal-header">
            <h3>AI 对战配置</h3>
            <button class="close-x" @click="showAIModal = false">×</button>
          </div>
          
          <div class="config-item">
            <label>挑战难度</label>
            <div class="difficulty-options">
              <button 
                v-for="d in ['easy', 'medium', 'hard']" 
                :key="d"
                :class="{ active: aiConfig.difficulty === d }"
                @click="aiConfig.difficulty = d"
              >
                {{ d === 'easy' ? '简单' : d === 'medium' ? '中等' : '棋圣' }}
              </button>
            </div>
          </div>

          <div class="config-item">
            <label>我的棋子 (黑子先手)</label>
            <div class="color-options">
              <button 
                :class="{ active: aiConfig.myColor === 'black' }"
                @click="aiConfig.myColor = 'black'"
              >
                ⚫ 我执黑
              </button>
              <button 
                :class="{ active: aiConfig.myColor === 'white' }"
                @click="aiConfig.myColor = 'white'"
              >
                ⚪ 我执白
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-start-ai" @click="startAIGame">进入对局</button>
          </div>
        </div>
      </div>
    </Transition>
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

// --- ✨ 人机对战相关状态 ---
const showAIModal = ref(false)
const aiConfig = ref({
  difficulty: 'medium',
  myColor: 'black'
})

onMounted(() => {
  fetchRooms()
  refreshInterval = setInterval(fetchRooms, 2000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

const fetchRooms = async () => {
  try {
    const res = await axios.get(`/api/rooms/?game=${gameId.value}`)
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

// --- ✨ 启动人机对战 ---
const startAIGame = () => {
  showAIModal.value = false
  // 使用特殊格式的 roomId，方便在 Game 页面识别为 AI 模式
  const aiRoomId = `ai_${aiConfig.value.difficulty}_${aiConfig.value.myColor}`
  router.push({
    name: 'game',
    params: { 
      gameId: gameId.value, 
      roomId: aiRoomId 
    }
  })
}

const createRoom = async () => {
  const newRoomId = String(Math.floor(Math.random() * 10000))
  const username = localStorage.getItem('username')
  try {
    const res = await axios.post('/api/create-room/', {
      room_id: newRoomId,
      game: gameId.value,
      username: username
    })
    if (res.data.status === 'success') {
      await fetchRooms()
      router.push({
        name: 'game',
        params: { gameId: gameId.value, roomId: newRoomId }
      })
    }
  } catch (err) {
    alert('创建失败：' + (err.response?.data?.message || err.message))
  }
}

const goBack = () => router.push('/game-selection')
const logout = () => {
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<style scoped>
.room-selection-wrapper {
  min-height: 100vh;
  background: #f4f7f9;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 900px;
  margin: 0 auto 30px;
}

.header h2 { font-size: 24px; color: #2c3e50; }

.rooms-container {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 房间卡片通用样式 */
.room-card, .ai-room-card, .create-room-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.room-card:hover, .ai-room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

/* AI 卡片特殊样式 */
.ai-room-card {
  border: 2px solid #e0e7ff;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%);
  display: flex;
  align-items: center;
  gap: 15px;
}

.ai-icon {
  font-size: 36px;
  background: #eef2ff;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.ai-info h3 { margin: 0; font-size: 18px; color: #4f46e5; }
.ai-info p { margin: 5px 0 0; font-size: 13px; color: #6366f1; }
.btn-ai {
  margin-left: auto;
  padding: 6px 12px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
}

/* 创建房间卡片 */
.create-room-card {
  border: 2px dashed #cbd5e1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-config-modal {
  background: white;
  width: 90%;
  max-width: 380px;
  border-radius: 24px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-x { background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }

.config-item { margin-bottom: 20px; }
.config-item label { display: block; margin-bottom: 10px; font-weight: bold; color: #475569; }

.difficulty-options, .color-options {
  display: flex;
  gap: 10px;
}

.difficulty-options button, .color-options button {
  flex: 1;
  padding: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.difficulty-options button.active, .color-options button.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.btn-start-ai {
  width: 100%;
  padding: 14px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>