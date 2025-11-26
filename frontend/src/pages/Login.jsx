import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isTokenExpired } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth, token, user, hydrated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrated && token && user && !isTokenExpired(token)) {
      navigate('/', { replace: true })
    }
  }, [hydrated, token, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/login', formData)
      console.log('Login response:', response.data)
      
      // Handle both response structures: { success, token, user } or { token, user }
      const token = response.data.token || response.data.data?.token
      const user = response.data.user || response.data.data?.user
      
      console.log('Extracted token and user:', { hasToken: !!token, hasUser: !!user })
      
      if (token && user) {
        console.log('Login successful, received:', { 
          hasToken: !!token, 
          hasUser: !!user,
          userKeys: Object.keys(user || {}),
          tokenLength: token?.length
        })
        
        // Clear any member token when admin logs in
        if (typeof window !== 'undefined') {
          localStorage.removeItem('memberToken')
          localStorage.removeItem('member')
          window.axiosLoginTime = Date.now()
        }
        
        // Set auth state - this also sets hydrated to true
        console.log('Setting auth state...')
        setAuth(token, user)
        
        // Also set token directly in localStorage for immediate access
        try {
          const authStorage = localStorage.getItem('auth-storage')
          const authData = authStorage ? JSON.parse(authStorage) : { state: {} }
          authData.state = { ...authData.state, token, user, hydrated: true }
          localStorage.setItem('auth-storage', JSON.stringify(authData))
          console.log('Directly set auth in localStorage')
        } catch (e) {
          console.error('Error setting auth in localStorage:', e)
        }
        
        // Wait for state to be persisted and ensure token is available
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify token was stored correctly - check multiple times
        let attempts = 0
        let authState = useAuthStore.getState()
        let storedToken = authState.token
        let storedUser = authState.user
        let isHydrated = authState.hydrated
        
        while ((!storedToken || !storedUser || !isHydrated) && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          authState = useAuthStore.getState()
          storedToken = authState.token
          storedUser = authState.user
          isHydrated = authState.hydrated
          attempts++
          console.log(`Verification attempt ${attempts}:`, { 
            storedToken: !!storedToken, 
            storedUser: !!storedUser,
            isHydrated,
            tokensMatch: storedToken === token
          })
        }
        
        console.log('Final verification:', { 
          storedToken: !!storedToken, 
          storedUser: !!storedUser,
          isHydrated,
          tokensMatch: storedToken === token,
          userMatch: JSON.stringify(storedUser) === JSON.stringify(user)
        })
        
        if (!storedToken || storedToken !== token) {
          console.error('Token not stored correctly', { storedToken, token })
          toast.error('Failed to save authentication token. Please try again.')
          setLoading(false)
          return
        }
        
        if (!storedUser) {
          console.error('User not stored correctly', { storedUser, user })
          toast.error('Failed to save user data. Please try again.')
          setLoading(false)
          return
        }
        
        if (!isHydrated) {
          console.warn('Not hydrated yet, but proceeding anyway')
          useAuthStore.getState().setHydrated()
        }
        
        toast.success('Login successful!')
        
        // Use replace to prevent back navigation to login
        console.log('Navigating to dashboard...')
        navigate('/', { replace: true })
      } else {
        console.error('Invalid response structure:', response.data)
        toast.error('Invalid response from server')
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">Gym Management</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input mt-1"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/register" className="text-sm text-primary-600 hover:text-primary-700">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

