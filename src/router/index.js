import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import GameSelectionPage from '../pages/GameSelectionPage.vue'
import RoomSelectionPage from '../pages/RoomSelectionPage.vue'
import GamePage from '../pages/GamePage.vue'

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
    path: '/',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫，检查是否已登录
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('username')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
