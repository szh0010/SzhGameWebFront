<template>
  <div class="app-container">
    <div :class="['content-wrapper', { 'padding-bottom': hasNav }]">
      <RouterView />
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';

const route = useRoute();

// App.vue 只需要知道当前页面是否包含导航，用于调整 padding-bottom
const hasNav = computed(() => {
  const hideOnPages = ['login', 'register'];
  return route.name && !hideOnPages.includes(route.name);
});
</script>

<style>
/* 全局 CSS 变量 */
:root {
  --primary-color: #42b983;
  --nav-height: 60px;
}

body { margin: 0; padding: 0; }

.app-container {
  font-family: 'Microsoft YaHei', -apple-system, sans-serif;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.content-wrapper.padding-bottom {
  padding-bottom: var(--nav-height);
}
</style>