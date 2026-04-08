<template>
  <div class="game-wrapper">
    <div class="sidebar">
      <div class="top-info">
        <h3>控制台</h3>
        
        <div class="room-id-card" @click="copyRoomId" title="点击复制房间号">
          <p class="room-label">当前房间号</p>
          <p class="room-value"># {{ roomId }}</p>
          <span class="copy-hint">点击复制</span>
        </div>

        <div class="players-list-card">
          <div class="player-entry">
            <span class="dot black-dot"></span>
            <span class="role-tag">黑方：</span>
            <span class="name-text">{{ players.black }}</span>
          </div>
          <div class="player-entry">
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
          <p>当前回合：
            <span :class="currentTurn">
              {{ currentTurn === 'black' ? '黑方落子' : '白方落子' }}
            </span>
          </p>
        </div>
      </div>
      
      <div class="bottom-actions">
        <button @click="quitGame" class="btn-quit">退出对局</button>
      </div>
    </div>

    <div class="main-stage">
      <div class="game-title">五子棋对战</div>
      <canvas 
        ref="chessCanvas" 
        width="450" 
        height="450" 
        @click="onCanvasClick"
        :class="{ 'wait-cursor': !isReady || isGameOver }"
      ></canvas>
      
      <div 
        class="status-bar" 
        :class="{ 
          'my-turn': currentTurn === myColor && isReady && !isGameOver, 
          'waiting': !isReady && !isGameOver 
        }"
      >
        {{ statusMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// --- 状态控制 ---
const username = ref(localStorage.getItem('username') || '游客')
const statusMsg = ref('正在建立连接...')
const players = ref({ black: '等待加入...', white: '等待加入...' }) 
const isReady = ref(false) // 核心：后端通知双人就位后才为 true

// --- 游戏逻辑变量 ---
const myColor = ref('')
const currentTurn = ref('black')
const chessCanvas = ref(null)
const isGameOver = ref(false)
let ctx = null
let socket = null

const gameId = route.params.gameId || 'gomoku'
const roomId = route.params.roomId
const preferredRole = route.query.role || '' 

const copyRoomId = () => {
  navigator.clipboard.writeText(roomId).then(() => {
    alert(`房间号 ${roomId} 已复制`)
  })
}

// 初始化游戏并连接 WebSocket
const initGame = async () => {
  await nextTick()
  if (!chessCanvas.value) return
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  isGameOver.value = false

  const hostname = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const backendHost = (hostname === 'localhost' || hostname === '127.0.0.1') 
    ? '127.0.0.1:8000' 
    : window.location.host

  const wsUrl = `${protocol}//${backendHost}/ws/game/${gameId}/${roomId}/?username=${encodeURIComponent(username.value)}&role=${preferredRole}`

  console.log("[Game] 连接 WebSocket:", wsUrl)
  socket = new WebSocket(wsUrl)

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data)

    // 1. 处理初始化和人员进入广播
    if (data.type === 'init') {
      myColor.value = data.color
      players.value.black = data.black_player
      players.value.white = data.white_player
      isReady.value = data.is_ready // ✨ 关键：接收后端发来的就绪指令

      if (data.is_ready) {
        statusMsg.value = currentTurn.value === myColor.value ? "对局开始，请落子！" : "对局开始，等待对手..."
      } else {
        statusMsg.value = "等待对手加入房间..."
      }
    }

    // 2. 接收落子同步
    if (data.type === 'game_move') {
      drawPiece(data.x, data.y, data.color)
      currentTurn.value = data.next_turn
      
      if (data.next_turn === myColor.value) {
        statusMsg.value = "轮到你了！"
      } else {
        statusMsg.value = "对手正在思考..."
      }

      // 胜负判定
      if (data.winner) {
        isGameOver.value = true
        const winnerName = data.winner === 'black' ? players.value.black : players.value.white
        setTimeout(() => {
          alert(`游戏结束！获胜者：${winnerName}`)
          statusMsg.value = `🏁 对局结束 | 获胜方: ${winnerName}`
        }, 100)
      }
    }

    // 3. 接收后端发来的系统通知（如“对手尚未就位”）
    if (data.type === 'info') {
      statusMsg.value = data.message
    }
  }

  socket.onclose = () => {
    statusMsg.value = "🔌 连接已断开"
    isReady.value = false
  }

  socket.onerror = (error) => {
    console.error("[Game] WebSocket Error:", error)
    statusMsg.value = "⚠️ 连接出错"
  }
}

