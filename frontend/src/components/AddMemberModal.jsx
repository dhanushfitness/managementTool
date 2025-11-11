import { useState, useRef, useEffect } from 'react'
import { X, Calendar, Upload, Camera, User } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function AddMemberModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('personal')
  const [showCamera, setShowCamera] = useState(false)
  const [facingMode, setFacingMode] = useState('user') // 'user' for front camera, 'environment' for back
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const navigate = useNavigate()
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
    clubId: '',
    gstNo: '',
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
        clubId: '',
        gstNo: '',
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
      toast.error(error.response?.data?.message || 'Failed to create member')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
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
      clubId: formData.clubId,
      gstNo: formData.gstNo,
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

  // Start camera stream
  const startCamera = async (mode = facingMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setShowCamera(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('Unable to access camera. Please check permissions.')
    }
  }

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setFormData(prev => ({
        ...prev,
        profilePicture: imageData
      }))
      
      stopCamera()
      toast.success('Photo captured successfully!')
    }
  }

  // Switch camera (front/back)
  const switchCamera = async () => {
    stopCamera()
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    // Small delay to ensure stream is stopped before starting new one
    setTimeout(() => {
      startCamera(newMode)
    }, 100)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Cleanup camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
    }
  }, [isOpen])

  const handleAction = (action) => {
    if (action === 'add-member-bill') {
      // Navigate to add member with billing
      navigate('/clients?action=add-bill')
    } else if (action === 'add-advance-payment') {
      navigate('/payments?action=advance')
    } else if (action === 'sell-product') {
      navigate('/products?action=sell')
    } else if (action === 'estimate') {
      navigate('/estimates?action=create')
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Slide-in Form */}
      <div className={`fixed right-0 top-0 h-full w-3/4 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto ${!isOpen ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new member</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all relative ${
                activeTab === 'personal'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Information
              {activeTab === 'personal' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('fitness')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all relative ${
                activeTab === 'fitness'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fitness Profile
              {activeTab === 'fitness' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
              )}
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
                <div className="grid grid-cols-2 gap-8">
                  {/* Profile Picture Section */}
                  <div className="space-y-4">
                    <div className="w-36 h-36 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-inner border-2 border-gray-200">
                      {formData.profilePicture ? (
                        <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-20 h-20 text-gray-400" />
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <label className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                      >
                        <Camera className="w-4 h-4 inline mr-2" />
                        Capture
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-5">
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
                      <div className="relative">
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      </div>
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

              {/* IDs */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  IDs
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Club ID
                    </label>
                    <input
                      type="text"
                      name="clubId"
                      value={formData.clubId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      GST No
                    </label>
                    <input
                      type="text"
                      name="gstNo"
                      value={formData.gstNo}
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
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleAction('add-member-bill')}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-sm"
              >
                Add Member & Bill
              </button>
              <button
                type="button"
                onClick={() => handleAction('add-advance-payment')}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-sm"
              >
                Add Advance Payment
              </button>
              <button
                type="button"
                onClick={() => handleAction('sell-product')}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-sm"
              >
                Sell Product
              </button>
              <button
                type="button"
                onClick={() => handleAction('estimate')}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-sm"
              >
                Estimate
              </button>
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

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Title Bar */}
            <div className="bg-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Web Camera</h3>
              <button
                onClick={stopCamera}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Camera Preview Area */}
            <div className="bg-white p-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Switch Camera Button - Floating in top right of preview */}
                <button
                  type="button"
                  onClick={switchCamera}
                  className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-md transition-all"
                  title="Switch Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Capture Image Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-8 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                >
                  Capture Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

