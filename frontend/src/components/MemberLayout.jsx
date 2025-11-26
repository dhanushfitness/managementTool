import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Dumbbell, TrendingUp, User, Search } from 'lucide-react'

export default function MemberLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/member/dashboard', icon: Home, label: 'Home' },
    { path: '/member/workouts', icon: Dumbbell, label: 'Workouts' },
    { path: '/member/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/member/profile', icon: User, label: 'Profile' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen pb-20" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #1a2332 100%)',
        minHeight: '100vh'
      }}>
        {/* Background decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-400/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{
        background: 'rgba(26, 35, 50, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all min-w-[70px]"
                  style={{
                    background: active ? 'rgba(139, 195, 74, 0.2)' : 'transparent',
                  }}
                >
                  <Icon 
                    className={`w-6 h-6 mb-1 transition-colors ${active ? 'text-green-400' : 'text-gray-400'}`}
                    style={{
                      color: active ? '#8BC34A' : '#9CA3AF'
                    }}
                  />
                  <span 
                    className="text-xs font-medium"
                    style={{
                      color: active ? '#8BC34A' : '#9CA3AF'
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

