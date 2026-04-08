<template>
  <nav class="bottom-nav">
    <router-link to="/game-selection" class="nav-item">
      <span class="icon">🎮</span>
      <span class="label">游戏</span>
    </router-link>

    <router-link to="/friends" class="nav-item">
      <div class="icon-wrapper">
        <span class="icon">👥</span>
        
        <transition name="pop">
          <span 
            v-if="socketTools.hasGlobalFriendNotify.value" 
            class="global-red-dot"
          ></span>
        </transition>

        </div>
      <span class="label">好友</span>
    </router-link>

    <router-link to="/profile" class="nav-item">
      <span class="icon">👤</span>
      <span class="label">我的</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useSocket } from '../store/socket';

// ✨ 获取整个工具对象，不在 setup 里解构具体的变量
// 在模板中通过 socketTools.hasGlobalFriendNotify 访问，响应式最稳固
const socketTools = useSocket();
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #ffffff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #94a3b8;
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
}

.nav-item.router-link-active {
  color: #42b983;
}

/* 专门用于定位红点的容器 */
.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 💡 确保红点不会因为溢出被切掉 */
  overflow: visible; 
}

.icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.label {
  font-size: 11px;
  font-weight: 500;
}

/* ✨ 全局红点样式 */
.global-red-dot {
  position: absolute;
  top: -2px;     /* 图标的正上方 */
  right: -6px;   /* 图标的右侧 */
  width: 10px;
  height: 10px;
  background-color: #ff4d4f;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(255, 77, 79, 0.4);
  z-index: 100;
  pointer-events: none;
  animation: breathe 2s infinite ease-in-out;
}

@keyframes breathe {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 弹出动画 */
.pop-enter-active {
  animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: opacity 0.2s;
  opacity: 0;
}

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>