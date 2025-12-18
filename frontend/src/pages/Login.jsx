import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isTokenExpired } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Dumbbell, Mail, Lock, Loader2 } from 'lucide-react'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
      const token = response.data.token || response.data.data?.token
      const user = response.data.user || response.data.data?.user
      
      if (token && user) {
        // Clear any member token when admin logs in
        if (typeof window !== 'undefined') {
          localStorage.removeItem('memberToken')
          localStorage.removeItem('member')
          window.axiosLoginTime = Date.now()
        }
        
        setAuth(token, user)
        
        // Also set token directly in localStorage for immediate access
        try {
          const authStorage = localStorage.getItem('auth-storage')
          const authData = authStorage ? JSON.parse(authStorage) : { state: {} }
          authData.state = { ...authData.state, token, user, hydrated: true }
          localStorage.setItem('auth-storage', JSON.stringify(authData))
        } catch (e) {
          console.error('Error setting auth in localStorage:', e)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify token was stored correctly
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
        }
        
        if (!storedToken || storedToken !== token) {
          toast.error('Failed to save authentication token. Please try again.')
          setLoading(false)
          return
        }
        
        if (!storedUser) {
          toast.error('Failed to save user data. Please try again.')
          setLoading(false)
          return
        }
        
        if (!isHydrated) {
          useAuthStore.getState().setHydrated()
        }
        
        toast.success('Welcome back!')
        navigate('/', { replace: true })
      } else {
        toast.error('Invalid response from server')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg mb-4">
            <Dumbbell className="h-8 w-8 text-white" />
          </div> */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to manage your gym</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? contact to email: dhanushfitnessofficial@gymmanager.com{' '}
          {/* <button
            onClick={() => navigate('/register')}
            className="text-orange-600 font-medium hover:text-orange-700 transition-colors"
          >
            Create one
          </button> */}
        </p>
      </div>
    </div>
  )
}
