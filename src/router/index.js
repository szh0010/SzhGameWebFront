import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import GameSelectionPage from '../pages/GameSelectionPage.vue'
import RoomSelectionPage from '../pages/RoomSelectionPage.vue'
import GamePage from '../pages/GamePage.vue'
import StickyBoard from '../pages/StickyBoard.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import FriendsPage from '../pages/FriendsPage.vue'
// 1. 导入新创建的聊天页面
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
    name: 'StickyBoard',
    component: StickyBoard,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/friends',
    name: 'Friends',
    component: FriendsPage,
    meta: { requiresAuth: true }
  },
  // 2. 新增：私聊房间路由
  // :friendId 是一个动态参数，代表好友的唯一 UID
  {
    path: '/chat/:friendId',
    name: 'Chat',
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
 * 确保未登录用户无法访问带 meta.requiresAuth 的页面
 */
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('username')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router