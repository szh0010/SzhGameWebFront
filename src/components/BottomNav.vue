<template>
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
</template>

<script setup>
import { computed } from 'vue';
// 修正点：这里必须是 'vue-router'
import { useRoute } from 'vue-router'; 

const route = useRoute();

// 判断是否显示导航栏
const showNav = computed(() => {
  const hideOnPages = ['login', 'register'];
  // 确保 route.name 存在且不在隐藏名单中
  return route.name && !hideOnPages.includes(route.name);
});
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #ffffff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #909399;
  flex: 1;
  transition: all 0.3s ease;
}

.nav-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}

.router-link-active {
  color: #42b983; 
  transform: translateY(-2px);
}

@media (min-width: 768px) {
  .bottom-nav {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 15px 15px 0 0;
  }
}
</style>