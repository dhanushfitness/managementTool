import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// Use environment variable if set, otherwise use full URL with /api prefix
// In development, you can set VITE_API_BASE_URL=/api to use the Vite proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.airfitluxury.in/api'
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
    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || error.response.headers['Retry-After'] || 5;
      const message = error.response?.data?.message || `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
      
      // Show user-friendly error message
      toast.error(message, {
        duration: 5000,
        id: 'rate-limit-error', // Prevent duplicate toasts
      });
      
      // Don't retry 429 errors immediately - let React Query handle retry logic
      return Promise.reject(error);
    }
    
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

