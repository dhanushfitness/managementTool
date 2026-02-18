import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Mail, User } from 'lucide-react'

export default function MemberLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  
  const loginMutation = useMutation({
    mutationFn: (email) => api.post('/member-auth/login', { email }),
    onSuccess: (response) => {
      const { token, member } = response.data
      localStorage.setItem('memberToken', token)
      localStorage.setItem('member', JSON.stringify(member))
      toast.success(`Welcome back, ${member.firstName}!`)
      navigate('/member/profile')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Login failed')
    }
  })

  // Auto-login if email is provided in URL (from QR code)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const autoLogin = searchParams.get('auto') === 'true'
    
    if (emailParam && autoLogin) {
      setEmail(emailParam)
      // Auto-submit after a brief delay to show the form
      setTimeout(() => {
        if (emailParam.trim()) {
          loginMutation.mutate(emailParam.trim())
        }
      }, 500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    loginMutation.mutate(email.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #1a2332 100%)'
    }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Glassmorphism card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6" style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}>
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
              boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
            }}>
              <User className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white">Good Morning</h1>
            <p className="text-gray-300 text-sm">Enter your email to access your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-400 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                  }}
                  autoComplete="email"
                  onFocus={(e) => {
                    e.target.style.border = '1px solid #8BC34A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 195, 74, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!loginMutation.isLoading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 25px rgba(139, 195, 74, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loginMutation.isLoading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 20px rgba(139, 195, 74, 0.4)'
                }
              }}
            >
              {loginMutation.isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {/* Info */}
          <p className="text-xs text-center text-gray-400">
            No password required. Just enter your registered email address.
          </p>
        </div>
      </div>
    </div>
  )
}

