<template>
  <div class="game-wrapper">
    <div class="hud-top-left" v-if="!isGameOver">
      <div class="mini-card room-id" @click="copyRoomId">
        <span class="label">{{ isAIMode ? '模式' : '房间' }}</span>
        <span class="value">{{ isAIMode ? 'AI 棋圣' : '#' + roomId }}</span>
      </div>
      <div v-if="isAIMode" class="mini-card difficulty">
        {{ aiDifficulty === 'hard' ? '难度: 极难' : '难度: 普通' }}
      </div>
    </div>

    <div class="hud-top-right">
      <div class="timer-circle" :class="{ 'timer-danger': remainingTime <= 10 && !isGameOver }">
        <div class="timer-num">{{ remainingTime }}</div>
        <svg class="timer-svg">
          <circle r="18" cx="20" cy="20" :style="{ strokeDashoffset: 113 - (remainingTime / 30) * 113 }"></circle>
        </svg>
      </div>
    </div>

    <div class="main-stage">
      <div class="board-container">
        <div class="turn-indicator" :class="currentTurn">
          {{ currentTurn === myColor ? '你的回合' : '对方思考中...' }}
        </div>
        
        <canvas 
          ref="chessCanvas" 
          width="450" 
          height="450" 
          @click="onCanvasClick"
          :class="{ 'wait-cursor': !isReady || isGameOver || isAISthinking }"
        ></canvas>

        <div v-if="isAISthinking" class="ai-thinking-overlay">
          <div class="thinking-loader"></div>
          <span>棋圣推演中...</span>
        </div>
        <div v-if="isGameOver" class="game-over-overlay" @click="quitGame">
          <div class="result-box">
            <h2>GAME OVER</h2>
            <p>{{ statusMsg }}</p>
            <button class="btn-back">返回大厅</button>
          </div>
        </div>
      </div>
    </div>

    <div class="hud-bottom">
      <div class="player-hud black" :class="{ 'active': currentTurn === 'black' }">
        <div class="player-avatar">黑</div>
        <div class="player-info">
          <span class="name">{{ players.black }}</span>
          <span class="identity" v-if="myColor === 'black'">(你)</span>
        </div>
      </div>

      <button @click="quitGame" class="btn-exit-mini">退出</button>

      <div class="player-hud white" :class="{ 'active': currentTurn === 'white' }">
        <div class="player-info">
          <span class="identity" v-if="myColor === 'white'">(你)</span>
          <span class="name">{{ players.white }}</span>
        </div>
        <div class="player-avatar">白</div>
      </div>
    </div>

    <div class="desktop-status-msg" v-if="!isGameOver">
      {{ statusMsg }}
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// --- 状态定义 ---
const username = ref(localStorage.getItem('username') || '游客')
const statusMsg = ref('正在连接...')
const players = ref({ black: '等待...', white: '等待...' }) 
const isReady = ref(false)
const isGameOver = ref(false)
const remainingTime = ref(30)
let gameTimer = null

const isAIMode = ref(false)
const aiDifficulty = ref('medium')
const isAISthinking = ref(false)
const invalidMoves = ref([]) 
const myColor = ref('')
const currentTurn = ref('black')
const chessCanvas = ref(null)
const boardMatrix = ref(Array(15).fill().map(() => Array(15).fill(0))) 
let ctx = null
let socket = null

const roomId = route.params.roomId
const gameId = route.params.gameId || 'gomoku'

// --- 计时器逻辑 ---
const startTurnTimer = () => {
  stopTurnTimer()
  if (isGameOver.value) return
  remainingTime.value = 30
  gameTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) handleTimeoutLoss()
  }, 1000)
}

const stopTurnTimer = () => { if (gameTimer) clearInterval(gameTimer) }

const handleTimeoutLoss = () => {
  stopTurnTimer()
  isGameOver.value = true
  const loser = currentTurn.value === 'black' ? players.value.black : players.value.white
  statusMsg.value = `${loser} 超时判负`
  alert(`⏰ 时间到！${loser} 思考超时。`)
}

// --- 初始化 ---
onMounted(() => {
  if (roomId.startsWith('ai_')) {
    initAIGame()
  } else {
    initOnlineGame()
  }
})

const initAIGame = async () => {
  isAIMode.value = true
  const parts = roomId.split('_')
  aiDifficulty.value = parts[1] || 'medium'
  myColor.value = parts[2] || 'black'
  isReady.value = true

  players.value.black = myColor.value === 'black' ? username.value : 'DeepSeek 棋圣'
  players.value.white = myColor.value === 'white' ? username.value : 'DeepSeek 棋圣'

  await nextTick()
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  statusMsg.value = myColor.value === 'black' ? "请落子" : "AI 思考中..."
  startTurnTimer()
  if (myColor.value === 'white') handleAIMove()
}

