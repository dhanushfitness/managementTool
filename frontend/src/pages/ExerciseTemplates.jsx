import { exercises as staticExercises } from '../data/exercises';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
  Clipboard, 
  Plus, 
  Search,
  Edit2,
  Trash2,
  Copy,
  User,
  Calendar,
  Dumbbell,
  X,
  Loader, 
  Check,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper for image URLs (replicated from MemberDetails to ensure consistency)
const getExerciseImageUrl = (exerciseName) => {
  if (!exerciseName) return null
  const normalizedName = exerciseName.toUpperCase().replace(/[^A-Z0-9]/g, '')
  
  // Basic static map for common exercises - expanded map would be ideal but using fallback logic primarily
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

export default function ExerciseTemplates() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  
  // Create Modal State
  const [activeExerciseTab, setActiveExerciseTab] = useState('all');
  const [exercisePickerSearch, setExercisePickerSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredExercisesList, setFilteredExercisesList] = useState([]);

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['exercise-templates'],
    queryFn: () => api.get('/exercise-templates').then(res => res.data)
  });

  // Use static exercises
  const exercises = staticExercises || [];

  // Filter exercises logic for picker
  const filterExercisesByTab = (exercisesList, tab, returnResult = false) => {
    let result = exercisesList;
    if (tab !== 'all') {
      result = exercisesList.filter(ex => {
        const cat = ex.category?.toLowerCase() || '';
        const muscle = ex.muscleGroups?.join(' ').toLowerCase() || '';
        return cat.includes(tab) || muscle.includes(tab);
      });
    }
    if (returnResult) return result;
    // We don't stick this in state usually, but for consistency with MemberDetails patterns:
    if (!exercisePickerSearch) setFilteredExercisesList(result);
    // If search exists, we re-run search on this result in the effect below
  };

  // Debounced search effect
  const handleSearchChange = (val) => {
    setExercisePickerSearch(val);
    const rawValue = val;
    const searchTerm = rawValue.toLowerCase().replace(/[^a-z0-9]/g, '');
    setIsSearching(true);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      let base = exercises;
      if (activeExerciseTab !== 'all') {
        base = filterExercisesByTab(exercises, activeExerciseTab, true);
      }
      
      if (searchTerm) {
        setFilteredExercisesList(base.filter(ex => {
          const normalizedName = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedCategory = ex.category?.toLowerCase() || '';
          return (
            normalizedName.includes(searchTerm) ||
            normalizedCategory.includes(searchTerm) ||
            ex.muscleGroups?.some(mg => mg.toLowerCase().includes(searchTerm))
          );
        }));
      } else {
        setFilteredExercisesList(base);
      }
      setIsSearching(false);
    }, 300);
  };

  // Initialize filtered list when exercises load
  if (filteredExercisesList.length === 0 && exercises.length > 0 && !exercisePickerSearch && activeExerciseTab === 'all') {
    setFilteredExercisesList(exercises);
  }

  // Fetch members for assignment
  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get('/members').then(res => res.data),
    enabled: showAssignModal
  });

  const templates = templatesData?.templates || [];
  const members = membersData?.members || [];

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (templateId) => api.delete(`/exercise-templates/${templateId}`),
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries(['exercise-templates']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete template')
  });

  const duplicateMutation = useMutation({
    mutationFn: (templateId) => api.post(`/exercise-templates/${templateId}/duplicate`),
    onSuccess: () => {
      toast.success('Template duplicated successfully');
      queryClient.invalidateQueries(['exercise-templates']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to duplicate template')
  });

  const assignMutation = useMutation({
    mutationFn: (data) => api.post('/exercise-templates/assign', data),
    onSuccess: () => {
      toast.success('Template assigned to member successfully');
      setShowAssignModal(false);
      setSelectedTemplate(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to assign template')
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/exercise-templates/${data._id}`, data),
    onSuccess: () => {
      toast.success('Template updated successfully');
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', category: 'custom', exercises: [] });
      queryClient.invalidateQueries(['exercise-templates']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update template')
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/exercise-templates', data),
    onSuccess: () => {
      toast.success('Template created successfully');
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', category: 'custom', exercises: [] });
      queryClient.invalidateQueries(['exercise-templates']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to create template')
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom',
    exercises: []
  });

  const handleEditTemplate = (template) => {
    setNewTemplate({
      _id: template._id,
      name: template.name,
      description: template.description,
      category: template.category,
      exercises: template.exercises.map(ex => ({
        exerciseId: ex.exerciseId?._id || ex.exerciseId, // handle if it's populated or id
        name: ex.exerciseId?.name || ex.name,
        category: ex.exerciseId?.category || ex.category,
        muscleGroups: ex.exerciseId?.muscleGroups || ex.muscleGroups,
        description: ex.exerciseId?.description || ex.description,
        imageUrl: ex.exerciseId?.imageUrl || ex.imageUrl,
        videoUrl: ex.exerciseId?.videoUrl || ex.videoUrl,
        weekDay: ex.weekDay,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        restTime: ex.restTime,
        notes: ex.notes
      }))
    });
    setShowCreateModal(true);
  };

  const handleAddExerciseToTemplate = (exercise) => {
    setNewTemplate(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exerciseId: exercise._id,
          name: exercise.name,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
          description: exercise.description,
          imageUrl: exercise.imageUrl,
          videoUrl: exercise.videoUrl,
          weekDay: 1,
          sets: 3,
          reps: '12',
          weight: '',
          restTime: '60',
          notes: ''
        }
      ]
    }));
    toast.success('Added to template');
  };

  const handleRemoveExerciseFromTemplate = (index) => {
    setNewTemplate(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    setNewTemplate(prev => {
      const updated = [...prev.exercises];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, exercises: updated };
    });
  };

  const groupExercisesByDay = (template) => {
    const grouped = {};
    WEEKDAYS.forEach((_, index) => { grouped[index] = []; });
    template.exercises?.forEach(ex => {
      if (ex.weekDay !== undefined && grouped[ex.weekDay]) grouped[ex.weekDay].push(ex);
    });
    return grouped;
  };

  const handleAssignTemplate = (memberId) => {
    if (!selectedTemplate) return;
    assignMutation.mutate({ templateId: selectedTemplate._id, memberId });
  };

  const handleCreateOrUpdate = () => {
    if (newTemplate._id) {
        updateMutation.mutate(newTemplate);
    } else {
        createMutation.mutate(newTemplate);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clipboard className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Exercise Templates</h1>
                <p className="text-sm text-gray-500">{filteredTemplates.length} templates available</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setNewTemplate({ name: '', description: '', category: 'custom', exercises: [] });
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl shadow-orange-500/20"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {templatesLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Clipboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-6">Create your first workout template to get started</p>
            <button
              onClick={() => {
                setNewTemplate({ name: '', description: '', category: 'custom', exercises: [] });
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => {
              const isExpanded = expandedTemplate === template._id;
              const exercisesByDay = groupExercisesByDay(template);
              const totalExercises = template.exercises?.length || 0;

              return (
                <div key={template._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{template.description || 'No description'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ml-4 uppercase
                        ${template.category === 'beginner' ? 'bg-green-100 text-green-700' :
                          template.category === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                          template.category === 'advanced' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'}`}>
                        {template.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4" />
                        <span>{totalExercises} exercises</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{Object.values(exercisesByDay).filter(day => day.length > 0).length} days</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Weekly Schedule</h4>
                      <div className="space-y-3">
                        {WEEKDAYS.map((day, index) => {
                          const dayExercises = exercisesByDay[index] || [];
                          if (dayExercises.length === 0) return null;
                          return (
                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                              <div className="font-semibold text-gray-700 mb-2">{day}</div>
                              <div className="space-y-1">
                                {dayExercises.map((ex, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm text-gray-600">
                                    <span>{ex.exerciseId?.name || ex.name || 'Unknown Exercise'}</span>
                                    <span className="text-gray-400">{ex.sets}x{ex.reps}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setExpandedTemplate(isExpanded ? null : template._id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Hide' : 'View'} Details
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {!template.isDefault && (
                       <div className="flex gap-2">
                           <button onClick={() => duplicateMutation.mutate(template._id)} className="p-2 rounded-lg bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                             <Copy className="w-4 h-4" />
                           </button>
                           <button onClick={() => deleteMutation.mutate(template._id)} className="p-2 rounded-lg bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setShowCreateModal(false)}>
          <div className="max-w-[95vw] w-full bg-white rounded-2xl border border-gray-200 h-[90vh] overflow-hidden flex flex-col shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="flex-none p-5 border-b border-gray-200 flex items-center justify-between bg-white z-20">
              <h2 className="text-2xl font-bold text-gray-900">{newTemplate._id ? 'Edit Template' : 'Create New Template'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-50 min-h-0">
              {/* Left Panel: Exercise Picker (Grid Layout) */}
              <div className="w-full md:w-3/5 p-6 border-r border-gray-200 overflow-y-auto bg-gray-50 h-full">
                <div className="mb-4 space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="flex-1 relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input
                         type="text"
                         placeholder="Search exercises..."
                         value={exercisePickerSearch}
                         onChange={(e) => handleSearchChange(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                       />
                     </div>
                  </div>
                  
                   {/* Tabs */}
                   <div className="overflow-x-auto">
                     <div className="flex space-x-2 pb-2">
                       {['all', 'cardio', 'chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'core'].map(tab => (
                         <button
                           key={tab}
                           onClick={() => { setActiveExerciseTab(tab); filterExercisesByTab(exercises, tab); }}
                           className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-colors
                             ${activeExerciseTab === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                         >
                           {tab}
                         </button>
                       ))}
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isSearching ? (
                     <div className="col-span-full py-12 flex justify-center"><Loader className="animate-spin text-orange-600" /></div>
                  ) : filteredExercisesList.length === 0 ? (
                     <div className="col-span-full py-12 text-center text-gray-500">No exercises found</div>
                  ) : (
                    filteredExercisesList.map((exercise) => {
                       const uniqueId = exercise._id;
                       const isPlaying = playingVideo === uniqueId;
                       const hasVideo = !!exercise.videoUrl;
                       
                       let videoId = null;
                       if (hasVideo) {
                         try {
                           if (exercise.videoUrl.includes('shorts/')) videoId = exercise.videoUrl.split('shorts/')[1].split('?')[0];
                           else if (exercise.videoUrl.includes('youtu.be/')) videoId = exercise.videoUrl.split('youtu.be/')[1].split('?')[0];
                           else if (exercise.videoUrl.includes('v=')) videoId = exercise.videoUrl.split('v=')[1].split('&')[0];
                         } catch (e) {}
                       }
                       
                       let imageUrl = getExerciseImageUrl(exercise.name);
                       if (!imageUrl && exercise.imageUrl && !exercise.imageUrl.includes('unsplash.com')) {
                          imageUrl = exercise.imageUrl.startsWith('http') ? exercise.imageUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.imageUrl}`;
                       }
                       const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                       return (
                         <div key={exercise._id} className="group relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-orange-500 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer max-h-[400px]">
                            {/* Media - Aspect Ratio Square for consistent height with image */}
                            <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                               {hasVideo && isPlaying ? (
                                 <iframe 
                                   width="100%" height="100%" 
                                   src={`${getEmbedUrl(exercise.videoUrl)}?autoplay=1&mute=1&rel=0`} 
                                   frameBorder="0" allowFullScreen 
                                   className="w-full h-full"
                                 />
                               ) : (
                                 <div className="relative w-full h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); if(hasVideo) setPlayingVideo(uniqueId); }}>
                                    <img 
                                      src={thumbnailUrl || imageUrl} 
                                      alt={exercise.name} 
                                      className={`w-full h-full ${thumbnailUrl ? 'object-cover' : 'object-contain p-4 mix-blend-multiply'}`}
                                    />
                                    {hasVideo && (
                                       <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                                          </div>
                                       </div>
                                    )}
                                 </div>
                               )}
                            </div>
                            
                            {/* Info & Add Button */}
                            <div className="p-4 bg-white flex flex-col justify-between flex-grow border-t border-gray-100">
                               <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-gray-900 text-base uppercase leading-tight line-clamp-2 pr-2" title={exercise.name}>{exercise.name}</h4>
                                  <button onClick={() => handleAddExerciseToTemplate(exercise)} className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 p-1 rounded-full transition-colors flex-shrink-0" title="Add to Template">
                                     <Plus className="w-6 h-6" />
                                  </button>
                               </div>
                               <div className="flex flex-wrap gap-2 mt-auto">
                                  {(exercise.muscleGroups || []).slice(0, 3).map((mg, i) => (
                                     <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide">{mg}</span>
                                  ))}
                                  {(exercise.category) && (
                                     <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide">{exercise.category}</span>
                                  )}
                               </div>
                            </div>
                         </div>
                       );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Template Config */}
              <div className="w-full md:w-2/5 h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden min-h-0">
                 <div className="flex-none p-6 pb-2 border-b border-gray-100 bg-white z-10">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                        <input
                          type="text"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          placeholder="e.g., Full Body Strength"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                        <textarea
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none h-20"
                          placeholder="Brief description..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                        <select
                          value={newTemplate.category}
                          onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="strength">Strength</option>
                          <option value="cardio">Cardio</option>
                          <option value="flexibility">Flexibility</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>
                 </div>

                 <div className="flex-none px-6 py-2 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Selected Exercises ({newTemplate.exercises.length})</h3>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                    {newTemplate.exercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <Dumbbell className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">Select exercises from the left</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-4">
                        {newTemplate.exercises.map((item, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </span>
                                <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                              </div>
                              <button onClick={() => handleRemoveExerciseFromTemplate(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-gray-500 mb-0.5">Day</label>
                                <select
                                  value={item.weekDay}
                                  onChange={(e) => handleExerciseChange(index, 'weekDay', parseInt(e.target.value))}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white focus:border-orange-500 focus:outline-none"
                                >
                                  {WEEKDAYS.map((day, i) => (
                                    <option key={i} value={i}>{day}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-500 mb-0.5">Sets</label>
                                <input
                                  type="number"
                                  value={item.sets || ''}
                                  onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white focus:border-orange-500 focus:outline-none"
                                  placeholder="3"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-500 mb-0.5">Reps</label>
                                <input
                                  type="text"
                                  value={item.reps || ''}
                                  onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white focus:border-orange-500 focus:outline-none"
                                  placeholder="12"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-500 mb-0.5">Rest (s)</label>
                                <input
                                  type="text"
                                  value={item.restTime || ''}
                                  onChange={(e) => handleExerciseChange(index, 'restTime', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white focus:border-orange-500 focus:outline-none"
                                  placeholder="60"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-none p-5 border-t border-gray-200 bg-white flex justify-end gap-3 sticky bottom-0 z-20">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={createMutation.isLoading || updateMutation.isLoading || !newTemplate.name || newTemplate.exercises.length === 0}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {createMutation.isLoading || updateMutation.isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {newTemplate._id ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Template Modal */}
      {showAssignModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setShowAssignModal(false)}>
          <div className="max-w-xl w-full bg-white rounded-2xl border border-gray-200 max-h-[90vh] overflow-y-auto shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Assign "{selectedTemplate.name}"</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-6">Select a member to assign this template to. This will add the workout plan to their schedule.</p>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => handleAssignTemplate(member._id)}
                    disabled={assignMutation.isLoading}
                    className="w-full p-4 rounded-xl border border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-orange-700">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email || member.phone}</div>
                    </div>
                    <Check className="w-5 h-5 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
