import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import GameSelectionPage from '../pages/GameSelectionPage.vue'
import RoomSelectionPage from '../pages/RoomSelectionPage.vue'
import GamePage from '../pages/GamePage.vue'
import StickyBoard from '../pages/StickyBoard.vue'
import ProfilePage from '../pages/ProfilePage.vue'
// 1. 导入新创建的好友页面
import FriendsPage from '../pages/FriendsPage.vue'

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
  // 2. 新增：好友中心路由
  {
    path: '/friends',
    name: 'Friends',
    component: FriendsPage,
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
  const isLoggedIn = localStorage.getItem('username')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router