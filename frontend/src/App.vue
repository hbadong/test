<template>
  <el-container class="app-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <div class="logo-icon">
          <el-icon size="24"><Monitor /></el-icon>
        </div>
        <div class="logo-text">
          <span class="logo-title">AI智能体</span>
          <span class="logo-subtitle">员工系统</span>
        </div>
      </div>
      <el-menu :default-active="activeMenu" router class="sidebar-menu" :collapse="false">
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>数据看板</span>
          <div class="menu-badge"></div>
        </el-menu-item>
        <el-menu-item index="/agents">
          <el-icon><Avatar /></el-icon>
          <span>AI员工管理</span>
        </el-menu-item>
        <el-menu-item index="/workflows">
          <el-icon><Connection /></el-icon>
          <span>工作流编排</span>
        </el-menu-item>
        <el-menu-item index="/contents">
          <el-icon><Document /></el-icon>
          <span>内容中心</span>
        </el-menu-item>
        <el-menu-item index="/leads">
          <el-icon><UserFilled /></el-icon>
          <span>线索管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <div class="version-info">v1.0.0</div>
      </div>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="header-icon" :size="20"><component :is="headerIcon" /></el-icon>
          <h2 class="page-title">{{ currentTitle }}</h2>
        </div>
        <div class="header-right">
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">系统运行中</span>
          </div>
          <el-divider direction="vertical" />
          
          <!-- Notification Bell -->
          <el-popover trigger="click" placement="bottom-end" width="360px" :show-arrow="false">
            <template #reference>
              <div class="notification-bell" @click="fetchNotifications">
                <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
                  <el-icon :size="20"><Bell /></el-icon>
                </el-badge>
              </div>
            </template>
            <div class="notification-panel">
              <div class="notification-panel__header">
                <h4>通知中心</h4>
                <el-button text size="small" @click="markAllRead">全部已读</el-button>
              </div>
              <el-scrollbar height="320px">
                <div v-if="notifications.length === 0" class="notification-empty">
                  <el-empty description="暂无通知" :image-size="60" />
                </div>
                <div v-for="n in notifications" :key="n.id" class="notification-item" :class="{ 'notification-item--unread': !n.read }" @click="markRead(n)">
                  <div class="notification-item__icon" :style="{ background: n.color || '#409eff' }">
                    <el-icon :size="16" color="#fff"><component :is="n.icon || 'InfoFilled'" /></el-icon>
                  </div>
                  <div class="notification-item__content">
                    <div class="notification-item__title">{{ n.title }}</div>
                    <div class="notification-item__desc">{{ n.message }}</div>
                    <div class="notification-item__time">{{ formatNotifTime(n.created_at) }}</div>
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </el-popover>
          
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </el-avatar>
              <span class="username">{{ userInfo?.username || '用户' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
    
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-nav">
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path === '/dashboard' }" @click="$router.push('/dashboard')">
        <el-icon class="mobile-nav__icon"><DataBoard /></el-icon>
        <span>看板</span>
      </button>
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path.startsWith('/agents') }" @click="$router.push('/agents')">
        <el-icon class="mobile-nav__icon"><Avatar /></el-icon>
        <span>员工</span>
      </button>
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path === '/workflows' }" @click="$router.push('/workflows')">
        <el-icon class="mobile-nav__icon"><Connection /></el-icon>
        <span>工作流</span>
      </button>
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path === '/contents' }" @click="$router.push('/contents')">
        <el-icon class="mobile-nav__icon"><Document /></el-icon>
        <span>内容</span>
      </button>
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path === '/leads' }" @click="$router.push('/leads')">
        <el-icon class="mobile-nav__icon"><UserFilled /></el-icon>
        <span>线索</span>
      </button>
      <button class="mobile-nav__item" :class="{ 'mobile-nav__item--active': route.path === '/settings' }" @click="$router.push('/settings')">
        <el-icon class="mobile-nav__icon"><Setting /></el-icon>
        <span>设置</span>
      </button>
    </nav>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, DataBoard, Avatar, Connection, Document, UserFilled, Setting, Bell, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { logout, api } from './api'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

