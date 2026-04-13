<template>
  <div class="game-wrapper">
    <div class="sidebar">
      <div class="top-info">
        <h3>控制台 {{ isAIMode ? '(人机对战)' : '' }}</h3>
        
        <div class="timer-card" :class="{ 'timer-danger': remainingTime <= 10 && !isGameOver }">
          <p class="timer-label">剩余思考时间</p>
          <p class="timer-value">{{ remainingTime }}s</p>
          <div class="timer-progress">
            <div class="timer-bar" :style="{ width: (remainingTime / 30) * 100 + '%' }"></div>
          </div>
        </div>

        <div class="room-id-card" @click="copyRoomId" :title="isAIMode ? '人机对战无需复制' : '点击复制房间号'">
          <p class="room-label">{{ isAIMode ? '对战模式' : '当前房间号' }}</p>
          <p class="room-value"># {{ isAIMode ? 'DeepSeek 棋圣' : roomId }}</p>
        </div>

        <div class="players-list-card">
          <div class="player-entry" :class="{ 'active-turn': currentTurn === 'black' }">
            <span class="dot black-dot"></span>
            <span class="role-tag">黑方：</span>
            <span class="name-text">{{ players.black }}</span>
          </div>
          <div class="player-entry" :class="{ 'active-turn': currentTurn === 'white' }">
            <span class="dot white-dot"></span>
            <span class="role-tag">白方：</span>
            <span class="name-text">{{ players.white }}</span>
          </div>
        </div>

        <div class="info-card">
          <p>你的身份：
            <span :class="myColor" v-if="myColor">
              {{ myColor === 'black' ? '黑方 (先手)' : '白方 (后手)' }}
            </span>
            <span v-else>分配中...</span>
          </p>
          <p v-if="isAIMode" class="difficulty-tag">
            难度：{{ aiDifficulty === 'hard' ? '棋圣' : aiDifficulty === 'medium' ? '中等' : '简单' }}
          </p>
        </div>
      </div>
      
      <div class="bottom-actions">
        <button @click="quitGame" class="btn-quit">退出对局</button>
      </div>
    </div>

    <div class="main-stage">
      <div class="game-title">五子棋 - {{ isAIMode ? '人机博弈' : '在线对战' }}</div>
      <div class="canvas-container">
        <canvas 
          ref="chessCanvas" 
          width="450" 
          height="450" 
          @click="onCanvasClick"
          :class="{ 'wait-cursor': !isReady || isGameOver || isAISthinking }"
        ></canvas>
        <div v-if="isAISthinking" class="ai-thinking-overlay">AI 正在思考...</div>
        <div v-if="isGameOver" class="game-over-overlay">GAME OVER</div>
      </div>
      
      <div 
        class="status-bar" 
        :class="{ 
          'my-turn': currentTurn === myColor && isReady && !isGameOver, 
          'waiting': !isReady && !isGameOver,
          'danger-turn': remainingTime <= 10 && !isGameOver
        }"
      >
        {{ statusMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// --- 基础状态 ---
const username = ref(localStorage.getItem('username') || '游客')
const statusMsg = ref('正在加载游戏...')
const players = ref({ black: '等待...', white: '等待...' }) 
const isReady = ref(false)
const isGameOver = ref(false)

// --- ✨ 计时器逻辑 ---
const remainingTime = ref(30)
let gameTimer = null

const startTurnTimer = () => {
  stopTurnTimer()
  if (isGameOver.value) return
  
  remainingTime.value = 30
  gameTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      handleTimeoutLoss()
    }
  }, 1000)
}

