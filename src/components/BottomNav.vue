<template>
  <transition name="fade-slide">
    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/game-selection" class="nav-item">
        <span class="nav-icon">🎮</span>
        <span class="nav-label">游戏</span>
      </router-link>

      <router-link to="/friends" class="nav-item">
        <span class="nav-icon">👥</span>
        <span class="nav-label">好友</span>
      </router-link>

      <router-link to="/profile" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router'; 

const route = useRoute();

// 判断是否显示导航栏
const showNav = computed(() => {
  // ✨ 增加 'chat'，进入聊天室时自动隐藏导航栏，防止挡住输入框
  const hideOnPages = ['login', 'register', 'sticky-board', 'chat']; 
  
  return route.name && !hideOnPages.includes(route.name);
});
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

@media (prefers-color-scheme: dark) {
  .bottom-nav {
    background: rgba(30, 30, 30, 0.8);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #8a8a8e;
  flex: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.nav-icon { font-size: 24px; margin-bottom: 2px; }
.nav-label { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }

.router-link-active { color: #42b983; }
.router-link-active .nav-icon { transform: scale(1.1); filter: drop-shadow(0 0 5px rgba(66, 185, 131, 0.3)); }
.router-link-active::after {
  content: ''; position: absolute; bottom: -4px; width: 4px; height: 4px; background: #42b983; border-radius: 50%;
}

@media (min-width: 768px) {
  .bottom-nav {
    width: auto; min-width: 320px; max-width: 450px; left: 50%; bottom: 20px;
    transform: translateX(-50%); border-radius: 30px; border: 1px solid rgba(0, 0, 0, 0.1);
    height: 60px; padding: 0 20px;
  }
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { transform: translateY(100%); opacity: 0; }
@media (min-width: 768px) {
  .fade-slide-enter-from, .fade-slide-leave-to { transform: translate(-50%, 100%); opacity: 0; }
}
</style>