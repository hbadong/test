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
import { Monitor, DataBoard, Avatar, Connection, Document, UserFilled, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { logout } from './api'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

const userInfo = ref<any>(null)

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
    } catch { /* ignore */ }
  }
})

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
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --bg-color: #f5f7fa;
  --card-bg: #ffffff;
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-muted: #909399;
  --border-color: #ebeef5;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.4s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  background: var(--bg-color);
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.app-container {
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  background: var(--sidebar-bg);
  color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 10;
}

.sidebar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 20px;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.logo-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

.sidebar-menu {
  background: transparent;
  border-right: none;
  flex: 1;
  padding: 12px 8px;
}

.sidebar-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-sm);
  margin: 4px 0;
  height: 44px;
  line-height: 44px;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.sidebar-menu .el-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary-color);
  transform: scaleY(0);
  transition: transform var(--transition-fast);
  border-radius: 0 2px 2px 0;
}

.sidebar-menu .el-menu-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-menu .el-menu-item.is-active {
  color: #fff;
  background: var(--sidebar-active);
  font-weight: 500;
}

.sidebar-menu .el-menu-item.is-active::before {
  transform: scaleY(1);
}

.sidebar-menu .el-menu-item .el-icon {
  margin-right: 12px;
  font-size: 18px;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
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
  padding: 0 28px;
  height: 64px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--primary-color);
  padding: 8px;
  background: rgba(64, 158, 255, 0.08);
  border-radius: var(--radius-sm);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(103, 194, 58, 0.08);
  border-radius: 20px;
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
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.user-info:hover {
  background: rgba(0, 0, 0, 0.04);
}

.user-avatar {
  background: linear-gradient(135deg, var(--primary-color), #7c3aed);
  color: #fff;
  font-weight: 600;
}

.username {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

/* Main Content */
.main-content {
  background: var(--bg-color);
  padding: 24px;
  overflow-y: auto;
  height: calc(100vh - 64px);
}

/* Override Element Plus styles */
.el-card {
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal);
  overflow: hidden;
}

.el-card:hover {
  box-shadow: var(--shadow-md);
}

.el-card__header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(250, 250, 252, 0.5);
}

.el-card__body {
  padding: 20px 24px;
}

.el-button {
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.el-button:hover {
  transform: translateY(-1px);
}

.el-table {
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.el-table th {
  background: #fafafa;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
}

.el-table td {
  font-size: 14px;
}

.el-table .el-table__row:hover > td {
  background: rgba(64, 158, 255, 0.04) !important;
}

.el-tag {
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

.el-dialog {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.el-input__wrapper {
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.el-input__wrapper:hover {
  box-shadow: 0 0 0 1px var(--primary-light) inset;
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
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
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
    padding: 0 12px;
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
  }
  
  .main-content {
    padding: 12px;
    padding-bottom: 72px;
    height: calc(100vh - 56px);
  }
  
  .user-info .username {
    display: none;
  }
  
  /* Mobile Bottom Navigation */
  .app-container::after {
    content: '';
  }
}

/* Mobile Bottom Navigation */
.mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: #fff;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
    z-index: 100;
    justify-content: space-around;
    align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .mobile-nav__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 12px;
    color: #909399;
    font-size: 10px;
    cursor: pointer;
    transition: color 0.2s;
    border: none;
    background: none;
    min-width: 56px;
  }
  
  .mobile-nav__item--active {
    color: var(--primary-color);
  }
  
  .mobile-nav__item:active {
    opacity: 0.7;
  }
  
  .mobile-nav__icon {
    font-size: 22px;
  }
}
</style>
