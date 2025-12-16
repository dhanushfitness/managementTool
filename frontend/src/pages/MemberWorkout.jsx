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
  Search,
  X
} from 'lucide-react'

// Helper function to get exercise image URL from frontend public/exercises folder
const getExerciseImageUrl = (exerciseName) => {
  if (!exerciseName) return null
  
  // Normalize exercise name for matching
  const normalizeName = (name) => {
    return name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }
  
  const normalizedName = normalizeName(exerciseName)
  
  // Map exercise names to image files in public/exercises folder
  const exerciseImageMap = {
    'PUSH-UPS': 'Push Ups.jpg',
    'BENCH-PRESS': 'flat dumbell press.jpg',
    'CHEST-PRESS': 'chest pres.jpg',
    'FLAT DB-PRESS': 'flat dumbell press.jpg',
    'INCLINE DB-PRESS': 'Incline Dumbbell Press.jpg',
    'DECLINE DB-PRESS': 'Dumbbell Decline Fly.jpg',
    'DB-FLY': 'pec fly.jpg',
    'CABLE-CROSS': 'Cable Crossover.jpg',
    'PEC-DECK': 'pec fly.jpg',
    'BENT-OVER-ROW': 'Bent Over Row.jpg',
    'DB-BENT-OVER-ROW': 'Dumbbell Bent Over Row.jpg',
    'ONE-ARM-DB-ROW': 'Dumbbell One Arm Bent Over Row.jpg',
    'LAT-PULLDOWN': 'Lat pull-down.jpg',
    'PULL-UPS': 'Lat pull-down.jpg',
    'T-BAR-ROW': 'Bent Over Row.jpg',
    'SEATED-ROW': 'seated back row.jpg',
    'DEAD-LIFT': 'ROMANIAN DEADLIFT.jpg',
    'ROMANIAN-DEADLIFT': 'ROMANIAN DEADLIFT.jpg',
    'HYPEREXTENSION': 'Hyperextension.jpg',
    'BACK-EXTENSION': 'Back Extension.jpg',
    'SHOULDER-PRESS': 'Overhead Dumbbell Press.jpg',
    'DB-SHOULDER-PRESS': 'seated dumbell press.jpg',
    'LATERAL-RAISE': 'Dumbbell Lateral Raise.jpg',
    'FRONT-RAISE': 'Dumbbell Lateral Raise.jpg',
    'UPRIGHT-ROW': 'upright row.jpg',
    'SHRUGS': 'Dumbbell Shrug.jpg',
    'REAR-DELT-FLY': 'bend over lateral raise.jpg',
    'SQUATS': 'free squats.jpg',
    'LEG-PRESS': 'leg press.jpg',
    'LEG-EXTENSION': 'leg press.jpg',
    'LEG-CURL': 'seated leg curl.jpg',
    'LUNGES': 'Lunge With.jpg',
    'BULGARIAN-SPLIT-SQUAT': 'Bulgarian Split Squat.jpg',
    'CALF-RAISE': 'calf raises.jpg',
    'STEP-UPS': 'Dumbbell Step Up.jpg',
    'BICEP-CURL': 'dumbell curl.jpg',
    'HAMMER-CURL': 'Dumbbell Close Grip Curl.jpg',
    'PREACHER-CURL': 'Preacher Curl.jpg',
    'CABLE-CURL': 'Biceps cable curl.jpg',
    'CONCENTRATION-CURL': 'Dumbbell Incline Biceps Curl.jpg',
    'TRICEP-EXTENSION': 'Dumbbell Standing Triceps Extension.jpg',
    'OVERHEAD-TRICEP': 'Dumbbell Seated Triceps Extension.jpg',
    'TRICEP-PUSHDOWN': 'Cable Tricep Pushdown.jpg',
    'CLOSE-GRIP-BENCH': 'Barbell Close Grip Bench Press.jpg',
    'SKULL-CRUSHERS': 'skull crusher.jpg',
    'CRUNCHES': 'crunches.jpg',
    'SIT-UPS': 'crunches.jpg',
    'PLANK': 'plank.jpg',
    'SIDE-PLANK': 'Side Plank Oblique Crunch.jpg',
    'RUSSIAN-TWIST': 'Russian Twist.jpg',
    'MOUNTAIN-CLIMBER': 'Mountain Climber.jpg',
    'LEG-RAISE': 'abs leg raises.jpg',
    'TREADMILL': 'Treadmill.jpg',
    'RUNNING': 'Treadmill.jpg',
    'BIKE': 'recumbent bike.jpg',
    'CYCLE': 'recumbent bike.jpg',
    'ROWING': 'seated rowing.jpg',
    'ELLIPTICAL': 'elliptical.jpg',
  }
  
  // Try to find exact match first
  if (exerciseImageMap[normalizedName]) {
    return `/exercises/${exerciseImageMap[normalizedName]}`
  }
  
  // Try partial matching - check if any key is contained in the normalized name or vice versa
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return `/exercises/${imageFile}`
    }
  }
  
  // Try word-based matching - check if significant words match
  const exerciseWords = normalizedName.split('-').filter(w => w.length > 3)
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    const keyWords = key.split('-').filter(w => w.length > 3)
    const matchingWords = exerciseWords.filter(word => 
      keyWords.some(keyWord => keyWord.includes(word) || word.includes(keyWord))
    )
    if (matchingWords.length >= 1) {
      return `/exercises/${imageFile}`
    }
  }
  
  // Final fallback: try to match by first significant word in image filename
  if (exerciseWords.length > 0) {
    const firstWord = exerciseWords[0]
    for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
      const imageNameUpper = imageFile.toUpperCase().replace('.JPG', '').replace(/[^A-Z0-9]/g, '')
      if (imageNameUpper.includes(firstWord) && firstWord.length > 4) {
        return `/exercises/${imageFile}`
      }
    }
  }
  
  // Ultimate fallback: return a default image that should always exist
  return `/exercises/Push Ups.jpg`
}

