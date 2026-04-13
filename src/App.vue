<template>
  <div class="app-container">
    <div :class="['content-wrapper', { 'has-nav-padding': showNavPadding }]">
      <RouterView />
    </div>

    <AIAssistant v-if="showAIAssistant" />

    <BottomNav v-if="hasNav" />

    <Transition name="fade">
      <div v-if="showInviteModal" class="invite-overlay">
        <div class="invite-modal">
          <div class="invite-icon">⚔️</div>
          <h3>对战请求</h3>
          <p>你的好友 <b>{{ inviteData.sender_name }}</b> 向你发起挑战！</p>
          <div class="modal-ops">
            <button class="accept-btn" @click="confirmGame(true)">应战</button>
            <button class="reject-btn" @click="confirmGame(false)">拒绝</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import AIAssistant from './components/AIAssistant.vue';
import { useSocket } from './store/socket'; 

const route = useRoute();
const router = useRouter();
const { connect, send } = useSocket();

const showInviteModal = ref(false);
const inviteData = ref({});

/**
 * 1. 是否显示 BottomNav 组件
 */
const hasNav = computed(() => {
  const hideOnPages = ['login', 'register', 'sticky-board', 'chat'];
  return route.name && !hideOnPages.includes(route.name);
});

/**
 * ✨ 新增：是否显示 AI 助手
 * 逻辑：登录和注册页面不需要显示
 */
const showAIAssistant = computed(() => {
  const hideOnPages = ['login', 'register'];
  return route.name && !hideOnPages.includes(route.name);
});

/**
 * 2. 是否需要为导航栏留出底部占位
 */
const showNavPadding = computed(() => {
  return hasNav.value && route.name !== 'game';
});

// 处理对战响应
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

// 全局 Socket 初始化
const initGlobalSocket = () => {
  const token = localStorage.getItem('token');
  if (token) {
    connect();
  }
};

onMounted(() => {
  initGlobalSocket();

  window.addEventListener('game-request-received', (e) => {
    inviteData.value = e.detail;
    showInviteModal.value = true;
  });

  window.addEventListener('game-start-redirect', (e) => {
    const { roomId, gameId } = e.detail;
    showInviteModal.value = false;
    router.push({
      name: 'game', 
      params: { gameId: gameId || 'gomoku', roomId: String(roomId) }
    });
  });
});

watch(() => route.name, (newName, oldName) => {
  if (oldName === 'login' && newName !== 'login') {
    initGlobalSocket();
  }
});
</script>

<style>
/* --- 全局样式设定 --- */
:root {
  --primary-color: #42b983;
  --nav-height: 65px;
}

body { 
  margin: 0; 
  padding: 0; 
  overscroll-behavior-y: none; 
  background-color: #f5f7fa;
  width: 100%;
  height: 100%;
  color: #2c3e50;
}

.app-container {
  font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  width: 100%;
  position: relative;
}

.has-nav-padding {
  padding-bottom: var(--nav-height);
}

/* --- ⚔️ 对战邀请弹窗样式 --- */
.invite-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.invite-modal {
  background: white;
  width: 85%;
  max-width: 320px;
  padding: 25px;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.invite-icon {
  font-size: 50px;
  margin-bottom: 10px;
  animation: sword-shake 1s infinite alternate ease-in-out;
}

@keyframes sword-shake {
  from { transform: rotate(-5deg); }
  to { transform: rotate(15deg); }
}

.invite-modal h3 { margin: 10px 0; color: #1e293b; }
.invite-modal p { color: #475569; font-size: 15px; margin-bottom: 20px; }
.modal-ops { display: flex; gap: 10px; }

.accept-btn {
  flex: 1.5; background: #42b983; color: white; border: none;
  padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer;
}
.reject-btn {
  flex: 1; background: #f1f5f9; color: #64748b; border: none;
  padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>