import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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

export default router