const handleAIMove = async () => {
  if (isGameOver.value) return
  isAISthinking.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post('/api/board/ai/chat/', {
      type: 'gomoku_move',
      board: boardMatrix.value,
      difficulty: aiDifficulty.value,
      ai_color: myColor.value === 'black' ? 'white' : 'black',
      forbidden_moves: invalidMoves.value 
    }, {
      headers: { 'Authorization': `Token ${token}` },
      timeout: 28000
    })

    if (res.data.status === 'success' && res.data.move) {
      const { row, col } = res.data.move
      if (boardMatrix.value[row][col] === 0) {
        invalidMoves.value = []
        executeMove(col, row, currentTurn.value)
      } else {
        invalidMoves.value.push({ row, col })
        setTimeout(handleAIMove, 500)
      }
    }
  } catch (err) {
    console.error("AI 异常", err)
  } finally {
    isAISthinking.value = false
  }
}

const executeMove = (x, y, color) => {
  if (boardMatrix.value[y][x] !== 0) return false
  boardMatrix.value[y][x] = color === 'black' ? 1 : 2
  drawPiece(x, y, color)
  
  if (checkWin(x, y, color)) {
    stopTurnTimer()
    isGameOver.value = true
    statusMsg.value = `🏁 获胜者：${color === 'black' ? players.value.black : players.value.white}`
    return true
  }

  currentTurn.value = color === 'black' ? 'white' : 'black'
  startTurnTimer()
  if (isAIMode.value && currentTurn.value !== myColor.value) handleAIMove()
  return true
}

