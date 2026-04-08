<template>
  <div class="game-selection-wrapper">
    <div class="header">
      <h2>控制面板</h2>
      <div class="user-info">
        <span class="username-tag">👋 欢迎, {{ username }}</span>
        <button @click="logout" class="btn-logout">退出登录</button>
      </div>
    </div>

    <div class="section-title">✨ 核心功能</div>
    <div class="games-container">
      <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="selectGame(game)"
      >
        <div class="game-icon">{{ game.icon }}</div>
        <div class="game-detail">
          <h3>{{ game.name }}</h3>
          <p>{{ game.description }}</p>
        </div>
      </div>
    </div>

    <div class="section-title">👥 好友对战 (在线直连)</div>
    <div class="friends-section">
      <div v-if="friends.length === 0" class="empty-friends">
        暂无好友，去“便签墙”认识些新朋友吧！
      </div>
      
      <div v-else class="friends-grid">
        <div v-for="friend in friends" :key="friend.uid" class="friend-item">
          <div class="friend-avatar">
            {{ friend.nickname?.charAt(0) || friend.username?.charAt(0) }}
            <span :class="['status-dot', getStatus(friend.uid) ? 'online' : 'offline']"></span>
          </div>
          
          <div class="friend-meta">
            <span class="friend-name">{{ friend.nickname || friend.username }}</span>
            <span class="friend-status-text">
              {{ getStatus(friend.uid) ? '正在线上' : '离开地球了' }}
            </span>
          </div>

          <button 
            @click.stop="inviteFriend(friend)" 
            class="btn-invite"
            :disabled="!getStatus(friend.uid)"
          >
            ⚔️ 对战
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
// 引入全局 Socket 状态和连接方法
import { socketStore, useSocket } from '../store/socket'

const router = useRouter()
const { send, connect } = useSocket()
const username = ref('')
const friends = ref([])

// 游戏配置
const games = ref([
  {
    id: 'gomoku',
    name: '五子棋大厅',
    description: '查看所有房间或创建新对局',
    icon: '🎮',
    type: 'game'
  },
  {
    id: 'board',
    name: '毛毡便签墙',
    description: '上传照片，留下你的足迹',
    icon: '📌',
    type: 'feature'
  }
])

// --- 逻辑 1：获取好友状态 ---
// 统一使用 Number(uid) 确保键名匹配
const getStatus = (uid) => {
  return socketStore.isFriendOnline[Number(uid)] || false
}

// --- 逻辑 2：发送对战邀请 ---
const inviteFriend = (friend) => {
  // ✨ 核心修复：直接检查 WebSocket 的物理状态 (1 为 OPEN)
  const isSocketOpen = socketStore.socket && socketStore.socket.readyState === 1;

  if (isSocketOpen) {
    // 发送邀请指令，确保 receiver_id 是数字
    send({
      type: 'game_invite',
      receiver_id: Number(friend.uid),
      game_type: 'gomoku'
    })
    alert(`已向 ${friend.nickname || friend.username} 发起挑战，等待应战...`)
  } else {
    // 如果没连上，尝试静默重连并提示
    console.warn("[Socket] 检测到连接断开，尝试重连...");
    connect();
    alert("实时通讯连接中，请稍等 1 秒后重试");
  }
}

// --- 逻辑 3：初始化数据 ---
const loadData = async () => {
  username.value = localStorage.getItem('username') || '游客'
  try {
    // 获取好友列表
    const res = await axios.get('/api/board/profile/my_friends/')
    friends.value = res.data
    
    // ✨ 初始状态同步
    // 从 API 拿到的初始在线状态写入 store，后续靠 Socket 广播实时更新
    res.data.forEach(f => {
      const uid = Number(f.uid);
      // 只有当 store 中还没存该好友状态时，才初始化（避免覆盖 Socket 的实时状态）
      if (socketStore.isFriendOnline[uid] === undefined) {
        socketStore.isFriendOnline[uid] = f.is_online;
      }
    })
  } catch (err) {
    console.error("加载好友失败:", err)
  }
}

onMounted(() => {
  loadData()
  
  // 如果进入页面时发现没连上，手动补连一次
  if (!socketStore.socket || socketStore.socket.readyState !== 1) {
    connect();
  }
})

const selectGame = (game) => {
  if (game.id === 'board') {
    router.push('/board')
  } else {
    router.push({
      name: 'room-selection',
      params: { gameId: game.id }
    })
  }
}

const logout = () => {
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  localStorage.removeItem('user_id')
  router.push('/login')
}
</script>

<style scoped>
/* 样式部分保持不变 */
.game-selection-wrapper {
  min-height: 100vh;
  background: #f4f7f9;
  padding: 40px 20px;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.username-tag {
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #444;
  margin: 30px 0 15px;
  padding-left: 10px;
  border-left: 4px solid #1890ff;
}

.games-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.game-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  border: 1px solid #eef2f6;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
  border-color: #1890ff;
}

.game-icon { font-size: 40px; }
.game-detail h3 { margin: 0; font-size: 18px; }
.game-detail p { margin: 5px 0 0; color: #8c8c8c; font-size: 14px; }

.friends-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  min-height: 100px;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 15px;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f9fbff;
  border-radius: 12px;
  border: 1px solid #edf2f7;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  position: relative;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-dot.online { background: #52c41a; }
.status-dot.offline { background: #bfbfbf; }

.friend-meta { flex: 1; margin-left: 12px; display: flex; flex-direction: column; }
.friend-name { font-weight: 600; font-size: 14px; }
.friend-status-text { font-size: 12px; color: #999; }

.btn-invite {
  background: #1890ff;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.btn-invite:disabled {
  background: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
}

.btn-invite:not(:disabled):hover {
  background: #40a9ff;
}

.empty-friends {
  text-align: center;
  color: #999;
  padding: 30px;
  font-size: 14px;
}

.btn-logout {
  padding: 8px 16px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>