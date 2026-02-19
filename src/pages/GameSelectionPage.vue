<template>
  <div class="game-selection-wrapper">
    <div class="header">
      <h2>选择游戏</h2>
      <button @click="logout" class="btn-logout">退出登录</button>
    </div>

    <div class="games-container">
      <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="selectGame(game.id)"
      >
        <div class="game-icon">🎮</div>
        <h3>{{ game.name }}</h3>
        <p>{{ game.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const games = ref([
  {
    id: 'gomoku',
    name: '五子棋',
    description: '经典五子棋对战游戏'
  },
  // 后续可以添加更多游戏
  // { id: 'chess', name: '象棋', description: '中国象棋对战' },
  // { id: 'poker', name: '斗地主', description: '斗地主游戏' }
])

const selectGame = (gameId) => {
  router.push({
    name: 'room-selection',
    params: { gameId }
  })
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

.games-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.game-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.game-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.game-card h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.game-card p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
</style>
