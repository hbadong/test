import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('../views/Agents.vue'),
  },
  {
    path: '/agents/:id',
    name: 'AgentDetail',
    component: () => import('../views/AgentDetail.vue'),
  },
  {
    path: '/workflows',
    name: 'Workflows',
    component: () => import('../views/Workflows.vue'),
  },
  {
    path: '/contents',
    name: 'Contents',
    component: () => import('../views/Contents.vue'),
  },
  {
    path: '/leads',
    name: 'Leads',
    component: () => import('../views/Leads.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫：未登录时跳转登录页
router.beforeEach((to, _from, next) => {
  const publicPaths = ['/login']
  const token = localStorage.getItem('accessToken')

  if (!token && !publicPaths.includes(to.path)) {
    next('/login')
  } else if (token && to.path === '/login') {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