const initOnlineGame = async () => {
  await nextTick()
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/game/${gameId}/${roomId}/?username=${encodeURIComponent(username.value)}`

  socket = new WebSocket(wsUrl)
  socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'init') {
      myColor.value = data.color
      players.value.black = data.black_player
      players.value.white = data.white_player
      isReady.value = data.is_ready
      if (isReady.value) startTurnTimer()
    }
    if (data.type === 'game_move') {
      drawPiece(data.x, data.y, data.color)
      boardMatrix.value[data.y][data.x] = data.color === 'black' ? 1 : 2
      currentTurn.value = data.next_turn
      if (data.winner) {
        stopTurnTimer()
        isGameOver.value = true
        statusMsg.value = `获胜者: ${data.winner}`
      } else {
        startTurnTimer()
      }
    }
  }
}

// --- 绘制逻辑 ---
const drawBoard = () => {
  ctx.clearRect(0, 0, 450, 450)
  ctx.strokeStyle = "#5d4037"
  ctx.lineWidth = 1
  for (let i = 0; i < 15; i++) {
    ctx.beginPath(); ctx.moveTo(15 + i * 30, 15); ctx.lineTo(15 + i * 30, 435); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(15, 15 + i * 30); ctx.lineTo(435, 15 + i * 30); ctx.stroke()
  }
}

const drawPiece = (x, y, color) => {
  ctx.beginPath()
  ctx.arc(15 + x * 30, 15 + y * 30, 13, 0, 2 * Math.PI)
  const grad = ctx.createRadialGradient(15+x*30+2, 15+y*30-2, 8, 15+x*30, 15+y*30, 13)
  if (color === 'black') { grad.addColorStop(0, "#555"); grad.addColorStop(1, "#000") }
  else { grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#d1d1d1") }
  ctx.fillStyle = grad; ctx.fill(); ctx.stroke()
}

const onCanvasClick = (e) => {
  if (isGameOver.value || isAISthinking.value || !isReady.value) return
  if (currentTurn.value !== myColor.value) return

  const rect = chessCanvas.value.getBoundingClientRect()
  const scale = 450 / rect.width 
  const clientX = e.clientX || (e.touches && e.touches[0].clientX)
  const clientY = e.clientY || (e.touches && e.touches[0].clientY)
  
  const offsetX = (clientX - rect.left) * scale
  const offsetY = (clientY - rect.top) * scale

  const x = Math.round((offsetX - 15) / 30)
  const y = Math.round((offsetY - 15) / 30)

  if (x < 0 || x >= 15 || y < 0 || y >= 15 || boardMatrix.value[y][x] !== 0) return

  if (isAIMode.value) {
    executeMove(x, y, myColor.value)
  } else {
    socket.send(JSON.stringify({ type: 'move', x, y }))
  }
}

const checkWin = (x, y, color) => {
  const target = color === 'black' ? 1 : 2
  const directions = [[1,0],[0,1],[1,1],[1,-1]]
  for (let [dx, dy] of directions) {
    let count = 1
    let tx = x + dx, ty = y + dy
    while (tx>=0 && tx<15 && ty>=0 && ty<15 && boardMatrix.value[ty][tx] === target) {
      count++; tx += dx; ty += dy
    }
    tx = x - dx; ty = y - dy
    while (tx>=0 && tx<15 && ty>=0 && ty<15 && boardMatrix.value[ty][tx] === target) {
      count++; tx -= dx; ty -= dy
    }
    if (count >= 5) return true
  }
  return false
}

const copyRoomId = () => {
  if (isAIMode.value) return
  navigator.clipboard.writeText(roomId).then(() => alert(`房间号已复制`))
}

const quitGame = () => {
  if (confirm("确定要退出对局吗？")) {
    stopTurnTimer(); if (socket) socket.close()
    router.push('/game-selection')
  }
}

onUnmounted(() => { stopTurnTimer(); if (socket) socket.close() })
</script>

<style scoped>
.game-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #f0f2f5;
  background-image: radial-gradient(#d1d1d1 1px, transparent 1px);
  background-size: 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
}

/* 顶部 HUD */
.hud-top-left {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 5px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 12px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.3);
}

.hud-top-right {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 10;
}

.timer-circle {
  width: 46px;
  height: 46px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  position: relative;
}

.timer-num { font-size: 16px; font-weight: 900; color: #3b82f6; z-index: 2; }
.timer-svg {
  position: absolute;
  width: 40px; height: 40px;
  transform: rotate(-90deg);
}
.timer-svg circle {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 3;
  stroke-dasharray: 113;
  transition: stroke-dashoffset 1s linear;
}

.timer-danger .timer-num { color: #ef4444; }
.timer-danger .timer-svg circle { stroke: #ef4444; }
.timer-danger { animation: pulse 1s infinite; }

/* 棋盘主体 */
.main-stage {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: -40px; /* 整体上移，为底部腾空间 */
}

.board-container {
  position: relative;
  padding: 8px;
  background: #d2b48c;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  border: 4px solid #5d4037;
  max-width: 92vw;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
  max-width: 450px;
  background: #e3c08d;
}

.turn-indicator {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: white;
  padding: 3px 14px;
  border-radius: 15px;
  font-size: 12px;
}

/* 底部 HUD - 已修复遮挡问题 */
.hud-bottom {
  position: absolute;
  bottom: 115px; /* 👈 关键点：上移 115px 避开底部导航栏 */
  width: 95%;
  max-width: 500px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  padding: 0 5px;
  box-sizing: border-box;
}

.player-hud {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.9);
  padding: 6px 12px;
  border-radius: 12px;
  transition: all 0.3s;
  opacity: 0.85;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  min-width: 100px;
}

.player-hud.active {
  opacity: 1;
  background: white;
  transform: scale(1.06); /* 稍微缩小缩放比例，防止挤占空间 */
  box-shadow: 0 4px 15px rgba(66, 185, 131, 0.25);
  border: 2px solid #42b983;
}

.player-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 11px;
  flex-shrink: 0;
}
.black .player-avatar { background: #000; color: white; }
.white .player-avatar { background: #fff; color: #333; border: 1px solid #ddd; }

.player-info { display: flex; flex-direction: column; overflow: hidden; }
.player-info .name { 
  font-size: 13px; font-weight: bold; 
  max-width: 70px; white-space: nowrap; 
  overflow: hidden; text-overflow: ellipsis; 
}
.player-info .identity { font-size: 10px; color: #42b983; line-height: 1; }

.btn-exit-mini {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 7px 15px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(255, 77, 79, 0.2);
}

/* 覆盖层 */
.ai-thinking-overlay {
  position: absolute; top:0; left:0; width:100%; height:100%;
  background: rgba(255,255,255,0.4);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: #5d4037; font-weight: bold; font-size: 14px;
}

.thinking-loader {
  width: 32px; height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.game-over-overlay {
  position: absolute; top:0; left:0; width:100%; height:100%;
  background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.result-box {
  background: white; padding: 25px; border-radius: 16px; text-align: center;
  width: 70%; max-width: 300px;
}

.btn-back {
  margin-top: 15px; background: #42b983; color: white; border: none;
  padding: 8px 25px; border-radius: 25px; font-weight: bold; width: 100%;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

@media (max-width: 380px) {
  .hud-bottom { bottom: 100px; } /* 极窄屏幕稍微下移一点点 */
  .player-info .name { max-width: 55px; }
  .btn-exit-mini { padding: 6px 12px; }
}
</style>