import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
  Dumbbell, 
  Plus, 
  Search,
  Filter,
  Grid,
  List,
  Edit2,
  Trash2,
  Eye,
  X,
  Loader
} from 'lucide-react';

const CATEGORIES = ['All', 'strength', 'cardio', 'flexibility', 'other'];
const MUSCLE_GROUPS = ['All', 'chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs', 'core', 'full-body'];
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced'];

export default function Exercises() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Fetch exercises
  const { data: exercisesData, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get('/exercises').then(res => res.data)
  });

  const exercises = exercisesData?.exercises || [];

  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || exercise.category === selectedCategory;
    const matchesMuscleGroup = selectedMuscleGroup === 'All' || 
                              exercise.muscleGroups?.includes(selectedMuscleGroup);
    const matchesDifficulty = selectedDifficulty === 'All' || exercise.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesMuscleGroup && matchesDifficulty;
  });

  // Get exercise image
  const getExerciseImage = (exercise) => {
    if (exercise.imageUrl) {
      if (exercise.imageUrl.startsWith('http')) {
        return exercise.imageUrl;
      }
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      return `${backendUrl}${exercise.imageUrl}`;
    }
    return '/exercises/Push Ups.jpg'; // Fallback
  };

  // Delete exercise mutation
  const deleteMutation = useMutation({
    mutationFn: (exerciseId) => api.delete(`/exercises/${exerciseId}`),
    onSuccess: () => {
      toast.success('Exercise deleted successfully');
      queryClient.invalidateQueries(['exercises']);
      setSelectedExercise(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete exercise');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10"
           style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{
                     background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                     boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)'
                   }}>
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Exercise Library</h1>
                <p className="text-sm text-gray-400">{filteredExercises.length} exercises available</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  showFilters 
                    ? 'bg-violet-600 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}>
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Muscle Group</label>
                  <select
                    value={selectedMuscleGroup}
                    onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {MUSCLE_GROUPS.map(group => (
                      <option key={group} value={group} className="bg-slate-800">{group}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {DIFFICULTIES.map(diff => (
                      <option key={diff} value={diff} className="bg-slate-800">{diff}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-20">
            <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No exercises found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredExercises.map((exercise) => (
              <div
                key={exercise._id}
                className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-2xl hover:shadow-violet-500/20"
                style={{ backdropFilter: 'blur(10px)' }}>
                
                {/* Exercise Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-violet-900/20 to-purple-900/20">
                  <img
                    src={getExerciseImage(exercise)}
                    alt={exercise.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/exercises/Push Ups.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  
                  {/* Difficulty Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold
                      ${exercise.difficulty === 'beginner' ? 'bg-green-500/90 text-white' :
                        exercise.difficulty === 'intermediate' ? 'bg-yellow-500/90 text-white' :
                        'bg-red-500/90 text-white'}`}>
                      {exercise.difficulty}
                    </span>
                  </div>
                </div>

                {/* Exercise Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{exercise.name}</h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{exercise.description || 'No description'}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {exercise.category}
                    </span>
                    {exercise.muscleGroups?.slice(0, 2).map((muscle, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {muscle}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Sets</div>
                      <div className="text-sm font-bold text-white">{exercise.sets || '-'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Reps</div>
                      <div className="text-sm font-bold text-white">{exercise.reps || '-'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Rest</div>
                      <div className="text-sm font-bold text-white text-[10px]">{exercise.restTime?.split(' ')[0] || '-'}s</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedExercise(exercise)}
                      className="flex-1 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(exercise._id)}
                      disabled={deleteMutation.isLoading}
                      className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
             onClick={() => setSelectedExercise(null)}>
          <div className="max-w-2xl w-full bg-slate-900 rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{selectedExercise.name}</h2>
              <button
                onClick={() => setSelectedExercise(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <img
                src={getExerciseImage(selectedExercise)}
                alt={selectedExercise.name}
                className="w-full h-64 object-cover rounded-xl"
                onError={(e) => {
                  e.target.src = '/exercises/Push Ups.jpg';
                }}
              />
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300">{selectedExercise.description || 'No description available'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Category</div>
                  <div className="text-lg font-semibold text-white capitalize">{selectedExercise.category}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Difficulty</div>
                  <div className="text-lg font-semibold text-white capitalize">{selectedExercise.difficulty}</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-2">Muscle Groups</div>
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.muscleGroups?.map((muscle, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-sm bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Sets</div>
                  <div className="text-2xl font-bold text-white">{selectedExercise.sets}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Reps</div>
                  <div className="text-2xl font-bold text-white">{selectedExercise.reps}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Rest Time</div>
                  <div className="text-2xl font-bold text-white text-sm">{selectedExercise.restTime}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
