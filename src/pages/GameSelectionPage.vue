<template>
  <div class="game-selection-wrapper">
    <div class="header">
      <h2>选择功能</h2>
      <div class="user-info">
        <span>欢迎, {{ username }}</span>
        <button @click="logout" class="btn-logout">退出登录</button>
      </div>
    </div>

    <div class="games-container">
      <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="selectGame(game)"
      >
        <div class="game-icon">{{ game.icon }}</div>
        <h3>{{ game.name }}</h3>
        <p>{{ game.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')

onMounted(() => {
  username.value = localStorage.getItem('username') || '游客'
})

const games = ref([
  {
    id: 'gomoku',
    name: '五子棋',
    description: '经典五子棋对战游戏',
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

const selectGame = (game) => {
  // 根据不同的 id 跳转到对应的 Vue 路由
  if (game.id === 'board') {
    // 跳转到我们在 router/index.js 中定义的 'StickyBoard'
    router.push('/board')
  } else {
    // 跳转到游戏房间选择
    router.push({
      name: 'room-selection',
      params: { gameId: game.id }
    })
  }
}

const logout = () => {
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.game-selection-wrapper {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 40px 20px;
  font-family: 'Microsoft YaHei', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  margin: 0 auto 40px;
  color: #333;
}

.header h2 {
  margin: 0;
  font-size: 28px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-logout {
  padding: 8px 16px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-logout:hover {
  background: #ff7875;
}

.games-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 25px;
  max-width: 800px;
  margin: 0 auto;
}

.game-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
  border: 1px solid transparent;
}

.game-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  border-color: #1890ff;
}

.game-icon {
  font-size: 56px;
  margin-bottom: 20px;
}

.game-card h3 {
  margin: 0 0 10px 0;
  font-size: 22px;
  color: #1f1f1f;
}

.game-card p {
  margin: 0;
  color: #8c8c8c;
  font-size: 15px;
  line-height: 1.5;
}
</style>