const stopTurnTimer = () => {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

const handleTimeoutLoss = () => {
  stopTurnTimer()
  isGameOver.value = true
  
  const loser = currentTurn.value === 'black' ? players.value.black : players.value.white
  const winner = currentTurn.value === 'black' ? players.value.white : players.value.black
  
  statusMsg.value = `⏰ 时间到！${loser} 超时判负`
  alert(`⏰ 超时提醒：${loser} 思考时间超过 30 秒，${winner} 获得胜利！`)
}

// --- 模式识别与 AI 增强逻辑 ---
const isAIMode = ref(false)
const aiDifficulty = ref('medium')
const isAISthinking = ref(false)
const invalidMoves = ref([]) 

// --- 棋盘逻辑 ---
const myColor = ref('')
const currentTurn = ref('black')
const chessCanvas = ref(null)
const boardMatrix = ref(Array(15).fill().map(() => Array(15).fill(0))) 
let ctx = null
let socket = null

const gameId = route.params.gameId || 'gomoku'
const roomId = route.params.roomId

onMounted(() => {
  if (roomId.startsWith('ai_')) {
    initAIGame()
  } else {
    initOnlineGame()
  }
})

// --- AI 模式初始化 ---
const initAIGame = async () => {
  isAIMode.value = true
  const parts = roomId.split('_')
  aiDifficulty.value = parts[1] || 'medium'
  myColor.value = parts[2] || 'black'
  isReady.value = true

  if (myColor.value === 'black') {
    players.value.black = username.value
    players.value.white = `DeepSeek (棋圣)`
  } else {
    players.value.white = username.value
    players.value.black = `DeepSeek (棋圣)`
  }

  await nextTick()
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  
  statusMsg.value = myColor.value === 'black' ? "请开始落子" : "等待 AI 先手..."
  startTurnTimer() // ✨ 开始倒计时
  
  if (myColor.value === 'white') {
    handleAIMove()
  }
}

const handleAIMove = async () => {
  if (isGameOver.value) return;
  isAISthinking.value = true;
  // 保持计时器运行，如果 AI 接口 30 秒不返回，AI 也会判负（保证公平）

  try {
    const token = localStorage.getItem('token');
    const cleanBoard = JSON.parse(JSON.stringify(boardMatrix.value));

    const res = await axios.post('/api/board/ai/chat/', {
      type: 'gomoku_move',
      board: cleanBoard,
      difficulty: aiDifficulty.value,
      ai_color: myColor.value === 'black' ? 'white' : 'black',
      forbidden_moves: invalidMoves.value 
    }, {
      headers: { 'Authorization': `Token ${token}` },
      timeout: 28000 // 略小于 30 秒，防止网络延迟导致前端先判定超时
    });

    if (res.data.status === 'success' && res.data.move) {
      const { row, col } = res.data.move;
      if (row >= 0 && row < 15 && col >= 0 && col < 15 && boardMatrix.value[row][col] === 0) {
        invalidMoves.value = []; 
        executeMove(col, row, currentTurn.value);
      } else {
        invalidMoves.value.push({ row, col });
        setTimeout(handleAIMove, 500);
      }
    }
  } catch (err) {
    console.error("AI 接口异常:", err);
  } finally {
    if (invalidMoves.value.length === 0) isAISthinking.value = false;
  }
}

const executeMove = (x, y, color) => {
  if (boardMatrix.value[y][x] !== 0) return false

  boardMatrix.value[y][x] = color === 'black' ? 1 : 2
  drawPiece(x, y, color)
  
  if (checkWin(x, y, color)) {
    stopTurnTimer() // ✨ 停止计时
    isGameOver.value = true
    const winner = color === 'black' ? players.value.black : players.value.white
    statusMsg.value = `🏁 获胜者：${winner}`
    setTimeout(() => alert(`游戏结束！恭喜 ${winner} 获胜！`), 100);
    return true
  }

  currentTurn.value = color === 'black' ? 'white' : 'black'
  startTurnTimer() // ✨ 换人后重新开启 30 秒计时
  
  if (isAIMode.value) {
    if (currentTurn.value !== myColor.value) {
      handleAIMove() 
    } else {
      statusMsg.value = "到你落子了！"
    }
  }
  return true
}

// --- 在线模式逻辑 ---
const initOnlineGame = async () => {
  await nextTick()
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  
  const hostname = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const backendHost = (hostname === 'localhost' || hostname === '127.0.0.1') ? '127.0.0.1:8000' : window.location.host
  const wsUrl = `${protocol}//${backendHost}/ws/game/${gameId}/${roomId}/?username=${encodeURIComponent(username.value)}`

  socket = new WebSocket(wsUrl)
  socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'init') {
      myColor.value = data.color
      players.value.black = data.black_player
      players.value.white = data.white_player
      isReady.value = data.is_ready
      statusMsg.value = data.is_ready ? "对局开始！" : "等待对手..."
      if (isReady.value) startTurnTimer() // ✨ 对局开始启动计时
    }
    if (data.type === 'game_move') {
      drawPiece(data.x, data.y, data.color)
      boardMatrix.value[data.y][data.x] = data.color === 'black' ? 1 : 2
      currentTurn.value = data.next_turn
      if (data.winner) {
        stopTurnTimer()
        isGameOver.value = true
      } else {
        startTurnTimer() // ✨ 对方落子后，开启我的计时
      }
    }
  }
}

