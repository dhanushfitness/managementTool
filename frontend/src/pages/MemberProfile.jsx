import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
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
  Search,
  X,
  Lock,
  Save,
  Edit,
  Activity,
  Scale,
  Ruler,
  Heart,
  Zap,
  Target,
  TrendingUp,
  Percent,
  Dumbbell,
  Hand
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MemberProfile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Get member from localStorage
  const member = JSON.parse(localStorage.getItem('member') || '{}')
  const token = localStorage.getItem('memberToken')

  useEffect(() => {
    if (!token || !member._id) {
      navigate('/member/login')
    }
  }, [token, member, navigate])

  // Configure API to use member token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch member profile
  const { data: profileData } = useQuery({
    queryKey: ['member-profile', member._id],
    queryFn: () => api.get('/member-auth/profile').then(res => res.data),
    enabled: !!member._id && !!token,
  })

  const currentMember = profileData?.member || member
  const notificationsEnabled = currentMember.communicationPreferences?.pushNotification ?? true

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put('/member/profile', data),
    onSuccess: (response) => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries(['member-profile', member._id])
      // Update localStorage
      const updatedMember = { ...member, ...response.data.member }
      localStorage.setItem('member', JSON.stringify(updatedMember))
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    }
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.post('/member/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setShowPrivacyModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password')
    }
  })

  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: currentMember.firstName || '',
    lastName: currentMember.lastName || '',
    phone: currentMember.phone || '',
    address: currentMember.address || '',
    dateOfBirth: currentMember.dateOfBirth ? new Date(currentMember.dateOfBirth).toISOString().split('T')[0] : '',
    communicationPreferences: {
      sms: currentMember.communicationPreferences?.sms ?? true,
      mail: currentMember.communicationPreferences?.mail ?? true,
      pushNotification: currentMember.communicationPreferences?.pushNotification ?? true,
      whatsapp: currentMember.communicationPreferences?.whatsapp ?? true
    }
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (currentMember) {
      setProfileForm({
        firstName: currentMember.firstName || '',
        lastName: currentMember.lastName || '',
        phone: currentMember.phone || '',
        address: currentMember.address || '',
        dateOfBirth: currentMember.dateOfBirth ? new Date(currentMember.dateOfBirth).toISOString().split('T')[0] : '',
        communicationPreferences: {
          sms: currentMember.communicationPreferences?.sms ?? true,
          mail: currentMember.communicationPreferences?.mail ?? true,
          pushNotification: currentMember.communicationPreferences?.pushNotification ?? true,
          whatsapp: currentMember.communicationPreferences?.whatsapp ?? true
        }
      })
    }
  }, [currentMember])

  const handleLogout = () => {
    localStorage.removeItem('memberToken')
    localStorage.removeItem('member')
    navigate('/member/login')
    toast.success('Logged out successfully')
  }

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate(profileForm)
  }

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleNotificationToggle = (key) => {
    setProfileForm(prev => ({
      ...prev,
      communicationPreferences: {
        ...prev.communicationPreferences,
        [key]: !prev.communicationPreferences[key]
      }
    }))
    // Auto-save notification preferences
    updateProfileMutation.mutate({
      communicationPreferences: {
        ...profileForm.communicationPreferences,
        [key]: !profileForm.communicationPreferences[key]
      }
    })
  }

  if (!token || !member._id) {
    return null
  }

  // Filter settings for search
  const settingsItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell, category: 'Settings' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, category: 'Settings' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, category: 'Support' },
    { id: 'account', label: 'Account Settings', icon: Settings, category: 'Account' }
  ]

  const filteredSettings = searchQuery
    ? settingsItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : settingsItems

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
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Search className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4 space-y-6">
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4 backdrop-blur-xl rounded-xl p-3" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {searchQuery && filteredSettings.length > 0 && (
              <div className="mt-2 space-y-1">
                {filteredSettings.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'privacy') setShowPrivacyModal(true)
                        if (item.id === 'help') setShowHelpModal(true)
                        if (item.id === 'account') setShowAccountModal(true)
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
                {currentMember.firstName} {currentMember.lastName}
              </h2>
              <p className="text-gray-300 text-sm">{currentMember.email}</p>
            </div>
          </div>

          {/* Member Info */}
          <div className="space-y-3">
            {currentMember.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{currentMember.phone}</span>
              </div>
            )}
            {currentMember.dateOfBirth && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">
                  {new Date(currentMember.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            )}
            {currentMember.address && (currentMember.address.street || currentMember.address.city) && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">
                  {[
                    currentMember.address.street,
                    currentMember.address.city,
                    currentMember.address.state,
                    currentMember.address.zipCode,
                    currentMember.address.country
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fitness Metrics Section */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)'
            }}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Fitness Metrics</h3>
          </div>

          {/* Check if there's any fitness data */}
          {(() => {
            const fp = currentMember.fitnessProfile || {};
            const hasData = fp.height || fp.bodyWeight || fp.bmi || fp.fatPercentage ||
              fp.musclePercentage || fp.bodyAge || fp.age || fp.visualFatPercentage ||
              fp.muscleEndurance || fp.coreStrength || fp.flexibility ||
              fp.leftHandGripStrength || fp.rightHandGripStrength ||
              fp.cardiovascularTestReport || fp.muscleStrengthReport;

            if (!hasData) {
              return (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                    background: 'rgba(255, 255, 255, 0.1)'
                  }}>
                    <Scale className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm mb-2">No fitness data available yet</p>
                  <p className="text-gray-500 text-xs">Contact your trainer to update your fitness profile</p>
                </div>
              );
            }
            return null;
          })()}

          {/* Body Measurements Grid */}
          {currentMember.fitnessProfile && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Height */}
                {currentMember.fitnessProfile.height && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(139, 195, 74, 0.15) 0%, rgba(124, 179, 66, 0.1) 100%)',
                    border: '1px solid rgba(139, 195, 74, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Ruler className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Height</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.height} <span className="text-sm font-normal text-gray-400">cm</span></p>
                  </div>
                )}

                {/* Weight */}
                {currentMember.fitnessProfile.bodyWeight && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0.1) 100%)',
                    border: '1px solid rgba(33, 150, 243, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Weight</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.bodyWeight} <span className="text-sm font-normal text-gray-400">kg</span></p>
                  </div>
                )}

                {/* BMI */}
                {currentMember.fitnessProfile.bmi && (
                  <div className="p-3 rounded-xl" style={{
                    background: `linear-gradient(135deg, ${currentMember.fitnessProfile.bmi < 18.5 ? 'rgba(255, 193, 7, 0.15)' :
                      currentMember.fitnessProfile.bmi < 25 ? 'rgba(76, 175, 80, 0.15)' :
                        currentMember.fitnessProfile.bmi < 30 ? 'rgba(255, 152, 0, 0.15)' :
                          'rgba(244, 67, 54, 0.15)'
                      } 0%, rgba(0, 0, 0, 0.1) 100%)`,
                    border: `1px solid ${currentMember.fitnessProfile.bmi < 18.5 ? 'rgba(255, 193, 7, 0.3)' :
                      currentMember.fitnessProfile.bmi < 25 ? 'rgba(76, 175, 80, 0.3)' :
                        currentMember.fitnessProfile.bmi < 30 ? 'rgba(255, 152, 0, 0.3)' :
                          'rgba(244, 67, 54, 0.3)'
                      }`
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4" style={{
                        color: currentMember.fitnessProfile.bmi < 18.5 ? '#FFC107' :
                          currentMember.fitnessProfile.bmi < 25 ? '#4CAF50' :
                            currentMember.fitnessProfile.bmi < 30 ? '#FF9800' : '#F44336'
                      }} />
                      <span className="text-xs text-gray-400">BMI</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.bmi.toFixed(1)}</p>
                    <p className="text-xs mt-1" style={{
                      color: currentMember.fitnessProfile.bmi < 18.5 ? '#FFC107' :
                        currentMember.fitnessProfile.bmi < 25 ? '#4CAF50' :
                          currentMember.fitnessProfile.bmi < 30 ? '#FF9800' : '#F44336'
                    }}>
                      {currentMember.fitnessProfile.bmi < 18.5 ? 'Underweight' :
                        currentMember.fitnessProfile.bmi < 25 ? 'Normal' :
                          currentMember.fitnessProfile.bmi < 30 ? 'Overweight' : 'Obese'}
                    </p>
                  </div>
                )}

                {/* Body Fat */}
                {currentMember.fitnessProfile.fatPercentage && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(123, 31, 162, 0.1) 100%)',
                    border: '1px solid rgba(156, 39, 176, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Body Fat</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.fatPercentage}%</p>
                  </div>
                )}

                {/* Muscle Percentage */}
                {currentMember.fitnessProfile.musclePercentage && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(255, 87, 34, 0.15) 0%, rgba(230, 74, 25, 0.1) 100%)',
                    border: '1px solid rgba(255, 87, 34, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-gray-400">Muscle</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.musclePercentage}%</p>
                  </div>
                )}

                {/* Body Age */}
                {currentMember.fitnessProfile.bodyAge && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.15) 0%, rgba(0, 151, 167, 0.1) 100%)',
                    border: '1px solid rgba(0, 188, 212, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-gray-400">Body Age</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.bodyAge} <span className="text-sm font-normal text-gray-400">yrs</span></p>
                  </div>
                )}

                {/* Age */}
                {currentMember.fitnessProfile.age && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(81, 45, 168, 0.1) 100%)',
                    border: '1px solid rgba(103, 58, 183, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <span className="text-xs text-gray-400">Age</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.age} <span className="text-sm font-normal text-gray-400">yrs</span></p>
                  </div>
                )}

                {/* Visual Fat Percentage */}
                {currentMember.fitnessProfile.visualFatPercentage && (
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(233, 30, 99, 0.15) 0%, rgba(194, 24, 91, 0.1) 100%)',
                    border: '1px solid rgba(233, 30, 99, 0.3)'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-pink-400" />
                      <span className="text-xs text-gray-400">Visual Fat</span>
                    </div>
                    <p className="text-xl font-bold text-white">{currentMember.fitnessProfile.visualFatPercentage}%</p>
                  </div>
                )}
              </div>

              {/* Fitness Tests Section */}
              {(currentMember.fitnessProfile.muscleEndurance ||
                currentMember.fitnessProfile.coreStrength ||
                currentMember.fitnessProfile.flexibility ||
                currentMember.fitnessProfile.leftHandGripStrength ||
                currentMember.fitnessProfile.rightHandGripStrength) && (
                  <div className="border-t border-white/10 pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Fitness Tests
                    </h4>
                    <div className="space-y-2">
                      {/* Muscle Endurance */}
                      {currentMember.fitnessProfile.muscleEndurance && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <span className="text-gray-400 text-sm">Muscle Endurance</span>
                          <span className="text-white font-semibold">{currentMember.fitnessProfile.muscleEndurance}</span>
                        </div>
                      )}

                      {/* Core Strength */}
                      {currentMember.fitnessProfile.coreStrength && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <span className="text-gray-400 text-sm">Core Strength</span>
                          <span className="text-white font-semibold">{currentMember.fitnessProfile.coreStrength}</span>
                        </div>
                      )}

                      {/* Flexibility */}
                      {currentMember.fitnessProfile.flexibility && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <span className="text-gray-400 text-sm">Flexibility</span>
                          <span className="text-white font-semibold">{currentMember.fitnessProfile.flexibility}</span>
                        </div>
                      )}

                      {/* Left Hand Grip Strength */}
                      {currentMember.fitnessProfile.leftHandGripStrength && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <div className="flex items-center gap-2">
                            <Hand className="w-4 h-4 text-gray-400" style={{ transform: 'scaleX(-1)' }} />
                            <span className="text-gray-400 text-sm">Left Hand Grip</span>
                          </div>
                          <span className="text-white font-semibold">{currentMember.fitnessProfile.leftHandGripStrength} <span className="text-xs text-gray-400">kg</span></span>
                        </div>
                      )}

                      {/* Right Hand Grip Strength */}
                      {currentMember.fitnessProfile.rightHandGripStrength && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <div className="flex items-center gap-2">
                            <Hand className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Right Hand Grip</span>
                          </div>
                          <span className="text-white font-semibold">{currentMember.fitnessProfile.rightHandGripStrength} <span className="text-xs text-gray-400">kg</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Test Reports Section */}
              {(currentMember.fitnessProfile.cardiovascularTestReport ||
                currentMember.fitnessProfile.muscleStrengthReport) && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Test Reports</h4>
                    <div className="space-y-2">
                      {currentMember.fitnessProfile.cardiovascularTestReport && (
                        <div className="p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <span className="text-gray-400 text-sm block mb-1">Cardiovascular Test</span>
                          <span className="text-white text-sm">{currentMember.fitnessProfile.cardiovascularTestReport}</span>
                        </div>
                      )}
                      {currentMember.fitnessProfile.muscleStrengthReport && (
                        <div className="p-3 rounded-xl" style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          <span className="text-gray-400 text-sm block mb-1">Muscle Strength</span>
                          <span className="text-white text-sm">{currentMember.fitnessProfile.muscleStrengthReport}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {currentMember.fitnessProfile?.measuredAt && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500 text-center">
                    Last measured: {new Date(currentMember.fitnessProfile.measuredAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </>
          )}
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
                <span className="text-gray-300">Push Notifications</span>
              </div>
              <button
                onClick={() => handleNotificationToggle('pushNotification')}
                className={`w-12 h-6 rounded-full transition-all relative ${profileForm.communicationPreferences.pushNotification ? 'bg-green-400' : 'bg-gray-600'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${profileForm.communicationPreferences.pushNotification ? 'left-6' : 'left-0.5'
                  }`} />
              </button>
            </div>

            {/* Privacy */}
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Privacy & Security</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>

            {/* Help */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            >
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
            <button
              onClick={() => setShowAccountModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors" style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            >
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
      </div >

      {/* Privacy & Security Modal */}
      {
        showPrivacyModal && (
          <PrivacySecurityModal
            onClose={() => {
              setShowPrivacyModal(false)
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            }}
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            onChangePassword={handlePasswordChange}
            isChanging={changePasswordMutation.isLoading}
          />
        )
      }

      {/* Help & Support Modal */}
      {
        showHelpModal && (
          <HelpSupportModal onClose={() => setShowHelpModal(false)} />
        )
      }

      {/* Account Settings Modal */}
      {
        showAccountModal && (
          <AccountSettingsModal
            onClose={() => {
              setShowAccountModal(false)
              setIsEditing(false)
            }}
            member={currentMember}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={handleProfileUpdate}
            isSaving={updateProfileMutation.isLoading}
            onNotificationToggle={handleNotificationToggle}
          />
        )
      }
    </MemberLayout >
  )
}

// Privacy & Security Modal
function PrivacySecurityModal({ onClose, passwordForm, setPasswordForm, onChangePassword, isChanging }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{
        background: 'rgba(26, 35, 50, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
      }}>
        <div className="sticky top-0 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between" style={{
          background: 'rgba(26, 35, 50, 0.9)'
        }}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Security
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                onClick={onChangePassword}
                disabled={isChanging || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                  boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
                }}
              >
                <Lock className="w-5 h-5" />
                {isChanging ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-lg font-semibold text-white mb-2">Security Information</h4>
            <p className="text-sm text-gray-300">
              Your account is secured with encrypted password storage. For additional security,
              we recommend using a strong, unique password and changing it regularly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Help & Support Modal
function HelpSupportModal({ onClose }) {
  const faqs = [
    {
      question: 'How do I track my workout progress?',
      answer: 'You can view your progress in the Progress tab. It shows calories burned, muscle groups worked, and strength progression over time.'
    },
    {
      question: 'How do I mark an exercise as completed?',
      answer: 'In the Dashboard or Workouts tab, click on an exercise and use the "Mark Complete" button, or update your sets/reps progress.'
    },
    {
      question: 'Can I change my workout schedule?',
      answer: 'Your workout schedule is assigned by your trainer. Please contact your trainer or gym staff to discuss any changes.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Go to Profile > Account Settings to edit your personal information, contact details, and notification preferences.'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{
        background: 'rgba(26, 35, 50, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
      }}>
        <div className="sticky top-0 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between" style={{
          background: 'rgba(26, 35, 50, 0.9)'
        }}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & Support
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact Support</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-sm text-gray-300 mb-1">Email</p>
                <p className="text-white font-semibold">support@fittrack.com</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-sm text-gray-300 mb-1">Phone</p>
                <p className="text-white font-semibold">+1 (555) 123-4567</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-sm text-gray-300 mb-1">Hours</p>
                <p className="text-white font-semibold">Monday - Friday: 9 AM - 6 PM</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h4>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <h5 className="text-white font-semibold mb-2">{faq.question}</h5>
                  <p className="text-sm text-gray-300">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Account Settings Modal
function AccountSettingsModal({ onClose, member, profileForm, setProfileForm, isEditing, setIsEditing, onSave, isSaving, onNotificationToggle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{
        background: 'rgba(26, 35, 50, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
      }}>
        <div className="sticky top-0 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between" style={{
          background: 'rgba(26, 35, 50, 0.9)'
        }}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Account Settings
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">Profile Information</h4>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(139, 195, 74, 0.2)',
                color: isEditing ? '#9CA3AF' : '#8BC34A'
              }}
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400 disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Date of Birth</label>
              <input
                type="date"
                value={profileForm.dateOfBirth}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 outline-none focus:border-green-400 disabled:opacity-50"
              />
            </div>
          </div>

          {isEditing && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
              }}
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-lg font-semibold text-white mb-4">Notification Preferences</h4>
            <div className="space-y-3">
              {[
                { key: 'sms', label: 'SMS Notifications' },
                { key: 'mail', label: 'Email Notifications' },
                { key: 'pushNotification', label: 'Push Notifications' },
                { key: 'whatsapp', label: 'WhatsApp Notifications' }
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between p-3 rounded-xl" style={{
                  background: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <span className="text-gray-300">{pref.label}</span>
                  <button
                    onClick={() => onNotificationToggle(pref.key)}
                    className={`w-12 h-6 rounded-full transition-all relative ${profileForm.communicationPreferences[pref.key] ? 'bg-green-400' : 'bg-gray-600'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${profileForm.communicationPreferences[pref.key] ? 'left-6' : 'left-0.5'
                      }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
