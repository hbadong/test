import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理 token 过期自动刷新
api.interceptors.response.use(
  response => response.data,
  async error => {
    const originalRequest = error.config

    // 401 且尚未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const res = await axios.post('/api/auth/refresh', { refreshToken })
          const { accessToken, refreshToken: newRefreshToken } = res.data.data

          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // 刷新失败，清除登录状态并跳转登录页
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// 认证相关 API
export const authApi = {
  login(username: string, password: string) {
    return api.post('/auth/login', { username, password })
  },
  register(username: string, password: string, role = 'admin') {
    return api.post('/auth/register', { username, password, role })
  },
  refreshToken(refreshToken: string) {
    return api.post('/auth/refresh', { refreshToken })
  },
  getProfile() {
    return api.get('/auth/me')
  },
  changePassword(currentPassword: string, newPassword: string) {
    return api.post('/auth/change-password', { currentPassword, newPassword })
  },
}

// 登录状态管理
export function isLoggedIn(): boolean {
  return !!localStorage.getItem('accessToken')
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/login'
}

export default api