const userInfo = ref<any>(null)
const notifications = ref<any[]>([])
const unreadCount = ref(0)

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try { userInfo.value = JSON.parse(userStr) } catch { /* ignore */ }
  }
  fetchNotifications()
  // Poll for new notifications every 30 seconds
  setInterval(fetchNotifications, 30000)
})

async function fetchNotifications() {
  try {
    // Generate mock notifications
    const mockNotifs = [
      { id: 'n1', title: '任务完成', message: 'AI创作 已成功生成 3 篇文案', icon: 'Check', color: '#67c23a', read: false, created_at: new Date(Date.now() - 300000).toISOString() },
      { id: 'n2', title: '新线索', message: '地图拓客 发现 5 条高意向线索', icon: 'UserFilled', color: '#409eff', read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
      { id: 'n3', title: '任务失败', message: 'AI电销 执行失败: API 超时', icon: 'WarningFilled', color: '#f56c6c', read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'n4', title: '内容发布', message: '3 篇内容已成功发布到抖音、小红书', icon: 'Document', color: '#e6a23c', read: true, created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 'n5', title: '系统提醒', message: '数据库备份已完成', icon: 'Setting', color: '#909399', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    ]
    notifications.value = mockNotifs
    unreadCount.value = mockNotifs.filter(n => !n.read).length
  } catch { /* skip */ }
}

function markRead(n: any) {
  n.read = true
  unreadCount.value = notifications.value.filter(notif => !notif.read).length
}

function markAllRead() {
  notifications.value.forEach(n => n.read = true)
  unreadCount.value = 0
}

function formatNotifTime(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function handleUserCommand(command: string) {
  if (command === 'logout') {
    logout()
  } else if (command === 'profile') {
    router.push('/settings')
  }
}

const iconMap: Record<string, any> = {
  '/dashboard': DataBoard,
  '/agents': Avatar,
  '/workflows': Connection,
  '/contents': Document,
  '/leads': UserFilled,
  '/settings': Setting,
}

const headerIcon = computed(() => {
  if (route.path.startsWith('/agents/')) return Avatar
  return iconMap[route.path] || Monitor
})

const titleMap: Record<string, string> = {
  '/dashboard': '数据看板',
  '/agents': 'AI员工管理',
  '/workflows': '工作流编排',
  '/contents': '内容中心',
  '/leads': '线索管理',
  '/settings': '系统设置',
}

const currentTitle = computed(() => {
  if (route.path.startsWith('/agents/')) return 'Agent 详情'
  return titleMap[route.path] || '首页'
})
</script>

<style>
:root {
  --sidebar-bg: linear-gradient(180deg, #0a1929 0%, #0d2137 100%);
  --sidebar-active: linear-gradient(90deg, rgba(64, 158, 255, 0.15) 0%, transparent 100%);
  --primary-color: #409eff;
  --primary-light: #66b1ff;
  --primary-dark: #337ecc;
  --success-color: #67c23a;
  --success-light: #85ce61;
  --warning-color: #e6a23c;
  --warning-light: #ebb563;
  --danger-color: #f56c6c;
  --danger-light: #f78989;
  --info-color: #909399;
  --bg-color: #f0f2f5;
  --bg-light: #f5f7fa;
  --card-bg: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #4a4a68;
  --text-muted: #8a8aa0;
  --border-color: #e8e8f0;
  --border-light: #f0f0f5;
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 12px 36px rgba(0, 0, 0, 0.12);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  background: var(--bg-color);
  font-size: 14px;
  line-height: 1.6;
}

html {
  font-size: 14px;
  -webkit-tap-highlight-color: transparent;
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.app-container {
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color);
}

/* Sidebar */
.sidebar {
  background: var(--sidebar-bg);
  color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
  position: relative;
  z-index: 10;
  transition: transform var(--transition-normal);
}

.sidebar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(255,255,255,0.06) 100%);
}

.logo {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 24px;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.015);
}

.logo-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
  transition: transform var(--transition-fast);
}

