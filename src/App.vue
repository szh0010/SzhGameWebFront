<template>
  <div class="app-container">
    <div :class="['content-wrapper', { 'padding-bottom': hasNav }]">
      <RouterView />
    </div>

    <BottomNav v-if="hasNav" />

    <Transition name="fade">
      <div v-if="showInviteModal" class="invite-overlay">
        <div class="invite-modal">
          <div class="invite-icon">⚔️</div>
          <h3>对战请求</h3>
          <p>你的好友 <b>{{ inviteData.sender_name }}</b> 向你发起五子棋挑战！</p>
          <div class="modal-ops">
            <button class="accept-btn" @click="confirmGame(true)">应战</button>
            <button class="reject-btn" @click="confirmGame(false)">算了吧</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BottomNav from './components/BottomNav.vue'; // ✨ 确保文件名与你创建的一致
import { useSocket } from './store/socket'; 

const route = useRoute();
const router = useRouter();
const { connect, send } = useSocket();

// --- 对战邀请相关状态 ---
const showInviteModal = ref(false);
const inviteData = ref({});

/**
 * 1. 判断当前页面是否显示导航栏
 * 只有登录和注册页隐藏，其他社交/游戏页面均显示
 */
const hasNav = computed(() => {
  const hideOnPages = ['login', 'register'];
  // 兼容根据 name 或 path 判断
  return route.name && !hideOnPages.includes(route.name);
});

/**
 * 2. 处理对战响应（发送指令到后端）
 */
const confirmGame = (isAccept) => {
  if (isAccept) {
    send({
      type: 'game_response',
      action: 'accept',
      inviter_id: inviteData.value.sender_id,
      game_type: 'gomoku'
    });
  } else {
    send({
      type: 'game_response',
      action: 'reject',
      inviter_id: inviteData.value.sender_id
    });
  }
  showInviteModal.value = false;
};

/**
 * 3. 全局 Socket 初始化逻辑
 */
const initGlobalSocket = () => {
  const token = localStorage.getItem('token');
  if (token) {
    console.log("[App.vue] 检测到 Token，正在激活全局通讯系统...");
    connect();
  }
};

onMounted(() => {
  // 初始启动
  initGlobalSocket();

  // ✨ 监听：收到游戏挑战
  window.addEventListener('game-request-received', (e) => {
    inviteData.value = e.detail;
    showInviteModal.value = true;
    console.log("[App.vue] 收到挑战通知:", e.detail);
  });

  // ✨ 监听：挑战被接受，双方同步跳转进房间
  window.addEventListener('game-start-redirect', (e) => {
    const { roomId, gameId } = e.detail;
    showInviteModal.value = false;
    console.log(`[App.vue] 正在传送至对局室: ${roomId}`);
    
    router.push({
      name: 'game', 
      params: { 
        gameId: gameId || 'gomoku', 
        roomId: String(roomId) 
      }
    });
  });
});

/**
 * 4. 监听登录状态变化
 * 解决用户在登录页登录成功后，App.vue 需要立即建立连接的问题
 */
watch(() => route.name, (newName, oldName) => {
  if (oldName === 'login' && newName !== 'login') {
    initGlobalSocket();
  }
});
</script>

<style>
/* --- 全局样式变量 --- */
:root {
  --primary-color: #42b983;
  --nav-height: 60px;
}

body { 
  margin: 0; 
  padding: 0; 
  overscroll-behavior-y: none; /* 禁用移动端下拉刷新 */
  background-color: #f5f7fa;
}

.app-container {
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 动态内边距：防止内容被底部导航栏挡住 */
.content-wrapper {
  flex: 1;
  width: 100%;
  max-width: 500px; /* 模拟移动端最佳宽度 */
  margin: 0 auto;
  box-sizing: border-box;
}

.content-wrapper.padding-bottom {
  padding-bottom: calc(var(--nav-height) + 10px);
}

/* --- ⚔️ 对战邀请弹窗样式 --- */
.invite-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.invite-modal {
  background: white;
  width: 280px;
  padding: 30px;
  border-radius: 28px;
  text-align: center;
  box-shadow: 0 15px 40px rgba(0,0,0,0.4);
}

.invite-icon {
  font-size: 56px;
  margin-bottom: 15px;
  display: inline-block;
  animation: sword-shake 1.2s infinite ease-in-out;
}

@keyframes sword-shake {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-10deg) scale(1.1); }
  50% { transform: rotate(10deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
}

.invite-modal h3 { 
  margin: 0 0 12px; 
  color: #2c3e50; 
  font-size: 20px;
}

.invite-modal p { 
  color: #64748b; 
  font-size: 14px; 
  line-height: 1.6;
}

.invite-modal b {
  color: #42b983;
}

.modal-ops {
  display: flex;
  gap: 12px;
  margin-top: 25px;
}

.accept-btn {
  flex: 1.2;
  background: #42b983;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 14px;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.2s;
}

.accept-btn:active { transform: scale(0.95); }

.reject-btn {
  flex: 1;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  padding: 14px;
  border-radius: 14px;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
}

/* 基础过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>