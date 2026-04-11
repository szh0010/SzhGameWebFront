import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import GameSelectionPage from '../pages/GameSelectionPage.vue'
import RoomSelectionPage from '../pages/RoomSelectionPage.vue'
import GamePage from '../pages/GamePage.vue'
import StickyBoard from '../pages/StickyBoard.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import FriendsPage from '../pages/FriendsPage.vue'
import ChatPage from '../pages/ChatPage.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage
  },
  {
    path: '/game-selection',
    name: 'game-selection',
    component: GameSelectionPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/room-selection/:gameId',
    name: 'room-selection',
    component: RoomSelectionPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/game/:gameId/:roomId',
    name: 'game',
    component: GamePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/board',
    // ✨ 修改：统一使用小写连字符，匹配 App.vue 中的逻辑
    name: 'sticky-board', 
    component: StickyBoard,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    // ✨ 修改：建议统一规范
    name: 'profile', 
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/friends',
    // ✨ 修改：建议统一规范
    name: 'friends', 
    component: FriendsPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:friendId',
    // ✨ 修改：统一使用小写，确保 BottomNav 能够正确隐藏
    name: 'chat', 
    component: ChatPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 导航守卫
 */
router.beforeEach((to, from, next) => {
  // 小提示：实际项目中用 token 判断会比 username 更安全
  const isLoggedIn = localStorage.getItem('username')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router