// Helper function to resolve exercise image with fallback logic
const resolveExerciseImage = (exercise) => {
  if (!exercise) return null
  
  // Get image from public/exercises folder first
  let imageUrl = getExerciseImageUrl(exercise.name)
  
  // If no match found in local folder, try database imageUrl (but skip Unsplash URLs)
  if (!imageUrl && exercise.imageUrl && !exercise.imageUrl.includes('unsplash.com')) {
    if (exercise.imageUrl.startsWith('http://') || exercise.imageUrl.startsWith('https://')) {
      imageUrl = exercise.imageUrl
    } else {
      // Relative path - prepend backend URL
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
      imageUrl = `${backendUrl}${exercise.imageUrl.startsWith('/') ? '' : '/'}${exercise.imageUrl}`
    }
  }
  
  // Final fallback to default image
  if (!imageUrl) {
    imageUrl = '/exercises/Push Ups.jpg'
  }
  
  return imageUrl
}

export default function MemberWorkout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekNumber, setWeekNumber] = useState(1)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
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
        {/* Search Bar */}
        {showSearch && (
          <div className="backdrop-blur-xl rounded-xl p-3" style={{
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

                  {/* Exercise Image Section */}
                  {(() => {
                    const imageUrl = resolveExerciseImage(exercise)
                    if (!imageUrl) return null
                    
                    return (
                      <div className="rounded-xl overflow-hidden" style={{
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.05)'
                      }}>
                        <img
                          src={imageUrl}
                          alt={exercise.name}
                          className="w-full h-64 object-cover"
                          onError={(e) => {
                            // Hide image and show fallback icon
                            e.target.style.display = 'none'
                            const fallback = e.target.nextElementSibling
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div 
                          className="w-full h-64 flex items-center justify-center" 
                          style={{ display: 'none' }}
                        >
                          <Dumbbell className="w-16 h-16 text-gray-400" />
                        </div>
                      </div>
                    )
                  })()}

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

