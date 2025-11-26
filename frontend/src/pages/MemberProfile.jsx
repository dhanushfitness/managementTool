import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MemberLayout from '../components/MemberLayout'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MemberProfile() {
  const navigate = useNavigate()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Get member from localStorage
  const member = JSON.parse(localStorage.getItem('member') || '{}')
  const token = localStorage.getItem('memberToken')

  useEffect(() => {
    if (!token || !member._id) {
      navigate('/member/login')
    }
  }, [token, member, navigate])

  const handleLogout = () => {
    localStorage.removeItem('memberToken')
    localStorage.removeItem('member')
    navigate('/member/login')
    toast.success('Logged out successfully')
  }

  if (!token || !member._id) {
    return null
  }

  return (
    <MemberLayout>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl" style={{
        background: 'rgba(26, 35, 50, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
              }}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Profile</h1>
              </div>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4 space-y-6">
        {/* Profile Card */}
        <div className="backdrop-blur-xl rounded-3xl p-6 mt-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
              boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
            }}>
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                {member.firstName} {member.lastName}
              </h2>
              <p className="text-gray-300 text-sm">{member.email}</p>
            </div>
          </div>

          {/* Member Info */}
          <div className="space-y-3">
            {member.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{member.phone}</span>
              </div>
            )}
            {member.dateOfBirth && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">
                  {new Date(member.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            )}
            {member.address && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{member.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 className="text-lg font-bold text-white mb-4">Settings</h3>
          <div className="space-y-3">
            {/* Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Notifications</span>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  notificationsEnabled ? 'bg-green-400' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                  notificationsEnabled ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Privacy */}
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Privacy & Security</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>

            {/* Help */}
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Help & Support</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>

          </div>
        </div>

        {/* Account Actions */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 className="text-lg font-bold text-white mb-4">Account</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Account Settings</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/20 transition-colors" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold">Log Out</span>
              </div>
              <span className="text-red-400">›</span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">FitTrack v1.0.0</p>
          <p className="text-xs text-gray-500 mt-1">© 2024 All rights reserved</p>
        </div>
      </div>
    </MemberLayout>
  )
}