.logo:hover .logo-icon {
  transform: scale(1.05);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
  background: linear-gradient(90deg, #fff, rgba(255,255,255,0.85));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 400;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  background: transparent;
  border-right: none;
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.sidebar-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.65);
  border-radius: var(--radius-sm);
  margin: 6px 0;
  height: 46px;
  line-height: 46px;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  font-size: 14px;
}

.sidebar-menu .el-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-light));
  transform: scaleY(0);
  transition: transform var(--transition-fast);
  border-radius: 0 3px 3px 0;
}

.sidebar-menu .el-menu-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.08), transparent);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.sidebar-menu .el-menu-item:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-menu .el-menu-item:hover::after {
  opacity: 1;
}

.sidebar-menu .el-menu-item.is-active {
  color: #fff;
  background: var(--sidebar-active);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.sidebar-menu .el-menu-item.is-active::before {
  transform: scaleY(1);
}

.sidebar-menu .el-menu-item .el-icon {
  margin-right: 14px;
  font-size: 19px;
  transition: transform var(--transition-fast);
}

.sidebar-menu .el-menu-item:hover .el-icon {
  transform: scale(1.1);
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.version-info {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
}

/* Header */
.header {
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(8px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  color: var(--primary-color);
  padding: 10px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.05));
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.header-icon:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15), rgba(64, 158, 255, 0.08));
  transform: scale(1.05);
}

.page-title {
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
  background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.08), rgba(103, 194, 58, 0.04));
  border-radius: 24px;
  border: 1px solid rgba(103, 194, 58, 0.15);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(103, 194, 58, 0.1); }
}

.status-text {
  font-size: 13px;
  color: var(--success-color);
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.user-info:hover {
  background: var(--bg-light);
}

/* Notification Bell */
.notification-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.notification-bell:hover {
  background: var(--bg-light);
  color: var(--primary-color);
  transform: scale(1.05);
}

/* Notification Panel */
.notification-panel {
  padding: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.notification-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-light);
}

.notification-panel__header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.notification-empty {
  padding: 48px 0;
  text-align: center;
}

.notification-item {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid var(--border-light);
}

.notification-item:hover {
  background: var(--bg-light);
}

.notification-item--unread {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.06), transparent);
  border-left: 3px solid var(--primary-color);
}

.notification-item__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.notification-item__content {
  flex: 1;
  min-width: 0;
}

.notification-item__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.notification-item__desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-item__time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 5px;
}

.user-avatar {
  background: linear-gradient(135deg, var(--primary-color), #7c3aed);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.username {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

/* Main Content */
.main-content {
  background: var(--bg-color);
  padding: 28px;
  overflow-y: auto;
  height: calc(100vh - 64px);
}

/* Override Element Plus styles */
.el-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
  overflow: hidden;
  background: var(--card-bg);
}

.el-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.el-card__header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-light), var(--card-bg));
}

.el-card__body {
  padding: 22px 24px;
}

.el-button {
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: all var(--transition-fast);
  letter-spacing: 0.3px;
}

.el-button--primary {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border: none;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
}

.el-button--primary:hover {
  background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
  transform: translateY(-1px);
}

.el-button--success {
  background: linear-gradient(135deg, var(--success-color), var(--success-light));
  border: none;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.25);
}

.el-button--success:hover {
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.35);
  transform: translateY(-1px);
}

.el-button--warning {
  background: linear-gradient(135deg, var(--warning-color), var(--warning-light));
  border: none;
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.25);
}

.el-button--danger {
  background: linear-gradient(135deg, var(--danger-color), var(--danger-light));
  border: none;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.25);
}

.el-button:hover {
  transform: translateY(-1px);
}

.el-button:active {
  transform: translateY(0);
}

.el-table {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.el-table th {
  background: linear-gradient(180deg, var(--bg-light), #f8f8fb);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border-light);
}

.el-table td {
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-light);
}

.el-table .el-table__row {
  transition: all var(--transition-fast);
}

.el-table .el-table__row:hover > td {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.04), transparent) !important;
}