// 绘制棋盘
const drawBoard = () => {
  ctx.strokeStyle = "#8d6e63"
  ctx.lineWidth = 1
  for (let i = 0; i < 15; i++) {
    ctx.beginPath()
    ctx.moveTo(15 + i * 30, 15); ctx.lineTo(15 + i * 30, 435); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(15, 15 + i * 30); ctx.lineTo(435, 15 + i * 30); ctx.stroke()
  }
}

// 绘制棋子
const drawPiece = (x, y, color) => {
  ctx.beginPath()
  ctx.arc(15 + x * 30, 15 + y * 30, 13, 0, 2 * Math.PI)
  const gradient = ctx.createRadialGradient(
    15 + x * 30 + 2, 15 + y * 30 - 2, 8,
    15 + x * 30, 15 + y * 30, 13
  )
  if (color === 'black') {
    gradient.addColorStop(0, "#555"); gradient.addColorStop(1, "#000")
  } else {
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(1, "#d1d1d1")
  }
  ctx.fillStyle = gradient; ctx.fill()
  ctx.strokeStyle = color === 'black' ? '#333' : '#999'; ctx.stroke()
}

// 响应棋盘点击
const onCanvasClick = (e) => {
  if (isGameOver.value) return
  
  // ✨ 拦截：如果双方未就绪，禁止向后端发送落子指令
  if (!isReady.value) {
    statusMsg.value = "⚠️ 请等待对手进入房间后再落子"
    return
  }

  if (currentTurn.value !== myColor.value) {
    statusMsg.value = "❌ 还没轮到你，请稍等"
    return
  }

  const x = Math.round((e.offsetX - 15) / 30)
  const y = Math.round((e.offsetY - 15) / 30)

  if (x < 0 || x >= 15 || y < 0 || y >= 15) return

  // 发送给后端
  socket.send(JSON.stringify({ type: 'move', x, y }))
}

const quitGame = () => {
  if (confirm("确定要退出对局吗？")) {
    if (socket) socket.close()
    router.push('/game-selection')
  }
}

onUnmounted(() => { if (socket) socket.close() })

initGame()
</script>

<style scoped>
.game-wrapper {
  display: flex;
  gap: 30px;
  background: #fdfdfd;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  min-height: 100vh;
  justify-content: center;
  align-items: center;
}

.sidebar {
  width: 240px;
  height: 520px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
}

.top-info h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 2px solid #42b983;
  padding-bottom: 8px;
}

.room-id-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 10px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 15px;
}
.room-label { font-size: 11px; color: #64748b; margin: 0; }
.room-value { font-size: 16px; font-weight: bold; color: #1e293b; margin: 2px 0; }

.players-list-card {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
}
.player-entry { display: flex; align-items: center; margin: 8px 0; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
.black-dot { background: #000; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
.white-dot { background: #fff; border: 1px solid #ccc; }
.name-text { font-size: 13px; font-weight: 600; color: #334155; }

.info-card {
  background: #fff9db;
  padding: 12px;
  border-radius: 8px;
}
.info-card p { margin: 5px 0; font-size: 13px; color: #5c5c5c; }

.black { color: #000; font-weight: bold; }
.white { color: #64748b; font-weight: bold; }

canvas {
  background: #e3c08d;
  border: 5px solid #5d4037;
  border-radius: 4px;
  cursor: crosshair;
}
/* ✨ 核心：未就绪或结束时禁止点击样式 */
.wait-cursor { cursor: not-allowed !important; opacity: 0.8; }

.status-bar {
  margin-top: 20px;
  padding: 10px 30px;
  border-radius: 30px;
  background: #e2e8f0;
  color: #475569;
  font-weight: bold;
  text-align: center;
}
/* 你的回合且已就绪 */
.status-bar.my-turn {
  background: #42b983;
  color: white;
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.4);
}
/* 等待对手就位 */
.status-bar.waiting {
  background: #94a3b8;
  color: white;
}

.btn-quit {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.btn-quit:hover { opacity: 0.9; }
</style>