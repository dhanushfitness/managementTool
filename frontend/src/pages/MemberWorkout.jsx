import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import MemberLayout from '../components/MemberLayout'
import { exercises as staticExercises } from '../data/exercises'
import {
  Dumbbell,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Utensils
} from 'lucide-react'

// Helper for video URLs
const getEmbedUrl = (url) => {
  if (!url) return null;
  try {
    if (url.includes('youtube.com/shorts/')) return `https://www.youtube.com/embed/${url.split('youtube.com/shorts/')[1].split('?')[0]}`;
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
    if (url.includes('youtube.com/watch')) {
      const vParam = url.split('v=')[1];
      if (vParam) return `https://www.youtube.com/embed/${vParam.split('&')[0]}`;
    }
  } catch (e) { console.error('Error parsing video URL:', e); }
  return url;
}

// Find video from static data if missing
const findStaticVideoUrl = (name) => {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = staticExercises.find(ex =>
    ex.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  );
  return found?.videoUrl || null;
}

// Helper function to get exercise image URL (fallback)
const getExerciseImageUrl = (exerciseName) => {
  if (!exerciseName) return null
  const normalizedName = exerciseName.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const exerciseImageMap = {
    'BENCH-PRESS': 'bench press.jpg',
    'SQUAT': 'squats.jpg',
    'DEADLIFT': 'deadlift.jpg',
    'PULL-UP': 'pull ups.jpg',
    'PUSH-UP': 'push ups.jpg',
    'SHOULDER-PRESS': 'shoulder press.jpg',
    'DUMBBELL-CURL': 'bicep curls.jpg',
    'TRICEP-EXTENSION': 'tricep extension.jpg',
    'LUNGES': 'lunges.jpg',
    'PLANK': 'plank.jpg',
    'TREADMILL': 'Treadmill.jpg',
    'ELLIPTICAL': 'elliptical.jpg',
  }

  if (exerciseImageMap[normalizedName]) return `/exercises/${exerciseImageMap[normalizedName]}`

  // Try partial matching
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) return `/exercises/${imageFile}`
  }

  // Fallback
  return '/exercises/Push Ups.jpg'
}

const resolveExerciseImage = (exercise) => {
  if (!exercise) return null

  let imageUrl = getExerciseImageUrl(exercise.name)

  if (!imageUrl && exercise.imageUrl && !exercise.imageUrl.includes('unsplash.com')) {
    if (exercise.imageUrl.startsWith('http')) {
      imageUrl = exercise.imageUrl
    } else {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
      imageUrl = `${backendUrl}${exercise.imageUrl.startsWith('/') ? '' : '/'}${exercise.imageUrl}`
    }
  }

  if (!imageUrl) imageUrl = '/exercises/Push Ups.jpg'
  return imageUrl
}


export default function MemberWorkout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('workouts') // 'workouts' | 'diet'

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

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['member-my-exercises', member._id, weekDay],
    queryFn: () => api.get('/member/exercises/my-exercises', {
      params: { weekDay }
    }).then(res => res.data),
    enabled: !!member._id && !!token && activeTab === 'workouts',
    retry: 1
  })

  // Fetch full member profile to get Diet Plan
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn: () => api.get('/member-auth/profile').then(res => res.data),
    enabled: !!token
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
  const dietPlan = profileData?.member?.dietPlan || ''

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #8BC34A 0%, #7CB342 100%)',
                boxShadow: '0 4px 20px rgba(139, 195, 74, 0.4)'
              }}>
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Fitness Plan</h1>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 rounded-xl bg-black/20 backdrop-blur-md border border-white/10">
            <button
              onClick={() => setActiveTab('workouts')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'workouts'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              <Dumbbell className="w-4 h-4" />
              Workouts
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'diet'
                  ? 'bg-white/10 text-white shadow-sm border border-white/10'
                  : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              <Utensils className="w-4 h-4" />
              Diet
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'workouts' ? (
        <>
          {/* Date Navigation */}
          <div className="sticky top-[138px] z-30 backdrop-blur-xl" style={{
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
          <div className="max-w-md mx-auto px-4 pb-4 space-y-4 pt-4">
            {/* Search Bar */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <Search className="w-4 h-4" /> {showSearch ? 'Hide Search' : 'Search Exercises'}
              </button>
            </div>

            {showSearch && (
              <div className="backdrop-blur-xl rounded-xl p-3 mb-4" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
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
              </div>
            )}

            {assignmentsLoading ? (
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
                  {searchQuery
                    ? 'No exercises found matching your search'
                    : `You don't have any exercises assigned for ${weekDays[weekDay]}`}
                </p>
              </div>
            ) : (
              assignments
                .filter(assignment => {
                  if (!searchQuery) return true
                  const exercise = assignment.exerciseId
                  if (!exercise) return false
                  return exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
                })
                .map((assignment, index) => {
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

                        {/* Media (Video prioritized) */}
                        {(() => {
                          // Resolve video URL inside the rendering block to avoid closure issues
                          const currentVideoUrl = exercise.videoUrl || findStaticVideoUrl(exercise.name);
                          const hasVideo = !!currentVideoUrl;

                          if (hasVideo) {
                            // Extract video ID immediately to prevent stale references
                            let videoId = null
                            try {
                              if (currentVideoUrl.includes('shorts/')) {
                                videoId = currentVideoUrl.split('shorts/')[1].split('?')[0]
                              } else if (currentVideoUrl.includes('youtu.be/')) {
                                videoId = currentVideoUrl.split('youtu.be/')[1].split('?')[0]
                              } else if (currentVideoUrl.includes('v=')) {
                                videoId = currentVideoUrl.split('v=')[1].split('&')[0]
                              }
                            } catch (e) {
                              console.error('Error extracting video ID for', exercise.name, e)
                            }

                            const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null

                            if (thumbnailUrl) {
                              return (
                                <div className="rounded-xl overflow-hidden relative group" style={{
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  background: 'rgba(0, 0, 0, 0.5)',
                                  aspectRatio: '16/9'
                                }}>
                                  <img
                                    src={thumbnailUrl}
                                    alt={exercise.name}
                                    className="w-full h-full object-cover opacity-90"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                      <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
                                    </div>
                                  </div>
                                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-medium text-white">
                                    Watch Video
                                  </div>
                                  <a
                                    href={currentVideoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 z-10"
                                    aria-label={`Watch ${exercise.name} video`}
                                  />
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}

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
        </>
      ) : (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="backdrop-blur-xl rounded-2xl overflow-hidden p-6" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Utensils className="w-6 h-6 text-green-400" />
              Diet Plan
            </h2>
            {profileLoading ? (
              <div className="text-gray-300 animate-pulse">Loading diet plan...</div>
            ) : dietPlan ? (
              <div className="prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap">
                {dietPlan}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No diet plan assigned yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </MemberLayout>
  )
}

