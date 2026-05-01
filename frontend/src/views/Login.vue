<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="login-bg__grid"></div>
      <div class="login-bg__gradient"></div>
    </div>

    <div class="login-container">
      <div class="login-card">
        <div class="login-card__header">
          <div class="login-card__logo">
            <el-icon :size="36" color="#6366f1"><Monitor /></el-icon>
          </div>
          <h1>AI Employee System</h1>
          <p>AI智能体管理系统</p>
        </div>

        <el-tabs v-model="activeTab" class="login-tabs">
          <el-tab-pane label="登录" name="login">
            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              @submit.prevent="handleLogin"
              class="login-form"
            >
              <el-form-item prop="username">
                <el-input
                  v-model="loginForm.username"
                  placeholder="用户名"
                  :prefix-icon="User"
                  size="large"
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="密码"
                  :prefix-icon="Lock"
                  size="large"
                  show-password
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <el-button
                type="primary"
                size="large"
                class="login-submit"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="注册" name="register">
            <el-form
              ref="registerFormRef"
              :model="registerForm"
              :rules="registerRules"
              @submit.prevent="handleRegister"
              class="login-form"
            >
              <el-form-item prop="username">
                <el-input
                  v-model="registerForm.username"
                  placeholder="用户名 (3-30字符)"
                  :prefix-icon="User"
                  size="large"
                />
              </el-form-item>

              <el-form-item prop="password">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="密码 (至少6位)"
                  :prefix-icon="Lock"
                  size="large"
                  show-password
                />
              </el-form-item>

              <el-form-item prop="confirmPassword">
                <el-input
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="确认密码"
                  :prefix-icon="Lock"
                  size="large"
                  show-password
                />
              </el-form-item>

              <el-button
                type="primary"
                size="large"
                class="login-submit"
                :loading="loading"
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Monitor, User, Lock } from '@element-plus/icons-vue'
import { authApi } from '../api'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)

const loginFormRef = ref<FormInstance>()
const loginForm = reactive({
  username: '',
  password: '',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 30, message: '用户名长度需在 3-30 个字符之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

async function handleLogin() {
  const form = loginFormRef.value
  if (!form) return

  await form.validate(async valid => {
    if (!valid) return

    loading.value = true
    try {
      const response: any = await authApi.login(loginForm.username, loginForm.password)
      if (response.data) {
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        ElMessage.success('登录成功')
        router.push('/dashboard')
      }
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || '登录失败')
    } finally {
      loading.value = false
    }
  })
}

async function handleRegister() {
  const form = registerFormRef.value
  if (!form) return

  await form.validate(async valid => {
    if (!valid) return

    loading.value = true
    try {
      const response: any = await authApi.register(
        registerForm.username,
        registerForm.password
      )
      if (response.data) {
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        ElMessage.success('注册成功')
        router.push('/dashboard')
      }
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || '注册失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #0f172a;
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.login-bg__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px);
  background-size: 60px 60px;
}

.login-bg__gradient {
  position: absolute;
  top: -30%;
  right: -20%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
  animation: pulse 8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.4; }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
}

.login-card__header {
  text-align: center;
  margin-bottom: 32px;
}

.login-card__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  margin-bottom: 16px;
}

.login-card__header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
}

.login-card__header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.login-tabs {
  --el-tabs-header-height: 40px;
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-input__wrapper) {
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: all 0.2s;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #6366f1 inset;
}

.login-submit {
  width: 100%;
  margin-top: 8px;
  border-radius: 12px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .login-container {
    max-width: 100%;
    padding: 16px;
  }
  
  .login-card {
    padding: 32px 24px;
    border-radius: 16px;
  }
  
  .login-card__logo {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }
  
  .login-card__logo .el-icon {
    --el-icon-size: 28px;
  }
  
  .login-card__header h1 {
    font-size: 22px;
  }
  
  .login-card__header p {
    font-size: 13px;
  }
  
  .login-card__header {
    margin-bottom: 24px;
  }
  
  .login-form {
    margin-top: 20px;
  }
}

@media (max-width: 480px) {
  .login-page {
    align-items: stretch;
  }
  
  .login-bg__grid {
    background-size: 40px 40px;
  }
  
  .login-bg__gradient {
    width: 400px;
    height: 400px;
    top: -20%;
    right: -10%;
  }
  
  .login-container {
    padding: 0;
    display: flex;
    align-items: center;
  }
  
  .login-card {
    margin: 16px;
    padding: 28px 20px;
    border-radius: 14px;
  }
  
  .login-card__logo {
    width: 50px;
    height: 50px;
    border-radius: 12px;
  }
  
  .login-card__logo .el-icon {
    --el-icon-size: 24px;
  }
  
  .login-card__header h1 {
    font-size: 20px;
  }
  
  .login-card__header p {
    font-size: 12px;
  }
  
  .login-card__header {
    margin-bottom: 20px;
  }
  
  .login-tabs :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 14px;
  }
  
  .login-form {
    margin-top: 16px;
  }
  
  .login-form :deep(.el-input__wrapper) {
    padding: 10px 14px;
    border-radius: 10px;
  }
  
  .login-submit {
    height: 44px;
    font-size: 15px;
    border-radius: 10px;
  }
}
</style>
