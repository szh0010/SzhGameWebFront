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
    name: 'login', // ✨ 对应 App.vue: 隐藏 Nav & AI
    component: LoginPage
  },
  {
    path: '/register',
    name: 'register', // ✨ 对应 App.vue: 隐藏 Nav & AI
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
    name: 'game', // ✨ 关键：对应 App.vue 逻辑，对局中隐藏 Nav & AI
    component: GamePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/board',
    name: 'sticky-board', // ✨ 对应 App.vue: 留言板隐藏 Nav
    component: StickyBoard,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile', // 显示 Nav
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/friends',
    name: 'friends', // 显示 Nav
    component: FriendsPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:friendId',
    name: 'chat', // ✨ 对应 App.vue: 聊天界面隐藏 Nav
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
 * 导航守卫 - 权限校验
 */
router.beforeEach((to, from, next) => {
  // 老司机提醒：实际生产环境中，校验 localStorage.getItem('token') 会比校验 username 更靠谱
  const isLoggedIn = localStorage.getItem('token') || localStorage.getItem('username')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router