// --- 其余逻辑 (checkWin, onCanvasClick, drawBoard, drawPiece等) ---
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

const onCanvasClick = (e) => {
  if (isGameOver.value || isAISthinking.value || !isReady.value) return
  if (currentTurn.value !== myColor.value) return

  const x = Math.round((e.offsetX - 15) / 30)
  const y = Math.round((e.offsetY - 15) / 30)
  if (x < 0 || x >= 15 || y < 0 || y >= 15 || boardMatrix.value[y][x] !== 0) return

  if (isAIMode.value) {
    executeMove(x, y, myColor.value)
  } else {
    socket.send(JSON.stringify({ type: 'move', x, y }))
  }
}

const drawBoard = () => {
  ctx.strokeStyle = "#8d6e63"
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

const copyRoomId = () => {
  if (isAIMode.value) return
  navigator.clipboard.writeText(roomId).then(() => alert(`房间号已复制`))
}

const quitGame = () => {
  if (confirm("确定要退出对局吗？")) {
    stopTurnTimer()
    if (socket) socket.close()
    router.push('/game-selection')
  }
}

onUnmounted(() => { 
  stopTurnTimer()
  if (socket) socket.close() 
})
</script>

<style scoped>
/* ✨ 计时器专属样式 */
.timer-card {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  margin-bottom: 20px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}
.timer-danger {
  border-color: #ef4444;
  background: #fef2f2;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
.timer-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.timer-value { font-size: 32px; font-weight: 800; color: #1e293b; font-family: 'Courier New', Courier, monospace; }
.timer-danger .timer-value { color: #ef4444; }

.timer-progress {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  margin-top: 10px;
  overflow: hidden;
}
.timer-bar {
  height: 100%;
  background: #3b82f6;
  transition: width 1s linear;
}
.timer-danger .timer-bar { background: #ef4444; }

/* 侧边栏与玩家信息 */
.active-turn {
  background: #dcfce7 !important;
  border: 1px solid #22c55e;
}

.game-wrapper {
  display: flex; gap: 30px; background: #fdfdfd; padding: 30px;
  min-height: 100vh; justify-content: center; align-items: center;
}
.sidebar {
  width: 240px; height: 580px; display: flex; flex-direction: column;
  justify-content: space-between; background: #fff; padding: 20px;
  border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
.players-list-card { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px; }
.player-entry { display: flex; align-items: center; margin: 4px 0; padding: 8px; border-radius: 6px; transition: background 0.3s; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
.black-dot { background: #000; } .white-dot { background: #fff; border: 1px solid #ccc; }

.main-stage { display: flex; flex-direction: column; align-items: center; }
.canvas-container { position: relative; }
.game-over-overlay {
  position: absolute; top:0; left:0; width:100%; height:100%;
  background: rgba(0,0,0,0.6); color: #ff4d4f; font-size: 48px; font-weight: 900;
  display: flex; align-items: center; justify-content: center; border-radius: 4px;
}

canvas { background: #e3c08d; border: 5px solid #5d4037; border-radius: 4px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
.status-bar {
  margin-top: 20px; padding: 12px 40px; border-radius: 30px;
  background: #e2e8f0; color: #475569; text-align: center; font-weight: bold; width: 100%;
}
.status-bar.my-turn { background: #42b983; color: white; }
.danger-turn { border: 2px solid #ef4444; color: #ef4444 !important; }

.btn-quit { background: #ef4444; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
.btn-quit:hover { opacity: 0.8; }
</style>