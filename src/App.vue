<template>
  <div class="app-container">
    <div v-if="!isLoggedIn" class="login-wrapper">
      <div class="login-card">
        <h2>五子棋联机对战</h2>
        <input v-model="loginForm.username" placeholder="请输入用户名" />
        <input v-model="loginForm.password" type="password" placeholder="请输入密码" />
        <button @click="handleLogin" :disabled="loading">{{ loading ? '登录中...' : '进入游戏' }}</button>
      </div>
    </div>

    <div v-else class="game-wrapper">
      <div class="sidebar">
        <h3>玩家：{{ username }}</h3>
        <div class="info-card">
          <p>你的身份：<span :class="myColor">{{ myColor === 'black' ? '黑方' : '白方' }}</span></p>
          <p>当前回合：<span :class="currentTurn">{{ currentTurn === 'black' ? '黑方下子' : '白方下子' }}</span></p>
        </div>
        <button @click="logout" class="btn-quit">退出对局</button>
      </div>

      <div class="main-stage">
        <canvas ref="chessCanvas" width="450" height="450" @click="onCanvasClick"></canvas>
        <div class="status-bar">{{ statusMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import axios from 'axios'

// 状态控制
const isLoggedIn = ref(false)
const loading = ref(false)
const username = ref('')
const loginForm = reactive({ username: '', password: '' })
const statusMsg = ref('等待对手加入...')

// 游戏逻辑变量
const myColor = ref('') // 'black' 或 'white'
const currentTurn = ref('black')
const chessCanvas = ref(null)
const isGameOver = ref(false) // 增加游戏结束状态锁
let ctx = null
let socket = null

// 1. 登录
const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) return alert('请填完整')
  loading.value = true
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/login/', loginForm)
    if (res.data.status === 'success') {
      username.value = res.data.user
      isLoggedIn.value = true
      await nextTick()
      initGame()
    }
  } catch (err) {
    alert('登录失败：' + (err.response?.data?.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

// 2. 初始化游戏
const initGame = () => {
  ctx = chessCanvas.value.getContext('2d')
  drawBoard()
  isGameOver.value = false

  // 连接后端 WebSocket
  socket = new WebSocket(`ws://127.0.0.1:8000/ws/game/room1/`)

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
}

// 3. 绘制函数
const drawBoard = () => {
  ctx.strokeStyle = "#666"
  for (let i = 0; i < 15; i++) {
    ctx.beginPath()
    ctx.moveTo(15 + i * 30, 15); ctx.lineTo(15 + i * 30, 435); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(15, 15 + i * 30); ctx.lineTo(435, 15 + i * 30); ctx.stroke()
  }
}

const drawPiece = (x, y, color) => {
  ctx.beginPath()
  ctx.arc(15 + x * 30, 15 + y * 30, 13, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = color === 'black' ? '#fff' : '#000'
  ctx.stroke() // 给棋子加个边框，白棋更好看
}

// 4. 点击事件
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

const logout = () => {
  if (socket) socket.close()
  isLoggedIn.value = false
}
</script>

<style scoped>
.app-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; font-family: 'Microsoft YaHei', sans-serif; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 15px; width: 320px; }
.login-card input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
.login-card button { padding: 12px; background: #1890ff; color: white; border: none; border-radius: 6px; cursor: pointer; transition: background 0.3s; }
.login-card button:hover { background: #40a9ff; }
.login-card button:disabled { background: #bfbfbf; cursor: not-allowed; }

.game-wrapper { display: flex; gap: 30px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.sidebar { width: 180px; display: flex; flex-direction: column; justify-content: space-between; }
.info-card { background: #fafafa; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee; }
.info-card p { margin: 10px 0; font-size: 14px; }

.black { color: #000; font-weight: bold; }
.white { color: #888; text-shadow: 0 0 1px #000; font-weight: bold; }

canvas { background: #f3c38c; border: 2px solid #8d6e63; cursor: crosshair; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); }
.status-bar { margin-top: 10px; text-align: center; color: #666; font-size: 14px; font-weight: 500; height: 20px; }
.btn-quit { background: #ff4d4f; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; transition: opacity 0.3s; }
.btn-quit:hover { opacity: 0.8; }
</style>