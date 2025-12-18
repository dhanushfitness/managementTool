import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Upload, Camera, User } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import DateInput from './DateInput'

export default function AddMemberModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('personal')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [facingMode, setFacingMode] = useState('user') // 'user' for front camera, 'environment' for back
  const [errorMessage, setErrorMessage] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    countryCode: '+91',
    phone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    customerType: '',
    leadSource: '',
    salesRep: '',
    memberManager: '',
    mailerList: '',
    generalTrainer: '',
    emergencyContactName: '',
    emergencyContactCountryCode: '+91',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    communicationPreferences: {
      sms: true,
      mail: true,
      pushNotification: true,
      whatsapp: true
    },
    // Fitness Profile
    bodyWeight: '',
    bmi: '',
    fatPercentage: '',
    visualFatPercentage: '',
    bodyAge: '',
    musclePercentage: '',
    cardiovascularTestReport: '',
    muscleStrengthReport: '',
    muscleEndurance: '',
    coreStrength: '',
    flexibility: '',
    height: '',
    age: '',
    profilePicture: null
  })

  const queryClient = useQueryClient()

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  // Fetch plans/services
  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: isOpen
  })

  const createMemberMutation = useMutation({
    mutationFn: (data) => api.post('/members', data),
    onSuccess: () => {
      setErrorMessage('')
      toast.success('Member created successfully')
      queryClient.invalidateQueries(['members'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onClose()
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        countryCode: '+91',
        phone: '',
        email: '',
        gender: '',
        dateOfBirth: '',
        address: '',
        customerType: '',
        leadSource: '',
        salesRep: '',
        memberManager: '',
        mailerList: '',
        generalTrainer: '',
        emergencyContactName: '',
        emergencyContactCountryCode: '+91',
        emergencyContactNumber: '',
        emergencyContactRelationship: '',
        communicationPreferences: {
          sms: true,
          mail: true,
          pushNotification: true,
          whatsapp: true
        },
        bodyWeight: '',
        bmi: '',
        fatPercentage: '',
        visualFatPercentage: '',
        bodyAge: '',
        musclePercentage: '',
        cardiovascularTestReport: '',
        muscleStrengthReport: '',
        muscleEndurance: '',
        coreStrength: '',
        flexibility: '',
        height: '',
        age: ''
      })
    },
    onError: (error) => {
      console.error('Member creation error:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      
      // Try multiple possible error message locations
      const errorMsg = 
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.errorMessage ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        error.message ||
        'Failed to create member'
      
      // Show detailed error in console
      if (error.response?.data) {
        console.error('Full error data:', JSON.stringify(error.response.data, null, 2))
      }
      
      // Set error message in state to display in modal
      setErrorMessage(errorMsg)
      
      // Show toast with error message and high z-index
      toast.error(errorMsg, {
        duration: 8000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          padding: '16px',
          fontSize: '14px',
          maxWidth: '500px',
          zIndex: 10005,
        },
        className: 'error-toast',
      })
      
      // Also show alert as backup
      setTimeout(() => {
        if (errorMsg) {
          alert(`Error: ${errorMsg}`)
        }
      }, 100)
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear any previous error messages
    setErrorMessage('')
    
    // Basic validation
    if (!formData.firstName || !formData.firstName.trim()) {
      toast.error('Full Name is required')
      return
    }
    
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Contact Number is required')
      return
    }
    
    if (!formData.email || !formData.email.trim()) {
      toast.error('Email is required')
      return
    }
    
    if (!formData.gender) {
      toast.error('Gender is required')
      return
    }

    // Email validation - check format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    
    // Note: Duplicate email check is handled by the backend
    
    // Split full name if provided in single field
    const nameParts = formData.firstName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || formData.lastName || ''
    
    const memberData = {
      firstName,
      lastName,
      phone: `${formData.countryCode}${formData.phone}`,
      email: formData.email || '',
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || undefined,
      address: {
        street: formData.address
      },
      customerType: formData.customerType,
      source: formData.leadSource,
      salesRep: formData.salesRep || undefined,
      memberManager: formData.memberManager || undefined,
      generalTrainer: formData.generalTrainer || undefined,
      emergencyContact: {
        name: formData.emergencyContactName,
        countryCode: formData.emergencyContactCountryCode,
        phone: formData.emergencyContactNumber,
        relationship: formData.emergencyContactRelationship
      },
      communicationPreferences: formData.communicationPreferences,
      profilePicture: formData.profilePicture || undefined,
      fitnessProfile: {
        bodyWeight: formData.bodyWeight ? parseFloat(formData.bodyWeight) : undefined,
        bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,
        fatPercentage: formData.fatPercentage ? parseFloat(formData.fatPercentage) : undefined,
        visualFatPercentage: formData.visualFatPercentage ? parseFloat(formData.visualFatPercentage) : undefined,
        bodyAge: formData.bodyAge ? parseFloat(formData.bodyAge) : undefined,
        musclePercentage: formData.musclePercentage ? parseFloat(formData.musclePercentage) : undefined,
        cardiovascularTestReport: formData.cardiovascularTestReport || undefined,
        muscleStrengthReport: formData.muscleStrengthReport || undefined,
        muscleEndurance: formData.muscleEndurance ? parseFloat(formData.muscleEndurance) : undefined,
        coreStrength: formData.coreStrength ? parseFloat(formData.coreStrength) : undefined,
        flexibility: formData.flexibility ? parseFloat(formData.flexibility) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        age: formData.age ? parseFloat(formData.age) : undefined,
        gender: formData.gender,
        name: formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : undefined,
        measuredAt: new Date()
      }
    }

    console.log('Submitting member data:', memberData)
    createMemberMutation.mutate(memberData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.includes('communication.')) {
      const prefKey = name.split('communication.')[1]
      setFormData(prev => ({
        ...prev,
        communicationPreferences: {
          ...prev.communicationPreferences,
          [prefKey]: checked
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // In production, upload to cloud storage
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePicture: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const cleanupCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Start camera stream
  const openCameraModal = async (mode = facingMode) => {
    setShowCamera(true)
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser/device.')
      setCameraLoading(false)
      return
    }

    try {
      cleanupCameraStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false
      })

      streamRef.current = stream
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setCameraLoading(false)
          }).catch((err) => {
            console.error('Error playing video:', err)
            setCameraError('Failed to start camera preview.')
            setCameraLoading(false)
          })
        }
      }, 100)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraError('Unable to access camera. Please check permissions and try again.')
      setCameraLoading(false)
    }
  }

  // Stop camera stream
  const stopCamera = () => {
    cleanupCameraStream()
    setShowCamera(false)
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(false)
  }

  // Capture photo from camera
  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) {
      toast.error('Video element not found.')
      return
    }

    if (video.readyState < 2) {
      toast.error('Camera not ready. Please wait a moment.')
      return
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Video dimensions not available. Please try again.')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(imageData)
      toast.success('Photo captured! Review and confirm below.')
    } catch (error) {
      console.error('Error capturing photo:', error)
      toast.error('Failed to capture photo. Please try again.')
    }
  }

  const confirmCapturedPhoto = () => {
    if (!capturedImage) return
    setFormData(prev => ({
      ...prev,
      profilePicture: capturedImage
    }))
    stopCamera()
    toast.success('Photo saved to member profile.')
  }

  // Switch camera (front/back)
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    cleanupCameraStream()
    await openCameraModal(newMode)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cleanupCameraStream()
    }
  }, [])

  // Cleanup camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
    }
  }, [isOpen])

  // Handle video stream when camera modal opens
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [showCamera])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save the current overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow
      // Disable body scroll
      document.body.style.overflow = 'hidden'
      // Cleanup: restore original overflow when modal closes
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])


  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999]" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}
      />
      
      {/* Slide-in Form */}
      <div 
        className={`fixed right-0 top-0 h-full w-3/4 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ 
          position: 'fixed', 
          top: 0, 
          right: 0, 
          height: '100vh', 
          width: '75%',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 10000
        }}
      >
        {/* Loading Overlay */}
        {createMemberMutation.isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 font-semibold">Creating member...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-6 flex items-center justify-between z-10 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold">Add Member</h2>
            <p className="text-sm text-orange-100 mt-1">Fill in the details to create a new member</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mx-8 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  className="inline-flex text-red-500 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-8 sticky top-[104px] z-10">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'personal'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'fitness'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fitness Profile
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {activeTab === 'personal' && (
            <>
              {/* Personal Details */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Picture Section */}
                  <div className="lg:col-span-1">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-inner border-2 border-gray-200">
                        {formData.profilePicture ? (
                          <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-24 h-24 text-gray-400" />
                        )}
                      </div>
                      <div className="w-full space-y-2">
                        <label className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
                          <div className="flex items-center justify-center">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openCameraModal()}
                          className="w-full bg-white border-2 border-orange-500 text-orange-600 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-50 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Capture Photo
                        </button>
                        {formData.profilePicture && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, profilePicture: null }))}
                            className="w-full bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="lg:col-span-2 space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First Name and Last Name"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Country Code
                        </label>
                        <select
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                        >
                          <option value="+91">India (+91)</option>
                          <option value="+1">USA (+1)</option>
                          <option value="+44">UK (+44)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === 'male'}
                            onChange={handleChange}
                            required
                            className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 font-medium">Male</span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={formData.gender === 'female'}
                            onChange={handleChange}
                            className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 font-medium">Female</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <DateInput
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Information */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Lead Information
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Customer type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="customerType"
                      value={formData.customerType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      <option value="individual">Individual</option>
                      <option value="corporate">Corporate</option>
                      <option value="group">Group</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Lead source <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="leadSource"
                      value={formData.leadSource}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      <option value="walk-in">Walk-in</option>
                      <option value="referral">Referral</option>
                      <option value="online">Online</option>
                      <option value="social-media">Social Media</option>
                      <option value="phone-call">Phone Call</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Member Manager */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Member Manager
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sales Rep
                    </label>
                    <select
                      name="salesRep"
                      value={formData.salesRep}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      {staffData?.staff?.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Member Manager
                    </label>
                    <select
                      name="memberManager"
                      value={formData.memberManager}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      {staffData?.staff?.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mailer List
                    </label>
                    <select
                      name="mailerList"
                      value={formData.mailerList}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      General Trainer
                    </label>
                    <select
                      name="generalTrainer"
                      value={formData.generalTrainer}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      {staffData?.staff?.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Country Code
                      </label>
                      <select
                        name="emergencyContactCountryCode"
                        value={formData.emergencyContactCountryCode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      >
                        <option value="+91">India (+91)</option>
                        <option value="+1">USA (+1)</option>
                        <option value="+44">UK (+44)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number
                      </label>
                      <input
                        type="tel"
                        name="emergencyContactNumber"
                        value={formData.emergencyContactNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Communication Preference Settings */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Communication Preference Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all group bg-white">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">SMS</span>
                    <div className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
                      formData.communicationPreferences.sms ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                        formData.communicationPreferences.sms ? 'translate-x-7' : 'translate-x-0'
                      }`} />
                      <input
                        type="checkbox"
                        name="communication.sms"
                        checked={formData.communicationPreferences.sms}
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all group bg-white">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">Mail</span>
                    <div className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
                      formData.communicationPreferences.mail ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                        formData.communicationPreferences.mail ? 'translate-x-7' : 'translate-x-0'
                      }`} />
                      <input
                        type="checkbox"
                        name="communication.mail"
                        checked={formData.communicationPreferences.mail}
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all group bg-white">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">Push Notification</span>
                    <div className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
                      formData.communicationPreferences.pushNotification ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                        formData.communicationPreferences.pushNotification ? 'translate-x-7' : 'translate-x-0'
                      }`} />
                      <input
                        type="checkbox"
                        name="communication.pushNotification"
                        checked={formData.communicationPreferences.pushNotification}
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all group bg-white">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">WhatsApp</span>
                    <div className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${
                      formData.communicationPreferences.whatsapp ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                        formData.communicationPreferences.whatsapp ? 'translate-x-7' : 'translate-x-0'
                      }`} />
                      <input
                        type="checkbox"
                        name="communication.whatsapp"
                        checked={formData.communicationPreferences.whatsapp}
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'fitness' && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                Fitness Profile
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={`${formData.firstName} ${formData.lastName}`}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <input
                    type="text"
                    value={formData.gender || ''}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Body Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="bodyWeight"
                    value={formData.bodyWeight}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    BMI
                  </label>
                  <input
                    type="number"
                    name="bmi"
                    value={formData.bmi}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fat Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="fatPercentage"
                    value={formData.fatPercentage}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Visual Fat Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="visualFatPercentage"
                    value={formData.visualFatPercentage}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Body Age
                  </label>
                  <input
                    type="number"
                    name="bodyAge"
                    value={formData.bodyAge}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Muscle Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="musclePercentage"
                    value={formData.musclePercentage}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cardiovascular Test Report
                  </label>
                  <textarea
                    name="cardiovascularTestReport"
                    value={formData.cardiovascularTestReport}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Muscle Strength Report
                  </label>
                  <textarea
                    name="muscleStrengthReport"
                    value={formData.muscleStrengthReport}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Muscle Endurance
                  </label>
                  <input
                    type="number"
                    name="muscleEndurance"
                    value={formData.muscleEndurance}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Core Strength
                  </label>
                  <input
                    type="number"
                    name="coreStrength"
                    value={formData.coreStrength}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Flexibility
                  </label>
                  <input
                    type="number"
                    name="flexibility"
                    value={formData.flexibility}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 -mx-8 -mb-8 shadow-lg flex justify-between items-center">
            <div className="flex space-x-3">
              {/* <button
                type="button"
                onClick={() => {
                  navigate('/clients?action=add-bill')
                  onClose()
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
              >
                Add Member & Bill
              </button> */}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault()
                  handleSubmit(e)
                }}
                disabled={createMemberMutation.isLoading}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
              >
                {createMemberMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Member</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  const cameraModalContent = showCamera ? (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center" 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera()
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 relative" 
        style={{ zIndex: 10003, pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Capture Member Photo</h3>
            <p className="text-xs text-gray-500">Grant camera permissions to click a quick photo from this device.</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); stopCamera(); }}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-200 rounded z-10"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera Preview Area */}
        <div className="bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr] items-start">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '320px' }}>
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured preview"
                  className="w-full h-full object-cover"
                />
              ) : cameraError ? (
                <div className="flex items-center justify-center h-full text-center px-6">
                  <p className="text-sm text-gray-200">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(console.error)
                    }
                  }}
                  onCanPlay={() => {
                    setCameraLoading(false)
                  }}
                />
              )}
              {cameraLoading && !capturedImage && !cameraError && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <p className="text-white text-sm">Requesting camera access…</p>
                </div>
              )}
              {!capturedImage && !cameraError && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                  className="absolute top-3 right-3 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-md transition-all z-10"
                  title="Switch Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600 bg-gray-50">
                <p className="font-semibold text-gray-900 mb-1">Tips</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Ensure good lighting for sharper images.</li>
                  <li>Frame the member's shoulders and head.</li>
                  <li>Use the switch button for front/back cameras.</li>
                </ul>
              </div>

              {!capturedImage && !cameraError ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                  disabled={cameraLoading || !videoRef.current || (videoRef.current && (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0))}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cameraLoading ? 'Loading Camera...' : 'Capture Photo'}
                </button>
              ) : capturedImage ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCapturedImage(null); }}
                    className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); confirmCapturedPhoto(); }}
                    className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Use This Photo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openCameraModal(facingMode); }}
                    className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                    className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {createPortal(modalContent, document.body)}
      {cameraModalContent && createPortal(cameraModalContent, document.body)}
    </>
  )
}

