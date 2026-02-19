<template>
  <div class="game-wrapper">
    <div class="sidebar">
      <h3>玩家：{{ username }}</h3>
      <div class="info-card">
        <p>你的身份：<span :class="myColor">{{ myColor === 'black' ? '黑方' : '白方' }}</span></p>
        <p>当前回合：<span :class="currentTurn">{{ currentTurn === 'black' ? '黑方下子' : '白方下子' }}</span></p>
      </div>
      <button @click="quitGame" class="btn-quit">退出对局</button>
    </div>

    <div class="main-stage">
      <canvas ref="chessCanvas" width="450" height="450" @click="onCanvasClick"></canvas>
      <div class="status-bar">{{ statusMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { onUnmounted } from 'vue'

const router = useRouter()
const route = useRoute()

// 状态控制
const username = ref(localStorage.getItem('username') || '')
const statusMsg = ref('等待对手加入...')

// 游戏逻辑变量
const myColor = ref('')
const currentTurn = ref('black')
const chessCanvas = ref(null)
const isGameOver = ref(false)
let ctx = null
let socket = null

const gameId = route.params.gameId
const roomId = route.params.roomId

// 初始化游戏
const initGame = async () => {
  await nextTick()
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  isGameOver.value = false

  // 获取用户名
  const usernameStr = username.value

  // 连接后端 WebSocket，在 URL 中传递用户名
  // socket = new WebSocket(`ws://127.0.0.1:8000/ws/game/${gameId}/${roomId}/?username=${encodeURIComponent(usernameStr)}`)
  // 1. 获取当前页面的主机名 (localhost 或 106.54.198.172)
  const hostname = window.location.hostname;
  // 2. 获取当前页面的协议 (http: 或 https:)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // 3. 智能判定后端地址
  // 如果是本地开发，连接 8000 端口；如果是服务器，直接连接当前 Host (通过 Nginx 转发)
  const backendHost = (hostname === 'localhost' || hostname === '127.0.0.1') 
    ? '127.0.0.1:8000' 
    : window.location.host; 

  const wsUrl = `${protocol}//${backendHost}/ws/game/${gameId}/${roomId}/?username=${encodeURIComponent(usernameStr)}`;

  console.log("正在连接 WebSocket:", wsUrl);
  socket = new WebSocket(wsUrl);
  socket.onmessage = (e) => {
    const data = JSON.parse(e.data)

    // 初始化分配颜色
    if (data.type === 'init') {
      myColor.value = data.color
      statusMsg.value = `连接成功！你是${data.color === 'black' ? '黑棋' : '白棋'}`
    }

    // 接收落子同步
    if (data.type === 'game_move') {
      // 绘制棋子
      drawPiece(data.x, data.y, data.color)

      // 更新回合状态
      currentTurn.value = data.next_turn
      statusMsg.value = currentTurn.value === myColor.value ? "到你的回合了！" : "对手思考中..."

      // 判断是否有胜者
      if (data.winner) {
        isGameOver.value = true
        const winnerText = data.winner === 'black' ? '黑方 (Black)' : '白方 (White)'

        // 延迟弹窗，确保棋子先画出来
        setTimeout(() => {
          alert(`游戏结束！恭喜 ${winnerText} 获得了胜利！`)
          statusMsg.value = `对局结束：${winnerText} 胜`
        }, 100)
      }
    }
  }

  socket.onclose = () => {
    statusMsg.value = "连接已断开"
  }

  socket.onerror = (error) => {
    console.error('WebSocket 错误:', error)
    statusMsg.value = "连接出错"
  }
}

// 绘制函数
const drawBoard = () => {
  ctx.strokeStyle = "#666"
  for (let i = 0; i < 15; i++) {
    ctx.beginPath()
    ctx.moveTo(15 + i * 30, 15)
    ctx.lineTo(15 + i * 30, 435)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(15, 15 + i * 30)
    ctx.lineTo(435, 15 + i * 30)
    ctx.stroke()
  }
}

const drawPiece = (x, y, color) => {
  ctx.beginPath()
  ctx.arc(15 + x * 30, 15 + y * 30, 13, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = color === 'black' ? '#fff' : '#000'
  ctx.stroke()
}

// 点击事件
const onCanvasClick = (e) => {
  // 如果游戏已结束，禁止点击
  if (isGameOver.value) return

  // 检查是否是自己的回合
  if (currentTurn.value !== myColor.value) {
    statusMsg.value = "⚠️ 不是你的回合！"
    return
  }

  const x = Math.floor(e.offsetX / 30)
  const y = Math.floor(e.offsetY / 30)

  // 发送坐标给后端
  socket.send(JSON.stringify({ type: 'move', x, y }))
}

const quitGame = () => {
  if (socket) socket.close()
  router.push('/game-selection')
}

onUnmounted(() => {
  if (socket) {
    socket.close(); // 主动关闭连接，确保后端立即触发 disconnect
  }
})

// 页面挂载时初始化游戏
initGame()
</script>

<style scoped>
.game-wrapper {
  display: flex;
  gap: 30px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-height: 100vh;
  align-items: flex-start;
  font-family: 'Microsoft YaHei', sans-serif;
}

.sidebar {
  width: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.info-card {
  background: #fafafa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  border: 1px solid #eee;
}

.info-card p {
  margin: 10px 0;
  font-size: 14px;
  color: #333;
}

.black {
  color: #000;
  font-weight: bold;
}

.white {
  color: #888;
  text-shadow: 0 0 1px #000;
  font-weight: bold;
}

.main-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
}

canvas {
  background: #f3c38c;
  border: 2px solid #8d6e63;
  cursor: crosshair;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
}

.status-bar {
  margin-top: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  height: 20px;
}

.btn-quit {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
  font-size: 14px;
}

.btn-quit:hover {
  opacity: 0.8;
}
</style>
