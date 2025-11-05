import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't logout on login/register endpoints
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register')
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Only logout if we're not already on login page
      if (window.location.pathname !== '/login') {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

