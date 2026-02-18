import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// Track when login happens to prevent immediate redirects
const LOGIN_GRACE_PERIOD = 3000 // 3 seconds after login, don't redirect on 401

const getLastLoginTime = () => {
  if (typeof window !== 'undefined' && window.axiosLoginTime) {
    return window.axiosLoginTime
  }
  return 0
}

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
    // Don't add auth header for login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || 
                          config.url?.includes('/auth/register') ||
                          config.url?.includes('/member-auth/login')
    
    if (isAuthEndpoint) {
      return config
    }
    
    // Determine if this is a member route
    // Member routes are: /member/... or /member-... (singular, not plural /members/...)
    const apiUrl = config.url || ''
    const isMemberRoute = apiUrl.startsWith('/member/') ||
                         apiUrl.startsWith('/member-') ||
                         apiUrl.includes('/member-auth/')
    
    if (isMemberRoute) {
      // For member routes, use member token
      const memberToken = localStorage.getItem('memberToken')
      if (memberToken) {
        config.headers.Authorization = `Bearer ${memberToken}`
      } else {
        console.warn('No member token available for member route:', config.url)
      }
    } else {
      // For admin routes (including /members), use admin token
      // Try to get token from store first
      let token = useAuthStore.getState().token
      
      // If not in store, try to get from localStorage directly (for immediate access after login)
      if (!token && typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const authData = JSON.parse(authStorage)
            token = authData?.state?.token
          }
        } catch (e) {
          console.error('Error reading token from localStorage:', e)
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn('No admin token available for request:', config.url)
        // Don't send request without token for admin routes - let it fail with 401
        // The component can handle the error appropriately
      }
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
    
    // Don't logout on login/register endpoints or member auth endpoints
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register') ||
                          error.config?.url?.includes('/member-auth/login')
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Check if we're in the grace period after login
      const lastLoginTime = getLastLoginTime()
      const timeSinceLogin = Date.now() - lastLoginTime
      const inGracePeriod = timeSinceLogin < LOGIN_GRACE_PERIOD
      
      if (inGracePeriod) {
        console.log('401 error during login grace period, ignoring redirect')
        return Promise.reject(error)
      }
      
      // Check if we're on a member page (admin pages should NEVER redirect to member login)
      const isMemberPage = window.location.pathname.startsWith('/member/')
      
      // If we're NOT on a member page, this is an admin context - never redirect to member login
      if (!isMemberPage) {
        // This is an admin page, don't redirect to member login - just reject the error
        // The error will be handled by the component's error handler
        console.log('401 error on admin page, not redirecting to member login')
        return Promise.reject(error)
      }
      
      // Only handle member login redirects if we're actually on a member page
      // Check if the API endpoint is a member route (member APIs start with /member/ or /member-)
      const apiUrl = error.config?.url || ''
      // Member routes are: /member/..., /member-..., but NOT /members/... (plural is admin route)
      const isMemberApiRoute = apiUrl.startsWith('/member/') ||
                               apiUrl.startsWith('/member-') ||
                               apiUrl.includes('/member-auth/')
      
      if (isMemberApiRoute || isMemberPage) {
        // Redirect to member login only if we're on a member page or calling member API
        localStorage.removeItem('memberToken')
        localStorage.removeItem('member')
        if (window.location.pathname !== '/member/login') {
          window.location.href = '/member/login'
        }
      } else {
        // For admin routes, only redirect if we have a token (meaning it's invalid/expired)
        // and we're not already on the login page
        const currentPath = window.location.pathname
        const isLoginPage = currentPath === '/login' || currentPath === '/register'
        const authStore = useAuthStore.getState()
        
        // Check if token exists in store or localStorage
        let hasToken = false
        if (authStore.token) {
          hasToken = true
        } else if (typeof window !== 'undefined') {
          try {
            const authStorage = localStorage.getItem('auth-storage')
            if (authStorage) {
              const authData = JSON.parse(authStorage)
              hasToken = !!authData?.state?.token
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Only redirect if we have a token (meaning it's invalid/expired) and we're not on login page
        // Don't redirect if there's no token - might be initial load or legitimate unauthenticated request
        if (!isLoginPage && hasToken) {
          console.log('401 error with token present, logging out and redirecting')
          authStore.logout()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

