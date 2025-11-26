import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import MemberLayout from '../components/MemberLayout'
import {
  Dumbbell,
  CheckCircle,
  Clock,
  Play,
  Search,
  User,
  Calendar,
  Flame,
  TrendingUp,
  Plus,
  Minus,
  ChevronRight,
  Filter
} from 'lucide-react'

export default function MemberDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [filter, setFilter] = useState('today') // today, week, all
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('all')

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

  const weekDay = selectedDate.getDay()
  const today = new Date()
  const isToday = selectedDate.toDateString() === today.toDateString()

  // Get all assignments for stats
  const { data: allAssignmentsData } = useQuery({
    queryKey: ['member-all-exercises', member._id],
    queryFn: () => api.get('/member/exercises/my-exercises').then(res => res.data),
    enabled: !!member._id && !!token,
  })

  // Get today's assignments
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['member-my-exercises', member._id, weekDay],
    queryFn: () => api.get('/member/exercises/my-exercises', {
      params: { weekDay }
    }).then(res => res.data),
    enabled: !!member._id && !!token,
    retry: 1
  })

  const markCompleteMutation = useMutation({
    mutationFn: (assignmentId) => api.post(`/member/exercises/assignment/${assignmentId}/complete`),
    onSuccess: () => {
      toast.success('Exercise completed! 🎉', {
        icon: '🎉',
        style: {
          borderRadius: '10px',
          background: '#1a2332',
          color: '#8BC34A',
        },
      })
      queryClient.invalidateQueries(['member-my-exercises', member._id])
      queryClient.invalidateQueries(['member-all-exercises', member._id])
      setShowDetailModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark exercise as completed')
    }
  })

  const updateProgressMutation = useMutation({
    mutationFn: ({ assignmentId, setsCompleted, repsCompleted }) => 
      api.patch(`/member/exercises/assignment/${assignmentId}`, {
        setsCompleted,
        repsCompleted
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['member-my-exercises', member._id])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update progress')
    }
  })

  const allAssignments = allAssignmentsData?.assignments || []
  const assignments = assignmentsData?.assignments || []
  
  // Calculate stats
  const totalAssigned = allAssignments.length
  const completedToday = assignments.filter(a => a.isCompleted).length
  const totalToday = assignments.length
  const completionPercentage = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
  const estimatedCalories = completedToday * 50 // Rough estimate

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const handleExerciseClick = (assignment) => {
    setSelectedExercise(assignment)
    setShowDetailModal(true)
  }

  const handleProgressUpdate = (assignmentId, type, increment) => {
    const assignment = assignments.find(a => a._id === assignmentId)
    if (!assignment) return

    const currentSets = assignment.setsCompleted || 0
    const currentReps = assignment.repsCompleted || 0
    const maxSets = assignment.sets || assignment.exerciseId?.sets || 0
    const maxReps = assignment.reps || assignment.exerciseId?.reps || 0

    if (type === 'sets') {
      const newValue = Math.max(0, Math.min(maxSets, currentSets + increment))
      updateProgressMutation.mutate({ assignmentId, setsCompleted: newValue, repsCompleted: currentReps })
    } else {
      const newValue = Math.max(0, Math.min(parseInt(maxReps) || 0, currentReps + increment))
      updateProgressMutation.mutate({ assignmentId, setsCompleted: currentSets, repsCompleted: newValue })
    }
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
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">FitTrack</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Search className="w-5 h-5 text-gray-300" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4 space-y-6">
        {/* Hero Section */}
        <div className="backdrop-blur-xl rounded-3xl p-6 mt-4" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {getGreeting()}, {member.firstName}!
              </h2>
              <p className="text-gray-300 text-sm">Ready for today's workout?</p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#8BC34A"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - completionPercentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{completionPercentage}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div className="text-2xl font-bold text-white">{totalToday}</div>
              <div className="text-xs text-gray-300 mt-1">Exercises</div>
            </div>
            <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div className="text-2xl font-bold text-green-400">{completedToday}</div>
              <div className="text-xs text-gray-300 mt-1">Completed</div>
            </div>
            <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div className="text-2xl font-bold text-orange-400">{estimatedCalories}</div>
              <div className="text-xs text-gray-300 mt-1">Calories</div>
            </div>
          </div>
        </div>

        {/* Assigned Exercises Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Assigned Exercises</h3>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Loading exercises...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="backdrop-blur-xl rounded-3xl p-8 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Exercises Today</h3>
              <p className="text-gray-300">
                You don't have any exercises assigned for today
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment, index) => {
                const exercise = assignment.exerciseId
                if (!exercise) return null

                const status = assignment.isCompleted ? 'completed' : 
                              (assignment.setsCompleted > 0 || assignment.repsCompleted > 0) ? 'in-progress' : 'pending'

                return (
                  <div
                    key={assignment._id}
                    onClick={() => handleExerciseClick(assignment)}
                    className="backdrop-blur-xl rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02]" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Exercise Image/Icon */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{
                        background: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        {exercise.imageUrl ? (
                          <img
                            src={exercise.imageUrl.startsWith('http') ? exercise.imageUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.imageUrl}`}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextElementSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: exercise.imageUrl ? 'none' : 'flex' }}>
                          <Dumbbell className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>

                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-lg font-bold text-white truncate">{exercise.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
                            status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {assignment.sets || exercise.sets || '-'} sets × {assignment.reps || exercise.reps || '-'} reps
                          {assignment.weight && ` | ${assignment.weight} kg`}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Assigned by Trainer
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Controls */}
                    {!assignment.isCompleted && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300">Sets:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProgressUpdate(assignment._id, 'sets', -1)
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                          >
                            <Minus className="w-4 h-4 text-gray-300" />
                          </button>
                          <span className="text-white font-semibold w-8 text-center">
                            {assignment.setsCompleted || 0}/{assignment.sets || exercise.sets || 0}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProgressUpdate(assignment._id, 'sets', 1)
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                          >
                            <Plus className="w-4 h-4 text-gray-300" />
                          </button>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {showDetailModal && selectedExercise && (
        <ExerciseDetailModal
          assignment={selectedExercise}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedExercise(null)
          }}
          onComplete={(assignmentId) => markCompleteMutation.mutate(assignmentId)}
          onProgressUpdate={handleProgressUpdate}
          isCompleting={markCompleteMutation.isLoading}
        />
      )}
    </MemberLayout>
  )
}

// Exercise Detail Modal Component
function ExerciseDetailModal({ assignment, onClose, onComplete, onProgressUpdate, isCompleting }) {
  const exercise = assignment.exerciseId
  if (!exercise) return null

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
        {/* Header */}
        <div className="sticky top-0 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between" style={{
          background: 'rgba(26, 35, 50, 0.9)'
        }}>
          <h3 className="text-xl font-bold text-white">Exercise Detail</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <span className="text-white text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Exercise Image/Video */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: 'rgba(255, 255, 255, 0.1)'
          }}>
            {exercise.imageUrl ? (
              <img
                src={exercise.imageUrl.startsWith('http') ? exercise.imageUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.imageUrl}`}
                alt={exercise.name}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center">
                <Dumbbell className="w-20 h-20 text-gray-400" />
              </div>
            )}
          </div>

          {/* Exercise Name */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{exercise.name}</h2>
            <p className="text-gray-300">{exercise.description}</p>
          </div>

          {/* Exercise Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="backdrop-blur-xl rounded-xl p-4 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div className="text-sm text-gray-300 mb-1">Sets</div>
              <div className="text-2xl font-bold text-white">{assignment.sets || exercise.sets || '-'}</div>
            </div>
            <div className="backdrop-blur-xl rounded-xl p-4 text-center" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div className="text-sm text-gray-300 mb-1">Reps</div>
              <div className="text-2xl font-bold text-white">{assignment.reps || exercise.reps || '-'}</div>
            </div>
            {assignment.weight && (
              <>
                <div className="backdrop-blur-xl rounded-xl p-4 text-center" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div className="text-sm text-gray-300 mb-1">Weight</div>
                  <div className="text-2xl font-bold text-white">{assignment.weight}</div>
                </div>
                <div className="backdrop-blur-xl rounded-xl p-4 text-center" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div className="text-sm text-gray-300 mb-1">Rest</div>
                  <div className="text-2xl font-bold text-white">{assignment.restTime || exercise.restTime || '-'}</div>
                </div>
              </>
            )}
          </div>

          {/* Progress Tracking */}
          {!assignment.isCompleted && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sets Completed</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onProgressUpdate(assignment._id, 'sets', -1)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Minus className="w-5 h-5 text-gray-300" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-white">
                      {assignment.setsCompleted || 0} / {assignment.sets || exercise.sets || 0}
                    </div>
                  </div>
                  <button
                    onClick={() => onProgressUpdate(assignment._id, 'sets', 1)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Plus className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="backdrop-blur-xl rounded-xl p-4" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Play className="w-4 h-4 text-green-400" />
                Instructions
              </h4>
              <ol className="space-y-2">
                {exercise.instructions.map((instruction, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex gap-2">
                    <span className="font-bold text-green-400">{instruction.step}.</span>
                    <span>{instruction.description}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!assignment.isCompleted ? (
              <button
                onClick={() => onComplete(assignment._id)}
                disabled={isCompleting}
                className="flex-1 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                  boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
                }}
              >
                {isCompleting ? 'Marking...' : 'Mark Complete'}
              </button>
            ) : (
              <div className="flex-1 py-4 rounded-xl font-bold text-center text-green-400" style={{
                background: 'rgba(139, 195, 74, 0.2)',
                border: '1px solid rgba(139, 195, 74, 0.3)'
              }}>
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Completed
              </div>
            )}
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-xl font-bold text-gray-300 transition-all hover:bg-white/10"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

