import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import MemberLayout from '../components/MemberLayout'
import {
  TrendingUp,
  Flame,
  Dumbbell,
  Calendar,
  ChevronLeft,
  Search
} from 'lucide-react'

export default function MemberProgress() {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState('week') // week, month, year

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

  // Get all assignments for progress tracking
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['member-all-exercises', member._id],
    queryFn: () => api.get('/member/exercises/my-exercises').then(res => res.data),
    enabled: !!member._id && !!token,
  })

  const assignments = assignmentsData?.assignments || []
  
  // Calculate stats
  const completedExercises = assignments.filter(a => a.isCompleted).length
  const totalExercises = assignments.length
  const completionRate = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0
  const estimatedCalories = completedExercises * 50 // Rough estimate

  // Mock data for charts (in real app, this would come from API)
  const caloriesData = [1200, 1500, 1800, 1400, 2000, 1600, 1900]
  const muscleGroupsData = [
    { name: 'Chest', value: 25 },
    { name: 'Back', value: 20 },
    { name: 'Legs', value: 30 },
    { name: 'Arms', value: 15 },
    { name: 'Shoulders', value: 10 }
  ]
  const strengthData = [50, 55, 60, 58, 65, 70, 68]

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
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Progress</h1>
              </div>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center gap-2 mt-4">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className="px-4 py-2 rounded-xl font-medium text-sm transition-all capitalize"
              style={{
                background: selectedPeriod === period 
                  ? 'rgba(139, 195, 74, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedPeriod === period ? '#8BC34A' : '#9CA3AF',
                border: selectedPeriod === period 
                  ? '1px solid rgba(139, 195, 74, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="backdrop-blur-xl rounded-2xl p-4" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-300">Calories</span>
            </div>
            <div className="text-2xl font-bold text-white">{estimatedCalories}</div>
            <div className="text-xs text-gray-400 mt-1">Burned this week</div>
          </div>
          <div className="backdrop-blur-xl rounded-2xl p-4" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-300">Completed</span>
            </div>
            <div className="text-2xl font-bold text-white">{completedExercises}</div>
            <div className="text-xs text-gray-400 mt-1">Exercises done</div>
          </div>
        </div>

        {/* Calories Chart */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Calories Burned</h3>
            <button className="px-3 py-1 rounded-lg text-xs" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#9CA3AF'
            }}>
              Week
            </button>
          </div>
          <div className="h-48 flex items-end justify-between gap-2">
            {caloriesData.map((value, index) => {
              const maxValue = Math.max(...caloriesData)
              const height = (value / maxValue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #8BC34A 0%, #7CB342 100%)',
                        minHeight: '8px'
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">Day {index + 1}</div>
                  <div className="text-xs text-white font-semibold">{value}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Muscle Groups Chart */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Muscle Groups</h3>
            <button className="px-3 py-1 rounded-lg text-xs" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#9CA3AF'
            }}>
              Top 5
            </button>
          </div>
          <div className="space-y-3">
            {muscleGroupsData.map((group, index) => {
              const colors = ['#8BC34A', '#7CB342', '#689F38', '#558B2F', '#33691E']
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{group.name}</span>
                    <span className="text-white font-semibold">{group.value}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{
                    background: 'rgba(255, 255, 255, 0.1)'
                  }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${group.value}%`,
                        background: colors[index % colors.length]
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strength Progress Chart */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Strength Progress</h3>
            <button className="px-3 py-1 rounded-lg text-xs" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#9CA3AF'
            }}>
              Weight (kg)
            </button>
          </div>
          <div className="h-48 flex items-end justify-between gap-2">
            {strengthData.map((value, index) => {
              const maxValue = Math.max(...strengthData)
              const height = (value / maxValue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #8BC34A 0%, #7CB342 100%)',
                        minHeight: '8px'
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">W{index + 1}</div>
                  <div className="text-xs text-white font-semibold">{value}kg</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="backdrop-blur-xl rounded-2xl p-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {assignments.filter(a => a.isCompleted).slice(0, 5).map((assignment) => {
              const exercise = assignment.exerciseId
              if (!exercise) return null
              return (
                <div key={assignment._id} className="flex items-center gap-3 p-3 rounded-xl" style={{
                  background: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    background: 'rgba(139, 195, 74, 0.2)'
                  }}>
                    <Dumbbell className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{exercise.name}</div>
                    <div className="text-xs text-gray-400">
                      {assignment.completedAt 
                        ? new Date(assignment.completedAt).toLocaleDateString()
                        : 'Recently completed'}
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
              )
            })}
            {assignments.filter(a => a.isCompleted).length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No completed exercises yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

