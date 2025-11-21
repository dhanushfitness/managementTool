import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// Use environment variable if set, otherwise use Vite proxy in development
// In development mode, use '/api' to leverage Vite proxy to localhost:5000
// In production, use the full API URL
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

// For local development, always use the proxy unless explicitly overridden
// .env.local takes precedence over .env, so create .env.local with VITE_API_BASE_URL=/api for local dev
const getBaseURL = () => {
  // If VITE_API_BASE_URL is explicitly set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // In development, default to using the Vite proxy
  if (isDevelopment) {
    return '/api'
  }
  // Fallback for production
  return 'http://localhost:5000/api'
}

const api = axios.create({
  baseURL: getBaseURL()
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

