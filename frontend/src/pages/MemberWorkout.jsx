import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import MemberLayout from '../components/MemberLayout'
import { 
  Dumbbell, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Play, 
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react'

export default function MemberWorkout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekNumber, setWeekNumber] = useState(1)

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
      toast.success('Exercise marked as completed!')
      queryClient.invalidateQueries(['member-my-exercises', member._id])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark exercise as completed')
    }
  })

  const handleDateChange = (days) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const assignments = assignmentsData?.assignments || []

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
                <h1 className="text-lg font-bold text-white">Workouts</h1>
              </div>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="sticky top-[73px] z-30 backdrop-blur-xl" style={{
        background: 'rgba(26, 35, 50, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
            <div className="text-center flex-1">
              <div className="text-xl font-bold text-white">
                {weekDays[weekDay]}
              </div>
              <div className="text-sm text-gray-300">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            <button
              onClick={() => handleDateChange(1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Exercises repeat every week</p>
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div className="max-w-md mx-auto px-4 pb-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-300">Loading your exercises...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="backdrop-blur-xl rounded-3xl p-8 text-center" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Exercises Today</h3>
            <p className="text-gray-300">
              You don't have any exercises assigned for {weekDays[weekDay]}
            </p>
          </div>
        ) : (
          assignments.map((assignment, index) => {
            const exercise = assignment.exerciseId
            if (!exercise) return null

            return (
              <div
                key={assignment._id}
                className="backdrop-blur-xl rounded-2xl overflow-hidden" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Exercise Header */}
                <div className="p-4" style={{
                  background: 'linear-gradient(135deg, rgba(139, 195, 74, 0.3) 0%, rgba(124, 179, 66, 0.3) 100%)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: '#fff'
                        }}>
                          #{index + 1}
                        </span>
                        <span className="text-xs px-2 py-1 rounded capitalize" style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: '#fff'
                        }}>
                          {exercise.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{exercise.name}</h3>
                    </div>
                    {assignment.isCompleted && (
                      <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0" />
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Description */}
                  {exercise.description && (
                    <p className="text-gray-300 text-sm leading-relaxed">{exercise.description}</p>
                  )}

                  {/* Exercise Details */}
                  <div className={`grid gap-3 ${assignment.weight ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-xs text-gray-300 mb-1">Sets</div>
                      <div className="text-lg font-bold text-white">
                        {assignment.sets || exercise.sets || '-'}
                      </div>
                    </div>
                    <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-xs text-gray-300 mb-1">Reps</div>
                      <div className="text-lg font-bold text-white">
                        {assignment.reps || exercise.reps || '-'}
                      </div>
                    </div>
                    {assignment.weight && (
                      <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <div className="text-xs text-gray-300 mb-1">Weight</div>
                        <div className="text-lg font-bold text-white">
                          {assignment.weight}
                        </div>
                      </div>
                    )}
                    <div className="backdrop-blur-xl rounded-xl p-3 text-center" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="text-xs text-gray-300 mb-1">Rest</div>
                      <div className="text-lg font-bold text-white">
                        {assignment.restTime || exercise.restTime || '-'}
                      </div>
                    </div>
                  </div>
                  
                  {assignment.variationId && exercise.variations && (
                    <div className="backdrop-blur-xl rounded-xl p-3" style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <span className="font-semibold text-blue-300">Variation: </span>
                      <span className="text-blue-200">
                        {exercise.variations.find(v => v._id === assignment.variationId)?.name || 'Custom'}
                      </span>
                    </div>
                  )}

                  {/* Image and Video Section */}
                  {(exercise.imageUrl || exercise.videoUrl) && (
                    <div className="grid grid-cols-1 gap-3">
                      {/* Image */}
                      {exercise.imageUrl && (
                        <div className="rounded-xl overflow-hidden" style={{
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          <img
                            src={exercise.imageUrl.startsWith('http') ? exercise.imageUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.imageUrl}`}
                            alt={exercise.name}
                            className="w-full h-64 object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Video */}
                      {exercise.videoUrl && (
                        <div className="rounded-xl overflow-hidden bg-black" style={{
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          {exercise.videoUrl.includes('youtube.com') || exercise.videoUrl.includes('youtu.be') ? (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={(() => {
                                  let videoId = ''
                                  if (exercise.videoUrl.includes('youtube.com/watch?v=')) {
                                    videoId = exercise.videoUrl.split('v=')[1]?.split('&')[0]
                                  } else if (exercise.videoUrl.includes('youtu.be/')) {
                                    videoId = exercise.videoUrl.split('youtu.be/')[1]?.split('?')[0]
                                  } else if (exercise.videoUrl.includes('youtube.com/embed/')) {
                                    videoId = exercise.videoUrl.split('embed/')[1]?.split('?')[0]
                                  }
                                  return videoId ? `https://www.youtube.com/embed/${videoId}` : exercise.videoUrl
                                })()}
                                title={exercise.name}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <video
                              src={exercise.videoUrl.startsWith('http') ? exercise.videoUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.videoUrl}`}
                              controls
                              className="w-full h-64 object-contain"
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {exercise.instructions && exercise.instructions.length > 0 && (
                    <div className="backdrop-blur-xl rounded-xl p-4" style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-300" />
                        Instructions
                      </h4>
                      <ol className="space-y-2">
                        {exercise.instructions.map((instruction, idx) => (
                          <li key={idx} className="text-sm text-gray-200 flex gap-2">
                            <span className="font-bold text-blue-300">{instruction.step}.</span>
                            <span>{instruction.description}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Notes */}
                  {assignment.notes && (
                    <div className="backdrop-blur-xl rounded-xl p-3" style={{
                      background: 'rgba(251, 191, 36, 0.2)',
                      border: '1px solid rgba(251, 191, 36, 0.3)'
                    }}>
                      <p className="text-sm text-gray-200">
                        <span className="font-semibold">Note:</span> {assignment.notes}
                      </p>
                    </div>
                  )}

                  {/* Complete Button */}
                  {!assignment.isCompleted && (
                    <button
                      onClick={() => markCompleteMutation.mutate(assignment._id)}
                      disabled={markCompleteMutation.isLoading}
                      className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                        boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
                      }}
                    >
                      <CheckCircle className="w-5 h-5" />
                      {markCompleteMutation.isLoading ? 'Marking...' : 'Mark as Completed'}
                    </button>
                  )}

                  {/* Completed Status */}
                  {assignment.isCompleted && (
                    <div className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style={{
                      background: 'rgba(139, 195, 74, 0.2)',
                      border: '1px solid rgba(139, 195, 74, 0.3)',
                      color: '#8BC34A'
                    }}>
                      <CheckCircle className="w-5 h-5" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </MemberLayout>
  )
}