.el-tag {
  border-radius: 8px;
  font-weight: 600;
  border: none;
  padding: 0 10px;
  letter-spacing: 0.2px;
}

.el-tag--success {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1), rgba(103, 194, 58, 0.05));
  color: var(--success-color);
}

.el-tag--warning {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.1), rgba(230, 162, 60, 0.05));
  color: var(--warning-color);
}

.el-tag--danger {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.1), rgba(245, 108, 108, 0.05));
  color: var(--danger-color);
}

.el-tag--info {
  background: linear-gradient(135deg, rgba(144, 147, 153, 0.1), rgba(144, 147, 153, 0.05));
  color: var(--info-color);
}

.el-tag--default {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.05));
  color: var(--primary-color);
}

.el-dialog {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.el-dialog__header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-light), var(--card-bg));
}

.el-dialog__title {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
}

.el-dialog__body {
  padding: 24px;
}

.el-input__wrapper {
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  box-shadow: 0 0 0 1px var(--border-color) inset;
}

.el-input__wrapper:hover {
  box-shadow: 0 0 0 1px var(--primary-light) inset;
}

.el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px var(--primary-color) inset, 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.el-select .el-input__wrapper {
  border-radius: var(--radius-sm);
}

.el-date-editor .el-input__wrapper {
  border-radius: var(--radius-sm);
}

.el-tabs__item {
  font-weight: 600;
  transition: all var(--transition-fast);
}

.el-tabs__item.is-active {
  color: var(--primary-color);
}

.el-tabs__active-bar {
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  height: 3px;
  border-radius: 2px;
}

.el-pagination {
  font-weight: 600;
}

.el-pagination .el-pager li.is-active {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  color: #fff;
  border-radius: var(--radius-sm);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
  transition: background var(--transition-fast);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Mobile Bottom Navigation */
.mobile-nav {
  display: none;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .app-container {
    flex-direction: column;
  }
  
  .header {
    padding: 0 16px;
    height: 56px;
  }
  
  .status-indicator {
    display: none;
  }
  
  .el-divider--vertical {
    display: none;
  }
  
  .page-title {
    font-size: 16px;
    -webkit-text-fill-color: var(--text-primary);
  }
  
  .header-icon {
    padding: 8px;
  }
  
  .main-content {
    padding: 16px;
    padding-bottom: 72px;
    height: calc(100vh - 56px);
  }
  
  .user-info .username {
    display: none;
  }
  
  .user-info {
    padding: 4px;
  }
  
  .notification-bell {
    width: 34px;
    height: 34px;
  }
  
  /* Mobile Bottom Navigation */
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: linear-gradient(180deg, #fff, rgba(255,255,255,0.98));
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.08);
    z-index: 100;
    justify-content: space-around;
    align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
    backdrop-filter: blur(10px);
    border-top: 1px solid var(--border-light);
  }
  
  .mobile-nav__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 10px;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    border: none;
    background: none;
    min-width: 52px;
    position: relative;
  }
  
  .mobile-nav__item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 24px;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
    border-radius: 2px;
    transition: transform var(--transition-fast);
  }
  
  .mobile-nav__item--active {
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .mobile-nav__item--active::before {
    transform: translateX(-50%) scaleX(1);
  }
  
  .mobile-nav__item:active {
    opacity: 0.7;
    transform: scale(0.95);
  }
  
  .mobile-nav__icon {
    font-size: 24px;
    transition: transform var(--transition-fast);
  }
  
  .mobile-nav__item--active .mobile-nav__icon {
    transform: scale(1.1);
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0 12px;
    height: 52px;
  }
  
  .page-title {
    font-size: 15px;
  }
  
  .main-content {
    padding: 12px;
    padding-bottom: 68px;
  }
  
  .mobile-nav {
    height: 52px;
  }
  
  .mobile-nav__item {
    font-size: 10px;
    padding: 4px 8px;
  }
  
  .mobile-nav__icon {
    font-size: 22px;
  }
}
</style>
